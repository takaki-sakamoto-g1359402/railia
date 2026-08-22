import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

// EXPERIMENTAL V001: retained for reproducibility of the rejected workbench
// cutouts. See logs/NEUTRAL_BASE_QA.md before using or modifying this tool.
const minimumBackgroundDominance = 0.5;
const borderFraction = 0.04;
const transparentAlphaFloor = 0.06;
const nearlyOpaqueAlpha = 0.995;
const minimumVisibleAlpha = 16;
const minimumConnectedComponentPixels = 64;

function parseArguments(argv) {
  const values = new Map();
  for (const argument of argv) {
    if (!argument.startsWith("--") || !argument.includes("=")) {
      throw new Error(
        `Unexpected argument ${JSON.stringify(argument)}. Use --input=<png> --output=<png>.`,
      );
    }
    const separator = argument.indexOf("=");
    values.set(argument.slice(2, separator), argument.slice(separator + 1));
  }

  const input = values.get("input");
  const output = values.get("output");
  if (!input || !output) {
    throw new Error("Both --input=<png> and --output=<png> are required.");
  }
  return {
    input: path.resolve(input),
    output: path.resolve(output),
    force: values.get("force") === "true",
  };
}

function median(values) {
  if (values.length === 0) throw new Error("Cannot calculate an empty median.");
  values.sort((left, right) => left - right);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[middle - 1] + values[middle]) / 2
    : values[middle];
}

function greenDominance(red, green, blue) {
  if (green === 0) return 0;
  return Math.max(0, green - Math.max(red, blue)) / green;
}

function estimateMatte(png) {
  const borderX = Math.max(1, Math.ceil(png.width * borderFraction));
  const borderY = Math.max(1, Math.ceil(png.height * borderFraction));
  const reds = [];
  const greens = [];
  const blues = [];
  const dominances = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const onBorder =
        x < borderX ||
        x >= png.width - borderX ||
        y < borderY ||
        y >= png.height - borderY;
      if (!onBorder) continue;

      const offset = (y * png.width + x) * 4;
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const dominance = greenDominance(red, green, blue);
      if (dominance < minimumBackgroundDominance) continue;

      reds.push(red);
      greens.push(green);
      blues.push(blue);
      dominances.push(dominance);
    }
  }

  if (dominances.length < Math.max(256, (png.width + png.height) * 2)) {
    throw new Error(
      "The image border does not contain enough green-screen pixels to estimate a safe matte.",
    );
  }

  return {
    red: median(reds),
    green: median(greens),
    blue: median(blues),
    dominance: median(dominances),
    samples: dominances.length,
  };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function clearPixel(data, pixelIndex) {
  const offset = pixelIndex * 4;
  data[offset] = 0;
  data[offset + 1] = 0;
  data[offset + 2] = 0;
  data[offset + 3] = 0;
}

function cleanupArtifacts(output) {
  const pixelCount = output.width * output.height;
  const cleanup = {
    removedLowAlphaPixels: 0,
    removedPartialMagentaPixels: 0,
    removedSmallComponentPixels: 0,
    removedSmallComponents: 0,
  };

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const red = output.data[offset];
    const green = output.data[offset + 1];
    const blue = output.data[offset + 2];
    const alpha = output.data[offset + 3];
    if (alpha === 0) continue;

    if (alpha < minimumVisibleAlpha) {
      clearPixel(output.data, pixelIndex);
      cleanup.removedLowAlphaPixels += 1;
      continue;
    }

    const isPartialMagentaFringe =
      alpha < 255 &&
      red > green + 25 &&
      blue > green + 25 &&
      Math.min(red, blue) > 60;
    if (isPartialMagentaFringe) {
      clearPixel(output.data, pixelIndex);
      cleanup.removedPartialMagentaPixels += 1;
    }
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const neighborOffsets = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] === 1 || output.data[start * 4 + 3] === 0) continue;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    visited[start] = 1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % output.width;
      const y = Math.floor(current / output.width);
      for (const [deltaX, deltaY] of neighborOffsets) {
        const nextX = x + deltaX;
        const nextY = y + deltaY;
        if (
          nextX < 0 ||
          nextX >= output.width ||
          nextY < 0 ||
          nextY >= output.height
        ) {
          continue;
        }
        const next = nextY * output.width + nextX;
        if (visited[next] === 1 || output.data[next * 4 + 3] === 0) continue;
        visited[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }

    if (tail >= minimumConnectedComponentPixels) continue;
    cleanup.removedSmallComponents += 1;
    cleanup.removedSmallComponentPixels += tail;
    for (let index = 0; index < tail; index += 1) {
      clearPixel(output.data, queue[index]);
    }
  }

  return cleanup;
}

function measureAlpha(output) {
  const stats = {
    transparentPixels: 0,
    partialAlphaPixels: 0,
    opaquePixels: 0,
    visibleBounds: {
      left: output.width,
      top: output.height,
      right: -1,
      bottom: -1,
    },
  };

  for (let y = 0; y < output.height; y += 1) {
    for (let x = 0; x < output.width; x += 1) {
      const alpha = output.data[(y * output.width + x) * 4 + 3];
      if (alpha === 0) {
        stats.transparentPixels += 1;
        continue;
      }
      if (alpha === 255) stats.opaquePixels += 1;
      else stats.partialAlphaPixels += 1;
      stats.visibleBounds.left = Math.min(stats.visibleBounds.left, x);
      stats.visibleBounds.top = Math.min(stats.visibleBounds.top, y);
      stats.visibleBounds.right = Math.max(stats.visibleBounds.right, x);
      stats.visibleBounds.bottom = Math.max(stats.visibleBounds.bottom, y);
    }
  }
  return stats;
}

function convert(png, matte) {
  const output = new PNG({ width: png.width, height: png.height, colorType: 6 });

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const dominance = greenDominance(red, green, blue);

      let alpha = 1 - dominance / matte.dominance;
      alpha = Math.max(0, Math.min(1, alpha));
      alpha = Math.max(
        0,
        Math.min(1, (alpha - transparentAlphaFloor) / (1 - transparentAlphaFloor)),
      );
      if (alpha >= nearlyOpaqueAlpha) alpha = 1;

      if (alpha === 0) {
        output.data[offset] = 0;
        output.data[offset + 1] = 0;
        output.data[offset + 2] = 0;
        output.data[offset + 3] = 0;
        continue;
      }

      let recoveredRed = red;
      let recoveredGreen = green;
      let recoveredBlue = blue;
      if (alpha < 1) {
        recoveredRed = (red - (1 - alpha) * matte.red) / alpha;
        recoveredGreen = (green - (1 - alpha) * matte.green) / alpha;
        recoveredBlue = (blue - (1 - alpha) * matte.blue) / alpha;

        // The supplied art uses blue, gold, white and navy but no green. Clamp
        // residual chroma spill while preserving neutral white/grey edges.
        recoveredGreen = Math.min(
          recoveredGreen,
          Math.max(recoveredRed, recoveredBlue) + 4,
        );
      }

      output.data[offset] = clampByte(recoveredRed);
      output.data[offset + 1] = clampByte(recoveredGreen);
      output.data[offset + 2] = clampByte(recoveredBlue);
      output.data[offset + 3] = clampByte(alpha * 255);
    }
  }

  const cleanup = cleanupArtifacts(output);
  const stats = measureAlpha(output);
  if (stats.transparentPixels === 0 || stats.opaquePixels === 0) {
    throw new Error(
      "Converted PNG failed alpha QA: both fully transparent and fully opaque pixels are required.",
    );
  }
  return { output, stats, cleanup };
}

const options = parseArguments(process.argv.slice(2));
if (options.input === options.output) {
  throw new Error("Input and output paths must differ; source images are never overwritten.");
}
if (!options.force) {
  try {
    await access(options.output);
    throw new Error(
      `Refusing to overwrite ${options.output}. Pass --force=true only after inspecting the existing file.`,
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const inputBytes = await readFile(options.input);
const input = PNG.sync.read(inputBytes, { skipRescale: true });
if (input.depth !== 8) {
  throw new Error(`Expected an 8-bit PNG, got ${input.depth}-bit.`);
}
const matte = estimateMatte(input);
const { output, stats, cleanup } = convert(input, matte);
const outputBytes = PNG.sync.write(output, { colorType: 6 });
await mkdir(path.dirname(options.output), { recursive: true });
await writeFile(options.output, outputBytes, { flag: options.force ? "w" : "wx" });

console.log(
  JSON.stringify(
    {
      status: "EXPERIMENTAL_ALPHA_CANDIDATE_NOT_PRODUCTION_APPROVED",
      input: options.input,
      output: options.output,
      width: input.width,
      height: input.height,
      matte,
      cleanup,
      stats,
      sha256: {
        input: sha256(inputBytes),
        output: sha256(outputBytes),
      },
    },
    null,
    2,
  ),
);
