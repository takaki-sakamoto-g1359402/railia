import { createHash } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

const algorithm = "TRIMAP_LOCAL_FOREGROUND_V002";
const maximumInputBytes = 256 * 1024 * 1024;
const maximumPixels = 50_000_000;
const borderFraction = 0.04;
const quantizationSize = 8;
const matteModeRadius = 24;
const minimumMatteGreenExcess = 96;
const maximumMatteP99Distance = 12;
const minimumBorderSampleFraction = 0.3;
const minimumBorderSamples = 1024;
const minimumBackgroundThreshold = 6;
const maximumBackgroundThreshold = 12;
const backgroundScreenScore = 0.85;
const foregroundCoreDistance = 3;
const foregroundCoreMatteDistanceMultiplier = 3;
const foregroundCoreMaximumScreenScore = 0.5;
const localSearchRadius = 12;
const maximumLocalCandidates = 64;
const poorFitResidual = 0.08;
const maximumP95Residual = 0.03;
const maximumP99Residual = 0.08;
const lowAlphaColorExtension = 0.05;
const autoSpaceSamples = 4096;
const spatialFitPenalty = 0.00025;

const linearLut = new Float64Array(256);
for (let value = 0; value < 256; value += 1) {
  const normalized = value / 255;
  linearLut[value] =
    normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
}

function parseArguments(argv) {
  const allowed = new Set([
    "input",
    "output",
    "force",
    "composite-space",
    "allow-qa-failure",
  ]);
  const values = new Map();
  for (const argument of argv) {
    if (argument === "--") continue;
    if (!argument.startsWith("--") || !argument.includes("=")) {
      throw new Error(
        `Unexpected argument ${JSON.stringify(argument)}. Use --input=<png> --output=<png>.`,
      );
    }
    const separator = argument.indexOf("=");
    const key = argument.slice(2, separator);
    if (!allowed.has(key)) throw new Error(`Unknown option --${key}.`);
    if (values.has(key)) throw new Error(`Duplicate option --${key}.`);
    values.set(key, argument.slice(separator + 1));
  }

  const input = values.get("input");
  const output = values.get("output");
  if (!input || !output) {
    throw new Error("Both --input=<png> and --output=<png> are required.");
  }
  const compositeSpace = values.get("composite-space") ?? "auto";
  if (!new Set(["auto", "linear", "srgb"]).has(compositeSpace)) {
    throw new Error(
      `Invalid --composite-space=${JSON.stringify(compositeSpace)}; expected auto, linear, or srgb.`,
    );
  }
  return {
    input: path.resolve(input),
    output: path.resolve(output),
    force: values.get("force") === "true",
    allowQaFailure: values.get("allow-qa-failure") === "true",
    compositeSpace,
  };
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function median(values) {
  if (values.length === 0) throw new Error("Cannot calculate an empty median.");
  values.sort((left, right) => left - right);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[middle - 1] + values[middle]) / 2
    : values[middle];
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  values.sort((left, right) => left - right);
  const index = Math.min(
    values.length - 1,
    Math.max(0, Math.ceil(fraction * values.length) - 1),
  );
  return values[index];
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function colorDistance(red, green, blue, matte) {
  return Math.hypot(red - matte.red, green - matte.green, blue - matte.blue);
}

function greenExcess(red, green, blue) {
  return green - Math.max(red, blue);
}

function enumerateBorderIndices(width, height) {
  const borderX = Math.max(1, Math.ceil(width * borderFraction));
  const borderY = Math.max(1, Math.ceil(height * borderFraction));
  const indices = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (
        x < borderX ||
        x >= width - borderX ||
        y < borderY ||
        y >= height - borderY
      ) {
        indices.push(y * width + x);
      }
    }
  }
  return indices;
}

function estimateMatte(png) {
  const borderIndices = enumerateBorderIndices(png.width, png.height);
  const bins = new Map();
  const greenBorder = [];
  for (const pixelIndex of borderIndices) {
    const offset = pixelIndex * 4;
    const red = png.data[offset];
    const green = png.data[offset + 1];
    const blue = png.data[offset + 2];
    if (greenExcess(red, green, blue) < minimumMatteGreenExcess) continue;
    const key = `${Math.floor(red / quantizationSize)},${Math.floor(
      green / quantizationSize,
    )},${Math.floor(blue / quantizationSize)}`;
    const bin = bins.get(key) ?? [];
    bin.push(pixelIndex);
    bins.set(key, bin);
    greenBorder.push(pixelIndex);
  }
  if (bins.size === 0) {
    throw new Error("No dominant green-screen mode was found on the image border.");
  }

  let mode = [];
  for (const bin of bins.values()) {
    if (bin.length > mode.length) mode = bin;
  }
  const modeReds = [];
  const modeGreens = [];
  const modeBlues = [];
  for (const pixelIndex of mode) {
    const offset = pixelIndex * 4;
    modeReds.push(png.data[offset]);
    modeGreens.push(png.data[offset + 1]);
    modeBlues.push(png.data[offset + 2]);
  }
  const modeColor = {
    red: median(modeReds),
    green: median(modeGreens),
    blue: median(modeBlues),
  };
  const inliers = greenBorder.filter((pixelIndex) => {
    const offset = pixelIndex * 4;
    return (
      colorDistance(
        png.data[offset],
        png.data[offset + 1],
        png.data[offset + 2],
        modeColor,
      ) <= matteModeRadius
    );
  });
  const requiredSamples = Math.max(
    minimumBorderSamples,
    Math.ceil(borderIndices.length * minimumBorderSampleFraction),
  );
  if (inliers.length < requiredSamples) {
    throw new Error(
      `Only ${inliers.length} stable matte samples were found; at least ${requiredSamples} are required.`,
    );
  }

  const reds = [];
  const greens = [];
  const blues = [];
  for (const pixelIndex of inliers) {
    const offset = pixelIndex * 4;
    reds.push(png.data[offset]);
    greens.push(png.data[offset + 1]);
    blues.push(png.data[offset + 2]);
  }
  const matte = {
    red: median(reds),
    green: median(greens),
    blue: median(blues),
  };
  const distances = inliers.map((pixelIndex) => {
    const offset = pixelIndex * 4;
    return colorDistance(
      png.data[offset],
      png.data[offset + 1],
      png.data[offset + 2],
      matte,
    );
  });
  const p99Distance = percentile(distances, 0.99);
  const matteGreenExcess = greenExcess(matte.red, matte.green, matte.blue);
  if (matteGreenExcess < minimumMatteGreenExcess) {
    throw new Error(
      `Matte green excess ${matteGreenExcess.toFixed(2)} is below ${minimumMatteGreenExcess}.`,
    );
  }
  if (p99Distance > maximumMatteP99Distance) {
    throw new Error(
      `Border matte p99 distance ${p99Distance.toFixed(2)} exceeds ${maximumMatteP99Distance}; use a flatter screen.`,
    );
  }
  return {
    ...matte,
    greenExcess: matteGreenExcess,
    p99Distance,
    backgroundThreshold: clamp(
      p99Distance * 2,
      minimumBackgroundThreshold,
      maximumBackgroundThreshold,
    ),
    borderPixels: borderIndices.length,
    samples: inliers.length,
    modeSamples: mode.length,
  };
}

function analyzePixels(png, matte) {
  const pixelCount = png.width * png.height;
  const matteDistances = new Float32Array(pixelCount);
  const screenScores = new Float32Array(pixelCount);
  const backgroundCandidates = new Uint8Array(pixelCount);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const red = png.data[offset];
    const green = png.data[offset + 1];
    const blue = png.data[offset + 2];
    const distance = colorDistance(red, green, blue, matte);
    const score = greenExcess(red, green, blue) / matte.greenExcess;
    matteDistances[pixelIndex] = distance;
    screenScores[pixelIndex] = score;
    backgroundCandidates[pixelIndex] =
      distance <= matte.backgroundThreshold && score >= backgroundScreenScore
        ? 1
        : 0;
  }
  return { matteDistances, screenScores, backgroundCandidates };
}

function forEachFourNeighbor(pixelIndex, width, height, callback) {
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  if (x > 0) callback(pixelIndex - 1);
  if (x + 1 < width) callback(pixelIndex + 1);
  if (y > 0) callback(pixelIndex - width);
  if (y + 1 < height) callback(pixelIndex + width);
}

function forEachEightNeighbor(pixelIndex, width, height, callback) {
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
    for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
      if (deltaX === 0 && deltaY === 0) continue;
      const nextX = x + deltaX;
      const nextY = y + deltaY;
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
      callback(nextY * width + nextX);
    }
  }
}

function floodBackground(width, height, candidates) {
  const pixelCount = width * height;
  const background = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const seed = (pixelIndex) => {
    if (candidates[pixelIndex] === 0 || background[pixelIndex] === 1) return;
    background[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 1; y + 1 < height; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (head < tail) {
    const current = queue[head];
    head += 1;
    forEachFourNeighbor(current, width, height, seed);
  }
  return { background, backgroundPixels: tail };
}

function distanceFromBackground(width, height, background) {
  const pixelCount = width * height;
  const distances = new Uint16Array(pixelCount);
  distances.fill(0xffff);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (background[pixelIndex] === 0) continue;
    distances[pixelIndex] = 0;
    queue[tail] = pixelIndex;
    tail += 1;
  }
  while (head < tail) {
    const current = queue[head];
    head += 1;
    const nextDistance = distances[current] + 1;
    forEachFourNeighbor(current, width, height, (next) => {
      if (nextDistance >= distances[next]) return;
      distances[next] = nextDistance;
      queue[tail] = next;
      tail += 1;
    });
  }
  return distances;
}

function buildForegroundCore(
  background,
  distances,
  matteDistances,
  screenScores,
  matte,
) {
  const core = new Uint8Array(background.length);
  let corePixels = 0;
  for (let pixelIndex = 0; pixelIndex < background.length; pixelIndex += 1) {
    if (
      background[pixelIndex] === 0 &&
      distances[pixelIndex] >= foregroundCoreDistance &&
      matteDistances[pixelIndex] >=
        matte.backgroundThreshold * foregroundCoreMatteDistanceMultiplier &&
      screenScores[pixelIndex] <= foregroundCoreMaximumScreenScore
    ) {
      core[pixelIndex] = 1;
      corePixels += 1;
    }
  }
  return { core, corePixels };
}

function labelComponents(
  width,
  height,
  background,
  core,
  matteDistances,
  screenScores,
  matte,
) {
  const pixelCount = width * height;
  const componentIds = new Int32Array(pixelCount);
  componentIds.fill(-1);
  const queue = new Int32Array(pixelCount);
  const components = [];

  for (let start = 0; start < pixelCount; start += 1) {
    if (background[start] === 1 || componentIds[start] !== -1) continue;
    const id = components.length;
    let head = 0;
    let tail = 1;
    let hasCore = false;
    let corePixels = 0;
    let anchor = start;
    let anchorScore = Number.NEGATIVE_INFINITY;
    let lowConfidenceBackgroundSpeck = true;
    const bounds = {
      left: start % width,
      top: Math.floor(start / width),
      right: start % width,
      bottom: Math.floor(start / width),
    };
    queue[0] = start;
    componentIds[start] = id;
    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      bounds.left = Math.min(bounds.left, x);
      bounds.top = Math.min(bounds.top, y);
      bounds.right = Math.max(bounds.right, x);
      bounds.bottom = Math.max(bounds.bottom, y);
      if (core[current] === 1) {
        hasCore = true;
        corePixels += 1;
      }
      const score =
        matteDistances[current] * (1 - clamp(screenScores[current], 0, 1));
      if (score > anchorScore) {
        anchorScore = score;
        anchor = current;
      }
      if (
        !(
          matteDistances[current] < matte.backgroundThreshold * 1.5 &&
          screenScores[current] > 0.75
        )
      ) {
        lowConfidenceBackgroundSpeck = false;
      }
      forEachEightNeighbor(current, width, height, (next) => {
        if (background[next] === 1 || componentIds[next] !== -1) return;
        componentIds[next] = id;
        queue[tail] = next;
        tail += 1;
      });
    }
    components.push({
      id,
      size: tail,
      bounds,
      hasCore,
      corePixels,
      anchor,
      maxAlpha: 0,
      warnings: [
        ...(hasCore ? [] : ["NO_OPAQUE_CORE"]),
        ...(lowConfidenceBackgroundSpeck
          ? ["LOW_CONFIDENCE_BACKGROUND_SPECK"]
          : []),
      ],
    });
  }
  return { componentIds, components };
}

function propagateNearestSeeds(width, height, background, core, components) {
  const pixelCount = width * height;
  const nearestSeed = new Int32Array(pixelCount);
  nearestSeed.fill(-1);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (core[pixelIndex] === 0) continue;
    nearestSeed[pixelIndex] = pixelIndex;
    queue[tail] = pixelIndex;
    tail += 1;
  }
  for (const component of components) {
    if (component.hasCore) continue;
    nearestSeed[component.anchor] = component.anchor;
    queue[tail] = component.anchor;
    tail += 1;
  }
  while (head < tail) {
    const current = queue[head];
    head += 1;
    forEachEightNeighbor(current, width, height, (next) => {
      if (background[next] === 1 || nearestSeed[next] !== -1) return;
      nearestSeed[next] = nearestSeed[current];
      queue[tail] = next;
      tail += 1;
    });
  }
  return nearestSeed;
}

function channel(byte, space) {
  return space === "linear" ? linearLut[byte] : byte / 255;
}

function byteFromChannel(value, space) {
  const normalized = clamp(value);
  if (space === "srgb") return clampByte(normalized * 255);
  const encoded =
    normalized <= 0.0031308
      ? 12.92 * normalized
      : 1.055 * normalized ** (1 / 2.4) - 0.055;
  return clampByte(encoded * 255);
}

function pixelColor(png, pixelIndex, space) {
  const offset = pixelIndex * 4;
  return [
    channel(png.data[offset], space),
    channel(png.data[offset + 1], space),
    channel(png.data[offset + 2], space),
  ];
}

function matteColor(matte, space) {
  return [
    channel(matte.red, space),
    channel(matte.green, space),
    channel(matte.blue, space),
  ];
}

function evaluateCandidate(png, pixelIndex, candidateIndex, matteVector, space) {
  const current = pixelColor(png, pixelIndex, space);
  const foreground = pixelColor(png, candidateIndex, space);
  const direction = [
    foreground[0] - matteVector[0],
    foreground[1] - matteVector[1],
    foreground[2] - matteVector[2],
  ];
  const observed = [
    current[0] - matteVector[0],
    current[1] - matteVector[1],
    current[2] - matteVector[2],
  ];
  const denominator =
    direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2;
  if (denominator < 1e-8) return null;
  const alpha = clamp(
    (observed[0] * direction[0] +
      observed[1] * direction[1] +
      observed[2] * direction[2]) /
      denominator,
  );
  const residual = Math.sqrt(
    ((observed[0] - alpha * direction[0]) ** 2 +
      (observed[1] - alpha * direction[1]) ** 2 +
      (observed[2] - alpha * direction[2]) ** 2) /
      3,
  );
  const x = pixelIndex % png.width;
  const y = Math.floor(pixelIndex / png.width);
  const candidateX = candidateIndex % png.width;
  const candidateY = Math.floor(candidateIndex / png.width);
  return {
    candidateIndex,
    alpha,
    residual,
    score:
      residual +
      Math.hypot(x - candidateX, y - candidateY) * spatialFitPenalty,
  };
}

function findBestFit(
  png,
  pixelIndex,
  componentId,
  componentIds,
  core,
  nearestSeed,
  matteVector,
  space,
) {
  let best = null;
  const seen = new Set();
  const consider = (candidateIndex) => {
    if (candidateIndex < 0 || seen.has(candidateIndex)) return;
    seen.add(candidateIndex);
    const fit = evaluateCandidate(
      png,
      pixelIndex,
      candidateIndex,
      matteVector,
      space,
    );
    if (fit !== null && (best === null || fit.score < best.score)) best = fit;
  };
  consider(nearestSeed[pixelIndex]);

  const centerX = pixelIndex % png.width;
  const centerY = Math.floor(pixelIndex / png.width);
  let candidates = 0;
  for (
    let radius = 1;
    radius <= localSearchRadius && candidates < maximumLocalCandidates;
    radius += 1
  ) {
    const visit = (x, y) => {
      if (
        candidates >= maximumLocalCandidates ||
        x < 0 ||
        x >= png.width ||
        y < 0 ||
        y >= png.height
      ) {
        return;
      }
      const candidateIndex = y * png.width + x;
      if (
        componentIds[candidateIndex] === componentId &&
        core[candidateIndex] === 1
      ) {
        consider(candidateIndex);
        candidates += 1;
      }
    };
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      visit(x, centerY - radius);
      visit(x, centerY + radius);
    }
    for (let y = centerY - radius + 1; y < centerY + radius; y += 1) {
      visit(centerX - radius, y);
      visit(centerX + radius, y);
    }
  }
  return best;
}

function chooseCompositeSpace(
  requested,
  png,
  background,
  core,
  componentIds,
  components,
  nearestSeed,
  matte,
) {
  if (requested !== "auto") {
    return {
      requested,
      selected: requested,
      sampleCount: 0,
      medianResidual: null,
    };
  }
  let unknownCount = 0;
  for (let index = 0; index < background.length; index += 1) {
    if (background[index] === 0 && core[index] === 0) unknownCount += 1;
  }
  const step = Math.max(1, Math.floor(unknownCount / autoSpaceSamples));
  const residuals = { linear: [], srgb: [] };
  let unknownSeen = 0;
  for (let index = 0; index < background.length; index += 1) {
    if (background[index] === 1 || core[index] === 1) continue;
    const component = components[componentIds[index]];
    if (!component?.hasCore) continue;
    if (unknownSeen % step === 0) {
      for (const space of ["linear", "srgb"]) {
        const fit = findBestFit(
          png,
          index,
          component.id,
          componentIds,
          core,
          nearestSeed,
          matteColor(matte, space),
          space,
        );
        if (fit !== null) residuals[space].push(fit.residual);
      }
    }
    unknownSeen += 1;
    if (residuals.linear.length >= autoSpaceSamples) break;
  }
  if (residuals.linear.length === 0 || residuals.srgb.length === 0) {
    throw new Error("No fitted unknown pixels were available for composite-space selection.");
  }
  const linearMedian = median(residuals.linear);
  const srgbMedian = median(residuals.srgb);
  return {
    requested,
    selected: linearMedian <= srgbMedian ? "linear" : "srgb",
    sampleCount: residuals.linear.length,
    medianResidual: { linear: linearMedian, srgb: srgbMedian },
  };
}

function absoluteGreenAlpha(png, pixelIndex, matte, space) {
  const color = pixelColor(png, pixelIndex, space);
  const matteVector = matteColor(matte, space);
  const excess = Math.max(0, color[1] - Math.max(color[0], color[2]));
  const matteExcess = Math.max(
    1e-8,
    matteVector[1] - Math.max(matteVector[0], matteVector[2]),
  );
  return 1 - clamp(excess / matteExcess);
}

function smoothstep(edge0, edge1, value) {
  const normalized = clamp((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
}

function renderOutput(
  png,
  background,
  core,
  componentIds,
  components,
  nearestSeed,
  matte,
  space,
) {
  const output = new PNG({ width: png.width, height: png.height, colorType: 6 });
  const matteVector = matteColor(matte, space);
  let fallbackPixels = 0;
  let partialPixels = 0;
  let opaquePixels = 0;
  let transparentPixels = 0;

  for (let pixelIndex = 0; pixelIndex < background.length; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    if (background[pixelIndex] === 1) {
      output.data[offset] = 0;
      output.data[offset + 1] = 0;
      output.data[offset + 2] = 0;
      output.data[offset + 3] = 0;
      transparentPixels += 1;
      continue;
    }
    const component = components[componentIds[pixelIndex]];
    if (core[pixelIndex] === 1) {
      output.data[offset] = png.data[offset];
      output.data[offset + 1] = png.data[offset + 1];
      output.data[offset + 2] = png.data[offset + 2];
      output.data[offset + 3] = 255;
      component.maxAlpha = 255;
      opaquePixels += 1;
      continue;
    }

    const fit = component.hasCore
      ? findBestFit(
          png,
          pixelIndex,
          component.id,
          componentIds,
          core,
          nearestSeed,
          matteVector,
          space,
        )
      : null;
    const fallbackAlpha = absoluteGreenAlpha(png, pixelIndex, matte, space);
    let alpha;
    let seedIndex;
    if (fit === null) {
      alpha = fallbackAlpha;
      seedIndex = component.anchor;
      fallbackPixels += 1;
    } else {
      alpha =
        fit.residual <= poorFitResidual
          ? fit.alpha
          : Math.max(fit.alpha, fallbackAlpha);
      seedIndex = fit.candidateIndex;
      if (fit.residual > poorFitResidual) fallbackPixels += 1;
    }
    alpha = clamp(alpha);

    const current = pixelColor(png, pixelIndex, space);
    const seed = pixelColor(png, seedIndex, space);
    let foregroundColor = [...seed];
    if (alpha >= lowAlphaColorExtension) {
      const recovered = [
        clamp((current[0] - (1 - alpha) * matteVector[0]) / alpha),
        clamp((current[1] - (1 - alpha) * matteVector[1]) / alpha),
        clamp((current[2] - (1 - alpha) * matteVector[2]) / alpha),
      ];
      const confidence =
        fit === null ? 0 : clamp(1 - fit.residual / poorFitResidual);
      const blend = smoothstep(0.15, 0.65, alpha) * confidence;
      foregroundColor = [
        seed[0] * (1 - blend) + recovered[0] * blend,
        seed[1] * (1 - blend) + recovered[1] * blend,
        seed[2] * (1 - blend) + recovered[2] * blend,
      ];
    }
    const allowance = space === "linear" ? 0.01 : 4 / 255;
    const spill = Math.max(
      0,
      foregroundColor[1] -
        Math.max(foregroundColor[0], foregroundColor[2]) -
        allowance,
    );
    foregroundColor[1] -= spill;

    const alphaByte = clampByte(alpha * 255);
    output.data[offset] = byteFromChannel(foregroundColor[0], space);
    output.data[offset + 1] = byteFromChannel(foregroundColor[1], space);
    output.data[offset + 2] = byteFromChannel(foregroundColor[2], space);
    output.data[offset + 3] = alphaByte;
    component.maxAlpha = Math.max(component.maxAlpha, alphaByte);
    if (alphaByte === 0) transparentPixels += 1;
    else if (alphaByte === 255) opaquePixels += 1;
    else partialPixels += 1;
  }

  // Preserve every non-background component, including one-pixel detached art.
  for (const component of components) {
    if (component.maxAlpha > 0) continue;
    const offset = component.anchor * 4;
    output.data[offset] = png.data[offset];
    output.data[offset + 1] = png.data[offset + 1];
    output.data[offset + 2] = png.data[offset + 2];
    output.data[offset + 3] = 1;
    component.maxAlpha = 1;
    transparentPixels -= 1;
    partialPixels += 1;
  }
  return {
    output,
    fallbackPixels,
    alphaCounts: { transparentPixels, partialPixels, opaquePixels },
  };
}

function measureVisibleBounds(output) {
  const bounds = {
    left: output.width,
    top: output.height,
    right: -1,
    bottom: -1,
  };
  for (let y = 0; y < output.height; y += 1) {
    for (let x = 0; x < output.width; x += 1) {
      if (output.data[(y * output.width + x) * 4 + 3] === 0) continue;
      bounds.left = Math.min(bounds.left, x);
      bounds.top = Math.min(bounds.top, y);
      bounds.right = Math.max(bounds.right, x);
      bounds.bottom = Math.max(bounds.bottom, y);
    }
  }
  return bounds;
}

function validateOutput(
  input,
  output,
  matte,
  space,
  alphaCounts,
  components,
  fallbackPixels,
) {
  if (
    alphaCounts.transparentPixels === 0 ||
    alphaCounts.partialPixels === 0 ||
    alphaCounts.opaquePixels === 0
  ) {
    throw new Error(
      "Alpha QA requires non-empty transparent, partial-alpha, and opaque regions.",
    );
  }
  const matteVector = matteColor(matte, space);
  const recompositionResiduals = [];
  let edgeGreenViolations = 0;
  for (
    let pixelIndex = 0;
    pixelIndex < input.width * input.height;
    pixelIndex += 1
  ) {
    const offset = pixelIndex * 4;
    const alpha = output.data[offset + 3] / 255;
    if (alpha <= 0 || alpha >= 1) continue;
    const foregroundColor = pixelColor(output, pixelIndex, space);
    const observed = pixelColor(input, pixelIndex, space);
    const recomposed = [
      foregroundColor[0] * alpha + matteVector[0] * (1 - alpha),
      foregroundColor[1] * alpha + matteVector[1] * (1 - alpha),
      foregroundColor[2] * alpha + matteVector[2] * (1 - alpha),
    ];
    recompositionResiduals.push(
      Math.sqrt(
        ((observed[0] - recomposed[0]) ** 2 +
          (observed[1] - recomposed[1]) ** 2 +
          (observed[2] - recomposed[2]) ** 2) /
          3,
      ),
    );
    const allowance = space === "linear" ? 0.01 : 4 / 255;
    if (
      foregroundColor[1] >
      Math.max(foregroundColor[0], foregroundColor[2]) + allowance + 1e-6
    ) {
      edgeGreenViolations += 1;
    }
  }
  const p95Residual = percentile([...recompositionResiduals], 0.95);
  const p99Residual = percentile([...recompositionResiduals], 0.99);
  const failedComponents = components.filter((component) => component.maxAlpha === 0);
  const pass =
    failedComponents.length === 0 &&
    edgeGreenViolations === 0 &&
    p95Residual <= maximumP95Residual &&
    p99Residual <= maximumP99Residual;
  return {
    pass,
    p95Residual,
    p99Residual,
    maximumP95Residual,
    maximumP99Residual,
    recompositionSamples: recompositionResiduals.length,
    edgeGreenViolations,
    retainedComponents: components.length - failedComponents.length,
    totalComponents: components.length,
    fallbackPixels,
  };
}

async function inspectPaths(options) {
  if (options.input === options.output) {
    throw new Error("Input and output paths must differ.");
  }
  const inputReal = await realpath(options.input);
  const inputStat = await stat(inputReal);
  await mkdir(path.dirname(options.output), { recursive: true });
  const outputParentReal = await realpath(path.dirname(options.output));
  const outputResolved = path.join(outputParentReal, path.basename(options.output));
  if (inputReal === outputResolved) {
    throw new Error("Output resolves to the input file.");
  }
  try {
    const outputLstat = await lstat(options.output);
    if (outputLstat.isSymbolicLink()) {
      throw new Error("Refusing to write through an existing output symlink.");
    }
    const outputStat = await stat(options.output);
    if (outputStat.dev === inputStat.dev && outputStat.ino === inputStat.ino) {
      throw new Error("Output is a hard-link alias of the input file.");
    }
    if (!options.force) {
      throw new Error(
        `Refusing to overwrite ${options.output}. Pass --force=true only after inspection.`,
      );
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return { inputReal, outputResolved };
}

async function publishAtomically(outputPath, bytes, force) {
  const parent = path.dirname(outputPath);
  const temporary = path.join(
    parent,
    `.${path.basename(outputPath)}.${process.pid}.${Date.now()}.tmp`,
  );
  let temporaryExists = false;
  try {
    const handle = await open(temporary, "wx", 0o644);
    temporaryExists = true;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const decoded = PNG.sync.read(await readFile(temporary), { skipRescale: true });
    if (decoded.depth !== 8 || decoded.colorType !== 6) {
      throw new Error("Temporary output validation did not produce an 8-bit RGBA PNG.");
    }
    if (force) {
      await rename(temporary, outputPath);
      temporaryExists = false;
    } else {
      await link(temporary, outputPath);
      await unlink(temporary);
      temporaryExists = false;
    }
  } finally {
    if (temporaryExists) {
      try {
        await unlink(temporary);
      } catch {
        // Preserve the original failure. The unique temporary remains auditable.
      }
    }
  }
}

const options = parseArguments(process.argv.slice(2));
const paths = await inspectPaths(options);
const inputBytes = await readFile(paths.inputReal);
if (inputBytes.length > maximumInputBytes) {
  throw new Error(`Input exceeds the ${maximumInputBytes}-byte safety limit.`);
}
const input = PNG.sync.read(inputBytes, { skipRescale: true });
if (input.depth !== 8) throw new Error(`Expected an 8-bit PNG, got ${input.depth}-bit.`);
if (input.width * input.height > maximumPixels) {
  throw new Error(`Input exceeds the ${maximumPixels}-pixel safety limit.`);
}
for (let offset = 3; offset < input.data.length; offset += 4) {
  if (input.data[offset] !== 255) {
    throw new Error(
      "Green-screen input must be fully opaque; source alpha is never silently discarded.",
    );
  }
}

const matte = estimateMatte(input);
const analysis = analyzePixels(input, matte);
const flooded = floodBackground(
  input.width,
  input.height,
  analysis.backgroundCandidates,
);
const distances = distanceFromBackground(
  input.width,
  input.height,
  flooded.background,
);
const foreground = buildForegroundCore(
  flooded.background,
  distances,
  analysis.matteDistances,
  analysis.screenScores,
  matte,
);
const labeled = labelComponents(
  input.width,
  input.height,
  flooded.background,
  foreground.core,
  analysis.matteDistances,
  analysis.screenScores,
  matte,
);
const nearestSeed = propagateNearestSeeds(
  input.width,
  input.height,
  flooded.background,
  foreground.core,
  labeled.components,
);
const compositeSpace = chooseCompositeSpace(
  options.compositeSpace,
  input,
  flooded.background,
  foreground.core,
  labeled.componentIds,
  labeled.components,
  nearestSeed,
  matte,
);
const rendered = renderOutput(
  input,
  flooded.background,
  foreground.core,
  labeled.componentIds,
  labeled.components,
  nearestSeed,
  matte,
  compositeSpace.selected,
);
const qa = validateOutput(
  input,
  rendered.output,
  matte,
  compositeSpace.selected,
  rendered.alphaCounts,
  labeled.components,
  rendered.fallbackPixels,
);
if (!qa.pass && !options.allowQaFailure) {
  throw new Error(
    `Alpha QA failed (p95=${qa.p95Residual.toFixed(4)}, p99=${qa.p99Residual.toFixed(
      4,
    )}, greenViolations=${qa.edgeGreenViolations}). Re-run with --allow-qa-failure=true only to preserve a diagnostic workbench result.`,
  );
}

const outputBytes = PNG.sync.write(rendered.output, { colorType: 6 });
await publishAtomically(paths.outputResolved, outputBytes, options.force);
console.log(
  JSON.stringify(
    {
      status: qa.pass ? "ALPHA_QA_PASSED" : "ALPHA_QA_FAILED_DIAGNOSTIC_ONLY",
      algorithm,
      input: options.input,
      output: options.output,
      width: input.width,
      height: input.height,
      matte,
      trimap: {
        backgroundPixels: flooded.backgroundPixels,
        foregroundCorePixels: foreground.corePixels,
        unknownPixels:
          input.width * input.height -
          flooded.backgroundPixels -
          foreground.corePixels,
      },
      compositeSpace,
      alpha: {
        ...rendered.alphaCounts,
        visibleBounds: measureVisibleBounds(rendered.output),
      },
      components: labeled.components.map((component) => ({
        id: component.id,
        size: component.size,
        bounds: component.bounds,
        hasCore: component.hasCore,
        corePixels: component.corePixels,
        maxAlpha: component.maxAlpha,
        warnings: component.warnings,
      })),
      qa,
      sha256: {
        input: sha256(inputBytes),
        output: sha256(outputBytes),
      },
    },
    null,
    2,
  ),
);
