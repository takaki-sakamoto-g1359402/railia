import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeCanvas, readPsd, writePsdBuffer } from "ag-psd";
import { PNG } from "pngjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const projectRoot = path.resolve(scriptDirectory, "..");
const defaultConfigPath = path.join(
  projectRoot,
  "art",
  "live2d",
  "production-workbench",
  "riai-face",
  "config",
  "riai-face-atlas-v002.json",
);
const layerNamePattern = /^[a-z][a-z0-9_]*$/;
const algorithm = "RIAI_FACE_COMPONENT_PSD_V001";

// Raw image data avoids Canvas premultiplied-alpha corruption. ag-psd still
// asks for an ImageData constructor while reading 8-bit RGBA layers.
initializeCanvas(
  () => {
    throw new Error("Canvas rendering is disabled for the Riai face PSD pipeline.");
  },
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  }),
);

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isObject(value)) fail(`${label} must be an object.`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireInteger(value, label, minimum = Number.MIN_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < minimum) {
    fail(`${label} must be an integer >= ${minimum}.`);
  }
  return value;
}

function requireFiniteNumber(value, label, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum) {
    fail(`${label} must be a finite number >= ${minimum}.`);
  }
  return value;
}

function requireName(value, label) {
  const name = requireString(value, label);
  if (!layerNamePattern.test(name)) {
    fail(`${label} must match ${layerNamePattern}. Got "${name}".`);
  }
  return name;
}

function requireTuple(value, label, length) {
  if (!Array.isArray(value) || value.length !== length) {
    fail(`${label} must be an array with ${length} entries.`);
  }
  return value;
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label} contains duplicate value "${value}".`);
    seen.add(value);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveProjectPath(value) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(projectRoot, value);
}

function projectRelative(filePath) {
  const relative = path.relative(projectRoot, filePath);
  return relative.startsWith("..") ? filePath : relative;
}

function parseArguments(argv) {
  const values = {};
  const allowed = new Set([
    "mode",
    "config",
    "atlas",
    "material-output",
    "manifest-output",
    "import-output",
  ]);
  for (const argument of argv) {
    if (!argument.startsWith("--") || !argument.includes("=")) {
      fail(`Expected --key=value argument, got "${argument}".`);
    }
    const separator = argument.indexOf("=");
    const key = argument.slice(2, separator);
    const value = argument.slice(separator + 1);
    if (!allowed.has(key)) fail(`Unknown argument --${key}.`);
    if (value.length === 0) fail(`--${key} cannot be empty.`);
    values[key] = value;
  }
  const mode = values.mode ?? "material";
  if (!new Set(["material", "import", "both"]).has(mode)) {
    fail(`Unknown mode "${mode}". Expected material, import, or both.`);
  }
  return { ...values, mode };
}

function validateConfiguration(config) {
  requireObject(config, "config");
  if (config.schemaVersion !== 1) fail("config.schemaVersion must be 1.");
  const source = requireObject(config.source, "config.source");
  requireString(source.path, "config.source.path");
  if (source.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(source.sha256)) {
    fail("config.source.sha256 must be a lowercase SHA-256 string when present.");
  }

  const atlas = requireObject(config.atlas, "config.atlas");
  requireInteger(atlas.width, "config.atlas.width", 1);
  requireInteger(atlas.height, "config.atlas.height", 1);
  requireInteger(atlas.seedAlphaExclusive, "config.atlas.seedAlphaExclusive", 0);
  if (atlas.seedAlphaExclusive >= 255) {
    fail("config.atlas.seedAlphaExclusive must be below 255.");
  }
  requireInteger(atlas.minimumSeedArea, "config.atlas.minimumSeedArea", 1);
  requireInteger(atlas.expectedMainComponents, "config.atlas.expectedMainComponents", 1);
  if (atlas.connectivity !== 8) fail("Only 8-connected component labeling is supported.");
  if (atlas.requireEveryVisiblePixelAccounted !== true) {
    fail("config.atlas.requireEveryVisiblePixelAccounted must be true.");
  }
  const unmappedPolicy = requireObject(
    atlas.unmappedVisiblePolicy,
    "config.atlas.unmappedVisiblePolicy",
  );
  if (unmappedPolicy.mode !== "reject_audited_dust") {
    fail(
      "config.atlas.unmappedVisiblePolicy.mode must be reject_audited_dust.",
    );
  }
  requireInteger(
    unmappedPolicy.maximumComponents,
    "config.atlas.unmappedVisiblePolicy.maximumComponents",
    0,
  );
  requireInteger(
    unmappedPolicy.maximumAreaPerComponent,
    "config.atlas.unmappedVisiblePolicy.maximumAreaPerComponent",
    0,
  );
  requireInteger(
    unmappedPolicy.maximumTotalPixels,
    "config.atlas.unmappedVisiblePolicy.maximumTotalPixels",
    0,
  );
  if (!Array.isArray(unmappedPolicy.allowedRegions)) {
    fail("config.atlas.unmappedVisiblePolicy.allowedRegions must be an array.");
  }
  for (const [index, region] of unmappedPolicy.allowedRegions.entries()) {
    const values = requireTuple(
      region,
      `config.atlas.unmappedVisiblePolicy.allowedRegions[${index}]`,
      4,
    );
    values.forEach((value, regionIndex) =>
      requireInteger(
        value,
        `config.atlas.unmappedVisiblePolicy.allowedRegions[${index}][${regionIndex}]`,
        0,
      ),
    );
    if (
      values[0] >= values[2] ||
      values[1] >= values[3] ||
      values[2] > atlas.width ||
      values[3] > atlas.height
    ) {
      fail(`Unmapped visible allowed region ${index} is invalid.`);
    }
  }

  const qa = requireObject(config.qa, "config.qa");
  requireInteger(qa.greenDominanceMargin, "config.qa.greenDominanceMargin", 0);
  requireInteger(qa.greenCheckAlphaExclusive, "config.qa.greenCheckAlphaExclusive", 0);
  requireInteger(
    qa.maximumGreenDominantPixelsPerIncludedSourceSlot,
    "config.qa.maximumGreenDominantPixelsPerIncludedSourceSlot",
    0,
  );

  const material = requireObject(config.material, "config.material");
  requireName(material.rootGroup, "config.material.rootGroup");
  if (!Array.isArray(material.categories) || material.categories.length === 0) {
    fail("config.material.categories must be a non-empty array.");
  }
  for (const [index, category] of material.categories.entries()) {
    requireObject(category, `config.material.categories[${index}]`);
    requireName(category.id, `config.material.categories[${index}].id`);
    requireName(category.groupName, `config.material.categories[${index}].groupName`);
  }
  assertUnique(material.categories.map(({ id }) => id), "material category IDs");
  assertUnique(
    [material.rootGroup, ...material.categories.map(({ groupName }) => groupName)],
    "material root/category group names",
  );
  const categoryIds = new Set(material.categories.map(({ id }) => id));

  if (!Array.isArray(config.slots) || config.slots.length === 0) {
    fail("config.slots must be a non-empty array.");
  }
  for (const [index, slot] of config.slots.entries()) {
    requireObject(slot, `config.slots[${index}]`);
    requireName(slot.id, `config.slots[${index}].id`);
    requireName(slot.category, `config.slots[${index}].category`);
    if (!categoryIds.has(slot.category)) {
      fail(`Slot "${slot.id}" references unknown category "${slot.category}".`);
    }
    const roi = requireTuple(slot.roi, `config.slots[${index}].roi`, 4);
    roi.forEach((value, roiIndex) =>
      requireInteger(value, `config.slots[${index}].roi[${roiIndex}]`, 0),
    );
    if (roi[0] >= roi[2] || roi[1] >= roi[3]) {
      fail(`Slot "${slot.id}" has an empty ROI.`);
    }
    if (roi[2] > atlas.width || roi[3] > atlas.height) {
      fail(`Slot "${slot.id}" ROI exceeds the atlas canvas.`);
    }
    requireName(slot.materialName, `config.slots[${index}].materialName`);
    if (!new Set(["include", "reject"]).has(slot.sourcePolicy)) {
      fail(`Slot "${slot.id}" has invalid sourcePolicy "${slot.sourcePolicy}".`);
    }
    requireString(slot.productionIntegrity, `config.slots[${index}].productionIntegrity`);
    if (slot.sourcePolicy === "reject") {
      requireString(slot.rejectionReason, `config.slots[${index}].rejectionReason`);
    }
    if (slot.importName !== null && slot.importName !== undefined) {
      requireName(slot.importName, `config.slots[${index}].importName`);
    }
  }
  assertUnique(config.slots.map(({ id }) => id), "slot IDs");
  assertUnique(config.slots.map(({ materialName }) => materialName), "slot material names");

  if (!Array.isArray(config.proceduralLayers)) {
    fail("config.proceduralLayers must be an array.");
  }
  const slotIds = new Set(config.slots.map(({ id }) => id));
  for (const [index, layer] of config.proceduralLayers.entries()) {
    requireObject(layer, `config.proceduralLayers[${index}]`);
    requireName(layer.id, `config.proceduralLayers[${index}].id`);
    if (typeof layer.enabled !== "boolean") {
      fail(`config.proceduralLayers[${index}].enabled must be boolean.`);
    }
    requireName(layer.category, `config.proceduralLayers[${index}].category`);
    if (!categoryIds.has(layer.category)) {
      fail(`Procedural layer "${layer.id}" references unknown category.`);
    }
    requireName(layer.replacesSlot, `config.proceduralLayers[${index}].replacesSlot`);
    if (!slotIds.has(layer.replacesSlot)) {
      fail(`Procedural layer "${layer.id}" replaces unknown slot "${layer.replacesSlot}".`);
    }
    requireName(layer.materialName, `config.proceduralLayers[${index}].materialName`);
    if (layer.importName !== null && layer.importName !== undefined) {
      requireName(layer.importName, `config.proceduralLayers[${index}].importName`);
    }
    const generator = requireObject(
      layer.generator,
      `config.proceduralLayers[${index}].generator`,
    );
    if (generator.type !== "elliptical_radial_v1") {
      fail(`Procedural layer "${layer.id}" uses unsupported generator "${generator.type}".`);
    }
    const center = requireTuple(generator.center, `${layer.id}.generator.center`, 2);
    const radius = requireTuple(generator.radius, `${layer.id}.generator.radius`, 2);
    const color = requireTuple(generator.color, `${layer.id}.generator.color`, 3);
    center.forEach((value, centerIndex) =>
      requireFiniteNumber(value, `${layer.id}.generator.center[${centerIndex}]`, 0),
    );
    radius.forEach((value, radiusIndex) =>
      requireFiniteNumber(value, `${layer.id}.generator.radius[${radiusIndex}]`, 0.01),
    );
    color.forEach((value, colorIndex) => {
      requireInteger(value, `${layer.id}.generator.color[${colorIndex}]`, 0);
      if (value > 255) fail(`${layer.id}.generator.color values must be <= 255.`);
    });
    requireInteger(generator.maximumAlpha, `${layer.id}.generator.maximumAlpha`, 1);
    if (generator.maximumAlpha > 255) {
      fail(`${layer.id}.generator.maximumAlpha must be <= 255.`);
    }
    requireFiniteNumber(
      generator.falloffExponent,
      `${layer.id}.generator.falloffExponent`,
      0.01,
    );
  }
  assertUnique(config.proceduralLayers.map(({ id }) => id), "procedural layer IDs");
  assertUnique(
    config.proceduralLayers.map(({ materialName }) => materialName),
    "procedural material names",
  );
  assertUnique(
    [
      ...config.slots.map(({ materialName }) => materialName),
      ...config.proceduralLayers.map(({ materialName }) => materialName),
    ],
    "all material part names",
  );

  const enabledReplacements = new Map();
  for (const layer of config.proceduralLayers) {
    if (!layer.enabled) continue;
    if (enabledReplacements.has(layer.replacesSlot)) {
      fail(`More than one enabled procedural layer replaces "${layer.replacesSlot}".`);
    }
    enabledReplacements.set(layer.replacesSlot, layer.id);
  }
  for (const slot of config.slots) {
    if (
      slot.sourcePolicy === "reject" &&
      slot.replacementRequired === true &&
      !enabledReplacements.has(slot.id)
    ) {
      fail(`Rejected slot "${slot.id}" requires an enabled procedural replacement.`);
    }
  }

  requireObject(config.sideMap, "config.sideMap");
  requireObject(config.targetPlacement, "config.targetPlacement");
  const importPolicy = requireObject(config.importPolicy, "config.importPolicy");
  if (typeof importPolicy.enabled !== "boolean") {
    fail("config.importPolicy.enabled must be boolean.");
  }
  requireName(importPolicy.rootGroup, "config.importPolicy.rootGroup");
  if (!Array.isArray(importPolicy.blockers)) {
    fail("config.importPolicy.blockers must be an array.");
  }
  importPolicy.blockers.forEach((blocker, index) =>
    requireString(blocker, `config.importPolicy.blockers[${index}]`),
  );

  const outputs = requireObject(config.outputs, "config.outputs");
  requireString(outputs.materialPsd, "config.outputs.materialPsd");
  requireString(outputs.materialManifest, "config.outputs.materialManifest");
  requireString(outputs.importPsd, "config.outputs.importPsd");
  return config;
}

function connectedComponents(width, height, predicate) {
  const pixelCount = width * height;
  const labels = new Int32Array(pixelCount);
  labels.fill(-1);
  const queue = new Int32Array(pixelCount);
  const components = [];

  for (let start = 0; start < pixelCount; start += 1) {
    if (labels[start] !== -1 || !predicate(start)) continue;
    const id = components.length;
    let head = 0;
    let tail = 0;
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    labels[start] = id;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const pixelIndex = queue[head];
      head += 1;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      area += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighborX = x + offsetX;
          const neighborY = y + offsetY;
          if (
            neighborX < 0 ||
            neighborY < 0 ||
            neighborX >= width ||
            neighborY >= height
          ) {
            continue;
          }
          const neighbor = neighborY * width + neighborX;
          if (labels[neighbor] !== -1 || !predicate(neighbor)) continue;
          labels[neighbor] = id;
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    }

    components.push({
      id,
      area,
      bbox: [minX, minY, maxX + 1, maxY + 1],
      centroid: [sumX / area, sumY / area],
    });
  }
  return { labels, components };
}

function pointInRoi(point, roi) {
  return point[0] >= roi[0] && point[0] < roi[2] && point[1] >= roi[1] && point[1] < roi[3];
}

function bboxInsideRoi(bbox, roi) {
  return bbox[0] >= roi[0] && bbox[1] >= roi[1] && bbox[2] <= roi[2] && bbox[3] <= roi[3];
}

function copyPixel(source, target, pixelIndex) {
  const offset = pixelIndex * 4;
  target[offset] = source[offset];
  target[offset + 1] = source[offset + 1];
  target[offset + 2] = source[offset + 2];
  target[offset + 3] = source[offset + 3];
}

function pixelStats(data) {
  let transparentPixels = 0;
  let partialPixels = 0;
  let opaquePixels = 0;
  let visiblePixels = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  const width = data.width;
  for (let pixelIndex = 0; pixelIndex < data.width * data.height; pixelIndex += 1) {
    const alpha = data.data[pixelIndex * 4 + 3];
    if (alpha === 0) {
      transparentPixels += 1;
      continue;
    }
    visiblePixels += 1;
    if (alpha === 255) opaquePixels += 1;
    else partialPixels += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    transparentPixels,
    partialPixels,
    opaquePixels,
    visiblePixels,
    visibleBounds:
      visiblePixels === 0 ? null : [minX, minY, maxX + 1, maxY + 1],
  };
}

function countGreenDominantPixels(imageData, qa) {
  let count = 0;
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    const alpha = imageData.data[offset + 3];
    if (alpha <= qa.greenCheckAlphaExclusive) continue;
    const red = imageData.data[offset];
    const green = imageData.data[offset + 1];
    const blue = imageData.data[offset + 2];
    if (green - Math.max(red, blue) > qa.greenDominanceMargin) count += 1;
  }
  return count;
}

function makeImageData(width, height, data = undefined) {
  return {
    width,
    height,
    data: data === undefined ? new Uint8ClampedArray(width * height * 4) : data,
  };
}

function cloneImageData(imageData) {
  return makeImageData(
    imageData.width,
    imageData.height,
    new Uint8ClampedArray(imageData.data),
  );
}

function generateEllipticalRadialLayer(width, height, procedural) {
  const imageData = makeImageData(width, height);
  const { center, radius, color, maximumAlpha, falloffExponent } = procedural.generator;
  const minX = Math.max(0, Math.floor(center[0] - radius[0]));
  const maxX = Math.min(width, Math.ceil(center[0] + radius[0]));
  const minY = Math.max(0, Math.floor(center[1] - radius[1]));
  const maxY = Math.min(height, Math.ceil(center[1] + radius[1]));
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const normalizedX = (x + 0.5 - center[0]) / radius[0];
      const normalizedY = (y + 0.5 - center[1]) / radius[1];
      const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
      if (distance >= 1) continue;
      const strength = Math.pow(1 - distance, falloffExponent);
      const alpha = Math.round(maximumAlpha * strength);
      if (alpha === 0) continue;
      const offset = (y * width + x) * 4;
      imageData.data[offset] = color[0];
      imageData.data[offset + 1] = color[1];
      imageData.data[offset + 2] = color[2];
      imageData.data[offset + 3] = alpha;
    }
  }
  return imageData;
}

function analyzeAtlas(decoded, config) {
  const { width, height } = decoded;
  const alphaAt = (pixelIndex) => decoded.data[pixelIndex * 4 + 3];
  const positive = connectedComponents(width, height, (pixelIndex) => alphaAt(pixelIndex) > 0);
  const seed = connectedComponents(
    width,
    height,
    (pixelIndex) => alphaAt(pixelIndex) > config.atlas.seedAlphaExclusive,
  );
  const mainSeedComponents = seed.components.filter(
    ({ area }) => area >= config.atlas.minimumSeedArea,
  );
  if (mainSeedComponents.length !== config.atlas.expectedMainComponents) {
    fail(
      `COMPONENT_COUNT_MISMATCH: expected ${config.atlas.expectedMainComponents} main components, found ${mainSeedComponents.length}.`,
    );
  }

  const seedToMain = new Int32Array(seed.components.length);
  seedToMain.fill(-1);
  mainSeedComponents.forEach((component, mainIndex) => {
    seedToMain[component.id] = mainIndex;
  });
  const positiveOwners = Array.from(
    { length: positive.components.length },
    () => new Set(),
  );
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const seedLabel = seed.labels[pixelIndex];
    if (seedLabel < 0) continue;
    const mainIndex = seedToMain[seedLabel];
    if (mainIndex < 0) continue;
    const positiveLabel = positive.labels[pixelIndex];
    positiveOwners[positiveLabel].add(mainIndex);
  }
  for (const [positiveIndex, owners] of positiveOwners.entries()) {
    if (owners.size > 1) {
      fail(
        `COMPONENT_OWNERSHIP_CONFLICT: positive-alpha component ${positiveIndex} touches more than one main component.`,
      );
    }
  }

  const slotByMain = new Int32Array(mainSeedComponents.length);
  slotByMain.fill(-1);
  const mainBySlot = new Int32Array(config.slots.length);
  mainBySlot.fill(-1);
  for (const [mainIndex, component] of mainSeedComponents.entries()) {
    const matches = config.slots
      .map((slot, slotIndex) => ({ slot, slotIndex }))
      .filter(({ slot }) => pointInRoi(component.centroid, slot.roi));
    if (matches.length !== 1) {
      fail(
        `MAIN_COMPONENT_SLOT_AMBIGUITY: component ${component.id} at ${component.centroid.map((value) => value.toFixed(2)).join(",")} matched ${matches.length} slots.`,
      );
    }
    const slotIndex = matches[0].slotIndex;
    if (mainBySlot[slotIndex] !== -1) {
      fail(`SLOT_COMPONENT_DUPLICATE: slot "${config.slots[slotIndex].id}" has multiple main components.`);
    }
    slotByMain[mainIndex] = slotIndex;
    mainBySlot[slotIndex] = mainIndex;
  }
  for (const [slotIndex, mainIndex] of mainBySlot.entries()) {
    if (mainIndex === -1) {
      fail(`SLOT_COMPONENT_MISSING: slot "${config.slots[slotIndex].id}" has no main component.`);
    }
  }

  const positiveToSlot = new Int32Array(positive.components.length);
  positiveToSlot.fill(-1);
  let orphanPositiveComponents = 0;
  const rejectedDustComponents = [];
  for (const component of positive.components) {
    const owners = positiveOwners[component.id];
    if (owners.size === 1) {
      const [mainIndex] = owners;
      positiveToSlot[component.id] = slotByMain[mainIndex];
      continue;
    }
    orphanPositiveComponents += 1;
    const matches = config.slots
      .map((slot, slotIndex) => ({ slot, slotIndex }))
      .filter(({ slot }) => pointInRoi(component.centroid, slot.roi));
    if (matches.length === 0) {
      const policy = config.atlas.unmappedVisiblePolicy;
      const allowedRegions = policy.allowedRegions.filter((region) =>
        bboxInsideRoi(component.bbox, region),
      );
      if (
        allowedRegions.length === 1 &&
        component.area <= policy.maximumAreaPerComponent
      ) {
        rejectedDustComponents.push({
          id: component.id,
          area: component.area,
          bbox: component.bbox,
          centroid: component.centroid.map((value) => Number(value.toFixed(4))),
        });
        continue;
      }
    }
    if (matches.length !== 1) {
      fail(
        `VISIBLE_PIXEL_ASSIGNMENT_FAILED: low-alpha component ${component.id} ` +
          `(${component.area} px at ${component.centroid.map((value) => value.toFixed(2)).join(",")}) matched ${matches.length} slots.`,
      );
    }
    positiveToSlot[component.id] = matches[0].slotIndex;
  }
  const rejectedDustPixels = rejectedDustComponents.reduce(
    (sum, component) => sum + component.area,
    0,
  );
  if (
    rejectedDustComponents.length >
      config.atlas.unmappedVisiblePolicy.maximumComponents ||
    rejectedDustPixels > config.atlas.unmappedVisiblePolicy.maximumTotalPixels
  ) {
    fail(
      `AUDITED_DUST_LIMIT_EXCEEDED: ${rejectedDustComponents.length} components / ` +
        `${rejectedDustPixels} pixels.`,
    );
  }

  const slotByPixel = new Int32Array(width * height);
  slotByPixel.fill(-1);
  const slotVisiblePixels = new Uint32Array(config.slots.length);
  let visiblePixels = 0;
  let explicitlyRejectedVisiblePixels = 0;
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    if (alphaAt(pixelIndex) === 0) continue;
    visiblePixels += 1;
    const positiveLabel = positive.labels[pixelIndex];
    const slotIndex = positiveToSlot[positiveLabel];
    if (slotIndex < 0) {
      explicitlyRejectedVisiblePixels += 1;
      continue;
    }
    slotByPixel[pixelIndex] = slotIndex;
    slotVisiblePixels[slotIndex] += 1;
  }

  const sourceLayerSpecs = [];
  const slotReports = [];
  for (const [slotIndex, slot] of config.slots.entries()) {
    const pixels = makeImageData(width, height);
    for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
      if (slotByPixel[pixelIndex] === slotIndex) {
        copyPixel(decoded.data, pixels.data, pixelIndex);
      }
    }
    const stats = pixelStats(pixels);
    const greenDominantPixels = countGreenDominantPixels(pixels, config.qa);
    const report = {
      id: slot.id,
      category: slot.category,
      materialName: slot.materialName,
      sourcePolicy: slot.sourcePolicy,
      rejectionReason: slot.rejectionReason ?? null,
      productionIntegrity: slot.productionIntegrity,
      mainSeedComponent: mainSeedComponents[mainBySlot[slotIndex]].id,
      seedArea: mainSeedComponents[mainBySlot[slotIndex]].area,
      seedBounds: mainSeedComponents[mainBySlot[slotIndex]].bbox,
      seedCentroid: mainSeedComponents[mainBySlot[slotIndex]].centroid.map((value) =>
        Number(value.toFixed(4)),
      ),
      assignedVisiblePixels: slotVisiblePixels[slotIndex],
      visibleBounds: stats.visibleBounds,
      greenDominantPixels,
      rasterSha256: sha256(Buffer.from(pixels.data)),
      includedInMaterialPsd: slot.sourcePolicy === "include",
    };
    slotReports.push(report);
    if (slot.sourcePolicy === "include") {
      if (
        greenDominantPixels >
        config.qa.maximumGreenDominantPixelsPerIncludedSourceSlot
      ) {
        fail(
          `GREEN_EDGE_QA_FAILED: included slot "${slot.id}" contains ${greenDominantPixels} green-dominant pixels.`,
        );
      }
      sourceLayerSpecs.push({
        category: slot.category,
        materialName: slot.materialName,
        importName: slot.importName,
        kind: "source",
        slotId: slot.id,
        productionIntegrity: slot.productionIntegrity,
        imageData: pixels,
      });
    }
  }

  const proceduralLayerSpecs = [];
  const proceduralReports = [];
  for (const procedural of config.proceduralLayers) {
    if (!procedural.enabled) continue;
    const pixels = generateEllipticalRadialLayer(width, height, procedural);
    const stats = pixelStats(pixels);
    if (stats.visiblePixels === 0) {
      fail(`PROCEDURAL_LAYER_EMPTY: "${procedural.id}" generated no visible pixels.`);
    }
    const greenDominantPixels = countGreenDominantPixels(pixels, config.qa);
    if (greenDominantPixels !== 0) {
      fail(
        `PROCEDURAL_GREEN_QA_FAILED: "${procedural.id}" generated ${greenDominantPixels} green-dominant pixels.`,
      );
    }
    proceduralLayerSpecs.push({
      category: procedural.category,
      materialName: procedural.materialName,
      importName: procedural.importName,
      kind: "procedural",
      slotId: procedural.replacesSlot,
      productionIntegrity: "procedural_candidate_unplaced",
      imageData: pixels,
    });
    proceduralReports.push({
      id: procedural.id,
      replacesSlot: procedural.replacesSlot,
      materialName: procedural.materialName,
      generator: procedural.generator,
      visiblePixels: stats.visiblePixels,
      visibleBounds: stats.visibleBounds,
      greenDominantPixels,
      rasterSha256: sha256(Buffer.from(pixels.data)),
    });
  }

  return {
    detection: {
      positiveAlphaComponentCount: positive.components.length,
      seedComponentCount: seed.components.length,
      mainSeedComponentCount: mainSeedComponents.length,
      seedDustComponentCount: seed.components.length - mainSeedComponents.length,
      orphanPositiveComponentCount: orphanPositiveComponents,
      explicitlyRejectedDustComponents: rejectedDustComponents,
      explicitlyRejectedVisiblePixels,
      visiblePixels,
      assignedVisiblePixels: slotVisiblePixels.reduce((sum, count) => sum + count, 0),
      accountedVisiblePixels:
        slotVisiblePixels.reduce((sum, count) => sum + count, 0) +
        explicitlyRejectedVisiblePixels,
    },
    mainSeedComponents,
    slotReports,
    proceduralReports,
    layerSpecs: [...sourceLayerSpecs, ...proceduralLayerSpecs],
  };
}

function makeLeaf(name, imageData) {
  return {
    name,
    top: 0,
    left: 0,
    opacity: 1,
    hidden: false,
    blendMode: "normal",
    clipping: false,
    imageData: cloneImageData(imageData),
  };
}

function buildMaterialTree(config, layerSpecs) {
  const children = [];
  const expectedLeaves = [];
  for (const category of config.material.categories) {
    const categoryParts = layerSpecs.filter(({ category: id }) => id === category.id);
    if (categoryParts.length === 0) continue;
    const partGroups = categoryParts.map((part) => {
      const suffix = part.kind === "procedural" ? "procedural" : "source";
      const leafName = `${part.materialName}__${suffix}`;
      const leaf = makeLeaf(leafName, part.imageData);
      expectedLeaves.push({ name: leafName, imageData: part.imageData });
      return {
        name: `${part.materialName}__material_group`,
        opened: true,
        children: [leaf],
      };
    });
    children.push({
      name: category.groupName,
      opened: true,
      children: partGroups,
    });
  }
  return {
    children: [
      {
        name: config.material.rootGroup,
        opened: true,
        children,
      },
    ],
    expectedLeaves,
  };
}

function importReadinessBlockers(config, layerSpecs) {
  const blockers = [...config.importPolicy.blockers];
  if (!config.importPolicy.enabled) blockers.push("IMPORT_POLICY_DISABLED");
  if (config.sideMap.requiredForImport && config.sideMap.status !== "approved") {
    blockers.push("SIDE_MAP_NOT_APPROVED");
  }
  if (
    config.targetPlacement.requiredForImport &&
    config.targetPlacement.status !== "approved"
  ) {
    blockers.push("TARGET_PLACEMENT_NOT_APPROVED");
  }
  if (config.targetPlacement.mode !== "atlas_identity_approved") {
    blockers.push("UNSUPPORTED_TARGET_PLACEMENT_MODE");
  }
  for (const layer of layerSpecs) {
    if (layer.importName === null || layer.importName === undefined) {
      blockers.push(`MISSING_IMPORT_NAME:${layer.materialName}`);
    }
    if (layer.kind === "source" && layer.productionIntegrity !== "approved") {
      blockers.push(`SOURCE_INTEGRITY_NOT_APPROVED:${layer.materialName}`);
    }
  }
  const names = layerSpecs
    .map(({ importName }) => importName)
    .filter((name) => typeof name === "string");
  if (new Set(names).size !== names.length) blockers.push("DUPLICATE_IMPORT_NAMES");
  return [...new Set(blockers)];
}

function buildImportTree(config, layerSpecs) {
  const blockers = importReadinessBlockers(config, layerSpecs);
  if (blockers.length > 0) {
    fail(`PRODUCTION_IMPORT_BLOCKED:\n- ${blockers.join("\n- ")}`);
  }
  const children = [];
  const expectedLeaves = [];
  for (const category of config.material.categories) {
    const categoryParts = layerSpecs.filter(({ category: id }) => id === category.id);
    if (categoryParts.length === 0) continue;
    const leaves = categoryParts.map((part) => {
      const leaf = makeLeaf(part.importName, part.imageData);
      expectedLeaves.push({ name: part.importName, imageData: part.imageData });
      return leaf;
    });
    children.push({ name: category.groupName, opened: true, children: leaves });
  }
  return {
    children: [
      {
        name: config.importPolicy.rootGroup,
        opened: true,
        children,
      },
    ],
    expectedLeaves,
  };
}

function compositeTopToBottom(width, height, leaves) {
  const composite = makeImageData(width, height);
  for (let leafIndex = leaves.length - 1; leafIndex >= 0; leafIndex -= 1) {
    const source = leaves[leafIndex].imageData.data;
    const destination = composite.data;
    for (let offset = 0; offset < source.length; offset += 4) {
      const sourceAlphaByte = source[offset + 3];
      if (sourceAlphaByte === 0) continue;
      if (sourceAlphaByte === 255) {
        destination[offset] = source[offset];
        destination[offset + 1] = source[offset + 1];
        destination[offset + 2] = source[offset + 2];
        destination[offset + 3] = 255;
        continue;
      }
      const sourceAlpha = sourceAlphaByte / 255;
      const destinationAlpha = destination[offset + 3] / 255;
      const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
      if (outputAlpha <= 0) continue;
      for (let channel = 0; channel < 3; channel += 1) {
        const numerator =
          source[offset + channel] * sourceAlpha +
          destination[offset + channel] * destinationAlpha * (1 - sourceAlpha);
        destination[offset + channel] = Math.round(numerator / outputAlpha);
      }
      destination[offset + 3] = Math.round(outputAlpha * 255);
    }
  }
  return composite;
}

// PSD composite channels use Photoshop's historical white-matte encoding.
// ag-psd applies it through Uint8Array (truncation), then removes it through
// Uint8ClampedArray (round-to-nearest) on read. Low-alpha RGB therefore cannot
// round-trip byte-for-byte even though every layer can. Simulating that exact
// public-library path lets us validate the stored composite deterministically.
function simulateAgPsdCompositeRoundTrip(imageData) {
  const result = cloneImageData(imageData);
  const clamped = new Uint8ClampedArray(1);
  for (let offset = 0; offset < result.data.length; offset += 4) {
    const alphaByte = result.data[offset + 3];
    if (alphaByte === 0 || alphaByte === 255) continue;
    const alpha = alphaByte / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      const matteEncoded = Math.trunc(
        result.data[offset + channel] * alpha + 255 * (1 - alpha),
      );
      const reciprocalAlpha = 1 / alpha;
      const inverseAlphaOffset = 255 * (1 - reciprocalAlpha);
      clamped[0] = matteEncoded * reciprocalAlpha + inverseAlphaOffset;
      result.data[offset + channel] = clamped[0];
    }
  }
  return result;
}

function collectLayers(children, layers = [], names = []) {
  for (const child of children ?? []) {
    names.push(child.name);
    if (child.children !== undefined) collectLayers(child.children, layers, names);
    else layers.push(child);
  }
  return { layers, names };
}

function compareBytes(actual, expected, label) {
  if (actual.length !== expected.length) {
    fail(`${label} byte length changed (${actual.length} != ${expected.length}).`);
  }
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expected[index]) {
      fail(
        `${label} pixel data differs at byte ${index} ` +
          `(actual ${actual[index]}, expected ${expected[index]}).`,
      );
    }
  }
}

function validateWrittenPsd(bytes, width, height, expectedTree, expectedComposite) {
  const parsed = readPsd(bytes, {
    useImageData: true,
    skipThumbnail: true,
    throwForMissingFeatures: true,
  });
  if (
    parsed.width !== width ||
    parsed.height !== height ||
    parsed.bitsPerChannel !== 8 ||
    parsed.colorMode !== 3
  ) {
    fail("PSD_HEADER_VALIDATION_FAILED: expected RGB 8-bit document dimensions.");
  }
  if (parsed.imageData === undefined) fail("PSD_COMPOSITE_MISSING.");
  const expectedStoredComposite = simulateAgPsdCompositeRoundTrip(expectedComposite);
  compareBytes(
    parsed.imageData.data,
    expectedStoredComposite.data,
    "PSD composite (ag-psd white-matte round trip)",
  );
  const parsedTree = collectLayers(parsed.children);
  const expectedNames = collectLayers(expectedTree.children).names;
  if (JSON.stringify(parsedTree.names) !== JSON.stringify(expectedNames)) {
    fail(
      `PSD_STRUCTURE_VALIDATION_FAILED: ${JSON.stringify(parsedTree.names)} != ${JSON.stringify(expectedNames)}.`,
    );
  }
  assertUnique(parsedTree.names, "PSD layer/group names");
  if (parsedTree.layers.length !== expectedTree.expectedLeaves.length) {
    fail("PSD_LEAF_COUNT_VALIDATION_FAILED.");
  }
  const expectedByName = new Map(
    expectedTree.expectedLeaves.map((leaf) => [leaf.name, leaf.imageData]),
  );
  for (const layer of parsedTree.layers) {
    const expected = expectedByName.get(layer.name);
    if (expected === undefined) fail(`PSD_UNEXPECTED_LEAF:${layer.name}`);
    if (
      layer.children !== undefined ||
      layer.imageData === undefined ||
      layer.top !== 0 ||
      layer.left !== 0 ||
      layer.blendMode !== "normal" ||
      layer.clipping === true ||
      layer.opacity !== 1 ||
      layer.mask !== undefined ||
      layer.text !== undefined ||
      layer.vectorMask !== undefined ||
      layer.adjustment !== undefined ||
      layer.effects !== undefined
    ) {
      fail(`PSD_LEAF_CONTRACT_FAILED:${layer.name}`);
    }
    if (layer.imageData.width !== width || layer.imageData.height !== height) {
      fail(`PSD_LAYER_CANVAS_CHANGED:${layer.name}`);
    }
    compareBytes(layer.imageData.data, expected.data, `PSD layer ${layer.name}`);
  }
  return {
    width: parsed.width,
    height: parsed.height,
    leafCount: parsedTree.layers.length,
    names: parsedTree.names,
  };
}

function makePsd(width, height, tree) {
  const composite = compositeTopToBottom(width, height, tree.expectedLeaves);
  return {
    psd: {
      width,
      height,
      channels: 4,
      bitsPerChannel: 8,
      colorMode: 3,
      imageData: cloneImageData(composite),
      children: tree.children,
    },
    composite,
  };
}

async function atomicWrite(filePath, bytes) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.tmp`,
  );
  try {
    await writeFile(temporaryPath, bytes);
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function writePsdArtifact(filePath, width, height, tree) {
  const { psd, composite } = makePsd(width, height, tree);
  const bytes = writePsdBuffer(psd, {
    generateThumbnail: false,
    trimImageData: false,
    noBackground: true,
    compress: false,
  });
  const validation = validateWrittenPsd(bytes, width, height, tree, composite);
  await atomicWrite(filePath, bytes);
  return { bytes, validation };
}

function buildManifest({
  sourcePath,
  sourceBytes,
  configPath,
  configBytes,
  config,
  analysis,
  materialOutputPath,
  materialBytes,
  materialValidation,
}) {
  return {
    schemaVersion: 1,
    algorithm,
    status: "MATERIAL_SEPARATION_WORKBENCH_NOT_CUBISM_IMPORT",
    source: {
      path: projectRelative(sourcePath),
      sha256: sha256(sourceBytes),
      width: config.atlas.width,
      height: config.atlas.height,
    },
    configuration: {
      path: projectRelative(configPath),
      sha256: sha256(configBytes),
    },
    detection: analysis.detection,
    slots: analysis.slotReports,
    proceduralLayers: analysis.proceduralReports,
    materialPsd: {
      path: projectRelative(materialOutputPath),
      sha256: sha256(materialBytes),
      width: materialValidation.width,
      height: materialValidation.height,
      rasterLeafCount: materialValidation.leafCount,
      roundTripValidated: true,
      pixelDataRoundTrip: "BYTE_FOR_BYTE_PASS",
      colorMode: "RGB",
      bitsPerChannel: 8,
      colorProfile: "UNTAGGED_BY_AG_PSD_REQUIRES_SRGB_AUTHORING_APP_RESAVE",
    },
    productionImport: {
      status: "BLOCKED_FAIL_CLOSED",
      outputWritten: false,
      blockers: importReadinessBlockers(config, analysis.layerSpecs),
    },
  };
}

export async function runBuild(options = {}) {
  const mode = options.mode ?? "material";
  if (!new Set(["material", "import", "both"]).has(mode)) {
    fail(`Unknown mode "${mode}".`);
  }
  const configPath = resolveProjectPath(options.config ?? defaultConfigPath);
  const configBytes = await readFile(configPath);
  const config = validateConfiguration(JSON.parse(configBytes.toString("utf8")));
  const sourcePath = resolveProjectPath(options.atlas ?? config.source.path);
  const sourceBytes = await readFile(sourcePath);
  const sourceHash = sha256(sourceBytes);
  if (config.source.sha256 !== undefined && sourceHash !== config.source.sha256) {
    fail(
      `SOURCE_SHA256_MISMATCH: expected ${config.source.sha256}, got ${sourceHash}.`,
    );
  }
  const decoded = PNG.sync.read(sourceBytes, { skipRescale: true });
  if (
    decoded.width !== config.atlas.width ||
    decoded.height !== config.atlas.height ||
    decoded.depth !== 8 ||
    decoded.colorType !== 6
  ) {
    fail(
      `ATLAS_FORMAT_INVALID: expected ${config.atlas.width}x${config.atlas.height} 8-bit RGBA PNG, ` +
        `got ${decoded.width}x${decoded.height}, depth ${decoded.depth}, colorType ${decoded.colorType}.`,
    );
  }
  let transparentPixels = 0;
  let visiblePixels = 0;
  for (let offset = 3; offset < decoded.data.length; offset += 4) {
    if (decoded.data[offset] === 0) transparentPixels += 1;
    else visiblePixels += 1;
  }
  if (transparentPixels === 0 || visiblePixels === 0) {
    fail("ATLAS_ALPHA_INVALID: both transparent and visible pixels are required.");
  }

  const materialOutputPath = resolveProjectPath(
    options.materialOutput ?? config.outputs.materialPsd,
  );
  const manifestOutputPath = resolveProjectPath(
    options.manifestOutput ?? config.outputs.materialManifest,
  );
  const importOutputPath = resolveProjectPath(
    options.importOutput ?? config.outputs.importPsd,
  );
  const distinctPaths = [sourcePath, configPath, materialOutputPath, manifestOutputPath, importOutputPath];
  if (new Set(distinctPaths.map((value) => path.resolve(value))).size !== distinctPaths.length) {
    fail("INPUT_OUTPUT_PATH_COLLISION: source, config, and outputs must be distinct.");
  }

  const analysis = analyzeAtlas(decoded, config);
  const result = {
    algorithm,
    mode,
    source: { path: projectRelative(sourcePath), sha256: sourceHash },
    detection: analysis.detection,
    material: null,
    import: null,
  };

  if (mode === "material" || mode === "both") {
    const materialTree = buildMaterialTree(config, analysis.layerSpecs);
    const materialArtifact = await writePsdArtifact(
      materialOutputPath,
      decoded.width,
      decoded.height,
      materialTree,
    );
    const manifest = buildManifest({
      sourcePath,
      sourceBytes,
      configPath,
      configBytes,
      config,
      analysis,
      materialOutputPath,
      materialBytes: materialArtifact.bytes,
      materialValidation: materialArtifact.validation,
    });
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    await atomicWrite(manifestOutputPath, manifestBytes);
    result.material = {
      status: "GENERATED_WORKBENCH_NOT_CUBISM_IMPORT",
      psd: projectRelative(materialOutputPath),
      psdSha256: sha256(materialArtifact.bytes),
      manifest: projectRelative(manifestOutputPath),
      manifestSha256: sha256(manifestBytes),
      leafCount: materialArtifact.validation.leafCount,
      roundTripValidated: true,
    };
  }

  if (mode === "import" || mode === "both") {
    const importTree = buildImportTree(config, analysis.layerSpecs);
    const importArtifact = await writePsdArtifact(
      importOutputPath,
      decoded.width,
      decoded.height,
      importTree,
    );
    result.import = {
      status: "GENERATED_REQUIRES_CUBISM_SMOKE_TEST",
      psd: projectRelative(importOutputPath),
      psdSha256: sha256(importArtifact.bytes),
      leafCount: importArtifact.validation.leafCount,
      roundTripValidated: true,
    };
  }
  return result;
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const result = await runBuild({
    mode: arguments_.mode,
    config: arguments_.config,
    atlas: arguments_.atlas,
    materialOutput: arguments_["material-output"],
    manifestOutput: arguments_["manifest-output"],
    importOutput: arguments_["import-output"],
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
