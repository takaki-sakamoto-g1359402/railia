import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeCanvas, readPsd, writePsdBuffer } from "ag-psd";
import { PNG } from "pngjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const projectRoot = path.resolve(scriptDirectory, "..");
const workbenchRoot = path.join(
  projectRoot,
  "art",
  "live2d",
  "production-workbench",
  "riai-secondary-motion",
);
const defaultConfigurations = {
  hair: path.join(workbenchRoot, "config", "riai-hair-material-v001.json"),
  cloth: path.join(workbenchRoot, "config", "riai-cloth-material-v003.json"),
};
const algorithm = "RIAI_SECONDARY_COMPONENT_PSD_V001";
const safeNamePattern = /^[a-z][a-z0-9_]*$/;

// ag-psd requires an ImageData constructor when parsing RGBA layers. Raw
// imageData is used throughout so a Canvas implementation cannot premultiply
// alpha or alter source pixels.
initializeCanvas(
  () => {
    throw new Error("Canvas rendering is disabled for deterministic PSD builds.");
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

function requireName(value, label) {
  const name = requireString(value, label);
  if (!safeNamePattern.test(name)) {
    fail(`${label} must match ${safeNamePattern}. Got "${name}".`);
  }
  return name;
}

function requireInteger(value, label, minimum = Number.MIN_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < minimum) {
    fail(`${label} must be an integer >= ${minimum}.`);
  }
  return value;
}

function requireTuple(value, label, length) {
  if (!Array.isArray(value) || value.length !== length) {
    fail(`${label} must contain exactly ${length} entries.`);
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
    "asset",
    "config",
    "source",
    "material-output",
    "manifest-output",
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
  const asset = values.asset ?? "all";
  if (!new Set(["all", "hair", "cloth"]).has(asset)) {
    fail(`Unknown asset "${asset}". Expected all, hair, or cloth.`);
  }
  if (
    values.config !== undefined &&
    (values.asset !== undefined ||
      values.source !== undefined ||
      values["material-output"] !== undefined ||
      values["manifest-output"] !== undefined)
  ) {
    fail("--config is a standalone build and cannot be combined with output overrides or --asset.");
  }
  if (
    asset === "all" &&
    (values.source !== undefined ||
      values["material-output"] !== undefined ||
      values["manifest-output"] !== undefined)
  ) {
    fail("Output overrides require --asset=hair or --asset=cloth.");
  }
  return { ...values, asset };
}

function validateRectangle(value, label, width, height) {
  const rectangle = requireTuple(value, label, 4);
  rectangle.forEach((entry, index) => requireInteger(entry, `${label}[${index}]`, 0));
  if (
    rectangle[0] >= rectangle[2] ||
    rectangle[1] >= rectangle[3] ||
    rectangle[2] > width ||
    rectangle[3] > height
  ) {
    fail(`${label} is outside the atlas or empty.`);
  }
  return rectangle;
}

function validateConfiguration(configuration) {
  const config = requireObject(configuration, "config");
  if (config.schemaVersion !== 1) fail("config.schemaVersion must be 1.");
  requireName(config.assetId, "config.assetId");
  requireString(config.status, "config.status");

  const source = requireObject(config.source, "config.source");
  requireString(source.path, "config.source.path");
  if (!/^[a-f0-9]{64}$/.test(source.sha256)) {
    fail("config.source.sha256 must be a lowercase SHA-256 string.");
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
  if (atlas.connectivity !== 8) fail("Only 8-connected labeling is supported.");
  if (atlas.requireEveryVisiblePixelAccounted !== true) {
    fail("config.atlas.requireEveryVisiblePixelAccounted must be true.");
  }
  const dust = requireObject(atlas.auditedDustPolicy, "config.atlas.auditedDustPolicy");
  if (dust.mode !== "reject_explicit_regions") {
    fail("config.atlas.auditedDustPolicy.mode must be reject_explicit_regions.");
  }
  requireInteger(dust.maximumComponents, "auditedDustPolicy.maximumComponents", 0);
  requireInteger(dust.maximumAreaPerComponent, "auditedDustPolicy.maximumAreaPerComponent", 0);
  requireInteger(dust.maximumTotalPixels, "auditedDustPolicy.maximumTotalPixels", 0);
  if (!Array.isArray(dust.allowedRegions) || dust.allowedRegions.length === 0) {
    fail("auditedDustPolicy.allowedRegions must be a non-empty array.");
  }
  dust.allowedRegions.forEach((region, index) =>
    validateRectangle(
      region,
      `auditedDustPolicy.allowedRegions[${index}]`,
      atlas.width,
      atlas.height,
    ),
  );

  const material = requireObject(config.material, "config.material");
  requireName(material.rootGroup, "config.material.rootGroup");
  if (!Array.isArray(material.categories) || material.categories.length === 0) {
    fail("config.material.categories must be a non-empty array.");
  }
  material.categories.forEach((category, index) => {
    requireObject(category, `config.material.categories[${index}]`);
    requireName(category.id, `config.material.categories[${index}].id`);
    requireName(category.groupName, `config.material.categories[${index}].groupName`);
  });
  assertUnique(material.categories.map(({ id }) => id), "category IDs");
  assertUnique(material.categories.map(({ groupName }) => groupName), "category group names");
  const categoryIds = new Set(material.categories.map(({ id }) => id));

  if (!Array.isArray(config.slots) || config.slots.length === 0) {
    fail("config.slots must be a non-empty array.");
  }
  config.slots.forEach((slot, index) => {
    requireObject(slot, `config.slots[${index}]`);
    requireName(slot.id, `config.slots[${index}].id`);
    requireName(slot.category, `config.slots[${index}].category`);
    if (!categoryIds.has(slot.category)) {
      fail(`Slot "${slot.id}" references unknown category "${slot.category}".`);
    }
    validateRectangle(slot.roi, `config.slots[${index}].roi`, atlas.width, atlas.height);
    requireName(slot.materialName, `config.slots[${index}].materialName`);
    if (!new Set(["include", "reject"]).has(slot.sourcePolicy)) {
      fail(`Slot "${slot.id}" has invalid sourcePolicy "${slot.sourcePolicy}".`);
    }
    requireString(slot.productionIntegrity, `config.slots[${index}].productionIntegrity`);
    if (slot.sourcePolicy === "reject") {
      requireString(slot.rejectionReason, `config.slots[${index}].rejectionReason`);
    }
  });
  assertUnique(config.slots.map(({ id }) => id), "slot IDs");
  assertUnique(config.slots.map(({ materialName }) => materialName), "material names");
  if (config.slots.length !== atlas.expectedMainComponents) {
    fail("Every expected main component must have exactly one declared slot.");
  }

  const productionImport = requireObject(config.productionImport, "config.productionImport");
  if (productionImport.enabled !== false) {
    fail("This workbench builder requires config.productionImport.enabled=false.");
  }
  if (!Array.isArray(productionImport.blockers) || productionImport.blockers.length === 0) {
    fail("config.productionImport.blockers must be a non-empty array.");
  }
  productionImport.blockers.forEach((blocker, index) =>
    requireString(blocker, `config.productionImport.blockers[${index}]`),
  );

  const outputs = requireObject(config.outputs, "config.outputs");
  requireString(outputs.materialPsd, "config.outputs.materialPsd");
  requireString(outputs.materialManifest, "config.outputs.materialManifest");
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

      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const neighborX = x + deltaX;
          const neighborY = y + deltaY;
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

function pointInside(point, rectangle) {
  return (
    point[0] >= rectangle[0] &&
    point[0] < rectangle[2] &&
    point[1] >= rectangle[1] &&
    point[1] < rectangle[3]
  );
}

function bboxInside(bbox, rectangle) {
  return (
    bbox[0] >= rectangle[0] &&
    bbox[1] >= rectangle[1] &&
    bbox[2] <= rectangle[2] &&
    bbox[3] <= rectangle[3]
  );
}

function makeImageData(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function cloneImageData(imageData) {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data),
  };
}

function copyPixel(source, target, pixelIndex) {
  const offset = pixelIndex * 4;
  target[offset] = source[offset];
  target[offset + 1] = source[offset + 1];
  target[offset + 2] = source[offset + 2];
  target[offset + 3] = source[offset + 3];
}

function imageStats(imageData) {
  let visiblePixels = 0;
  let transparentPixels = 0;
  let partialPixels = 0;
  let opaquePixels = 0;
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;
  for (let pixelIndex = 0; pixelIndex < imageData.width * imageData.height; pixelIndex += 1) {
    const alpha = imageData.data[pixelIndex * 4 + 3];
    if (alpha === 0) {
      transparentPixels += 1;
      continue;
    }
    visiblePixels += 1;
    if (alpha === 255) opaquePixels += 1;
    else partialPixels += 1;
    const x = pixelIndex % imageData.width;
    const y = Math.floor(pixelIndex / imageData.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    visiblePixels,
    transparentPixels,
    partialPixels,
    opaquePixels,
    visibleBounds:
      visiblePixels === 0 ? null : [minX, minY, maxX + 1, maxY + 1],
  };
}

function countGreenDominantPixels(imageData, alphaExclusive = 16, margin = 20) {
  let count = 0;
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    if (imageData.data[offset + 3] <= alphaExclusive) continue;
    const red = imageData.data[offset];
    const green = imageData.data[offset + 1];
    const blue = imageData.data[offset + 2];
    if (green - Math.max(red, blue) > margin) count += 1;
  }
  return count;
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
  const mainSeeds = seed.components.filter(
    ({ area }) => area >= config.atlas.minimumSeedArea,
  );
  if (mainSeeds.length !== config.atlas.expectedMainComponents) {
    fail(
      `COMPONENT_COUNT_MISMATCH:${config.assetId}: expected ` +
        `${config.atlas.expectedMainComponents}, found ${mainSeeds.length}.`,
    );
  }

  const mainIndexBySeedId = new Int32Array(seed.components.length);
  mainIndexBySeedId.fill(-1);
  mainSeeds.forEach((component, mainIndex) => {
    mainIndexBySeedId[component.id] = mainIndex;
  });

  const mainIndexBySlot = new Int32Array(config.slots.length);
  mainIndexBySlot.fill(-1);
  const slotIndexByMain = new Int32Array(mainSeeds.length);
  slotIndexByMain.fill(-1);
  for (const [mainIndex, component] of mainSeeds.entries()) {
    const matches = config.slots
      .map((slot, slotIndex) => ({ slot, slotIndex }))
      .filter(({ slot }) => pointInside(component.centroid, slot.roi));
    if (matches.length !== 1) {
      fail(
        `MAIN_COMPONENT_SLOT_AMBIGUITY:${config.assetId}: component ${component.id} ` +
          `at ${component.centroid.map((value) => value.toFixed(2)).join(",")} ` +
          `matched ${matches.length} slots.`,
      );
    }
    const { slot, slotIndex } = matches[0];
    if (!bboxInside(component.bbox, slot.roi)) {
      fail(`MAIN_COMPONENT_OUTSIDE_ROI:${config.assetId}:${slot.id}`);
    }
    if (mainIndexBySlot[slotIndex] !== -1) {
      fail(`SLOT_COMPONENT_DUPLICATE:${config.assetId}:${slot.id}`);
    }
    mainIndexBySlot[slotIndex] = mainIndex;
    slotIndexByMain[mainIndex] = slotIndex;
  }
  for (const [slotIndex, mainIndex] of mainIndexBySlot.entries()) {
    if (mainIndex === -1) {
      fail(`SLOT_COMPONENT_MISSING:${config.assetId}:${config.slots[slotIndex].id}`);
    }
  }

  const ownersByPositive = Array.from({ length: positive.components.length }, () => new Set());
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const seedId = seed.labels[pixelIndex];
    if (seedId < 0) continue;
    const mainIndex = mainIndexBySeedId[seedId];
    if (mainIndex < 0) continue;
    const positiveId = positive.labels[pixelIndex];
    ownersByPositive[positiveId].add(mainIndex);
  }

  const slotIndexByPositive = new Int32Array(positive.components.length);
  slotIndexByPositive.fill(-1);
  const explicitlyRejectedDust = [];
  for (const component of positive.components) {
    const owners = ownersByPositive[component.id];
    if (owners.size > 1) {
      fail(`COMPONENT_OWNERSHIP_CONFLICT:${config.assetId}:${component.id}`);
    }
    if (owners.size === 1) {
      const [mainIndex] = owners;
      slotIndexByPositive[component.id] = slotIndexByMain[mainIndex];
      continue;
    }

    const dustRegions = config.atlas.auditedDustPolicy.allowedRegions.filter((region) =>
      bboxInside(component.bbox, region),
    );
    if (
      dustRegions.length === 1 &&
      component.area <= config.atlas.auditedDustPolicy.maximumAreaPerComponent
    ) {
      slotIndexByPositive[component.id] = -2;
      explicitlyRejectedDust.push({
        componentId: component.id,
        area: component.area,
        bbox: component.bbox,
        centroid: component.centroid.map((value) => Number(value.toFixed(4))),
        reason: "atlas_edge_low_alpha_speck",
      });
      continue;
    }

    const slotMatches = config.slots
      .map((slot, slotIndex) => ({ slot, slotIndex }))
      .filter(({ slot }) => bboxInside(component.bbox, slot.roi));
    if (slotMatches.length !== 1) {
      fail(
        `VISIBLE_PIXEL_ASSIGNMENT_FAILED:${config.assetId}: orphan component ` +
          `${component.id} (${component.area}px, bbox ${component.bbox.join(",")}) ` +
          `matched ${slotMatches.length} slots.`,
      );
    }
    slotIndexByPositive[component.id] = slotMatches[0].slotIndex;
  }

  const rejectedDustPixels = explicitlyRejectedDust.reduce(
    (total, component) => total + component.area,
    0,
  );
  if (
    explicitlyRejectedDust.length > config.atlas.auditedDustPolicy.maximumComponents ||
    rejectedDustPixels > config.atlas.auditedDustPolicy.maximumTotalPixels
  ) {
    fail(
      `AUDITED_DUST_LIMIT_EXCEEDED:${config.assetId}: ` +
        `${explicitlyRejectedDust.length} components / ${rejectedDustPixels} pixels.`,
    );
  }

  const pixelsBySlot = config.slots.map(() => makeImageData(width, height));
  const visiblePixelsBySlot = new Uint32Array(config.slots.length);
  let visiblePixels = 0;
  let explicitlyRejectedDustPixels = 0;
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    if (alphaAt(pixelIndex) === 0) continue;
    visiblePixels += 1;
    const positiveId = positive.labels[pixelIndex];
    const slotIndex = slotIndexByPositive[positiveId];
    if (slotIndex === -2) {
      explicitlyRejectedDustPixels += 1;
      continue;
    }
    if (slotIndex < 0) {
      fail(`INTERNAL_UNASSIGNED_PIXEL:${config.assetId}:${pixelIndex}`);
    }
    visiblePixelsBySlot[slotIndex] += 1;
    copyPixel(decoded.data, pixelsBySlot[slotIndex].data, pixelIndex);
  }

  const layerSpecs = [];
  const slotReports = [];
  let explicitlyRejectedSlotPixels = 0;
  for (const [slotIndex, slot] of config.slots.entries()) {
    const imageData = pixelsBySlot[slotIndex];
    const stats = imageStats(imageData);
    if (stats.visiblePixels === 0) fail(`EMPTY_SLOT:${config.assetId}:${slot.id}`);
    const mainSeed = mainSeeds[mainIndexBySlot[slotIndex]];
    const report = {
      id: slot.id,
      category: slot.category,
      materialName: slot.materialName,
      sourcePolicy: slot.sourcePolicy,
      rejectionReason: slot.rejectionReason ?? null,
      productionIntegrity: slot.productionIntegrity,
      mainSeedComponentId: mainSeed.id,
      mainSeedArea: mainSeed.area,
      mainSeedBounds: mainSeed.bbox,
      mainSeedCentroid: mainSeed.centroid.map((value) => Number(value.toFixed(4))),
      assignedVisiblePixels: visiblePixelsBySlot[slotIndex],
      visibleBounds: stats.visibleBounds,
      partialPixels: stats.partialPixels,
      opaquePixels: stats.opaquePixels,
      greenDominantPixelsAlphaGt16Margin20: countGreenDominantPixels(imageData),
      rasterSha256: sha256(Buffer.from(imageData.data)),
      includedInMaterialPsd: slot.sourcePolicy === "include",
    };
    slotReports.push(report);
    if (slot.sourcePolicy === "reject") {
      explicitlyRejectedSlotPixels += stats.visiblePixels;
      continue;
    }
    layerSpecs.push({
      category: slot.category,
      materialName: slot.materialName,
      slotId: slot.id,
      productionIntegrity: slot.productionIntegrity,
      imageData,
    });
  }

  const includedVisiblePixels = layerSpecs.reduce(
    (total, layer) => total + imageStats(layer.imageData).visiblePixels,
    0,
  );
  const accountedVisiblePixels =
    includedVisiblePixels + explicitlyRejectedSlotPixels + explicitlyRejectedDustPixels;
  if (accountedVisiblePixels !== visiblePixels) {
    fail(
      `VISIBLE_PIXEL_ACCOUNTING_FAILED:${config.assetId}: ` +
        `${accountedVisiblePixels} != ${visiblePixels}.`,
    );
  }

  return {
    detection: {
      positiveAlphaComponentCount: positive.components.length,
      seedComponentCount: seed.components.length,
      mainSeedComponentCount: mainSeeds.length,
      seedDustComponentCount: seed.components.length - mainSeeds.length,
      visiblePixels,
      includedVisiblePixels,
      explicitlyRejectedSlotPixels,
      explicitlyRejectedDustPixels,
      accountedVisiblePixels,
      explicitlyRejectedDust,
    },
    slotReports,
    layerSpecs,
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
  const categoryGroups = [];
  const expectedLeaves = [];
  for (const category of config.material.categories) {
    const categoryLayers = layerSpecs.filter(({ category: id }) => id === category.id);
    if (categoryLayers.length === 0) continue;
    const partGroups = categoryLayers.map((layer) => {
      const leafName = `${layer.materialName}__source`;
      const leaf = makeLeaf(leafName, layer.imageData);
      expectedLeaves.push({ name: leafName, imageData: layer.imageData });
      return {
        name: `${layer.materialName}__material_group`,
        opened: true,
        children: [leaf],
      };
    });
    categoryGroups.push({
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
        children: categoryGroups,
      },
    ],
    expectedLeaves,
  };
}

function compositeBottomToTop(width, height, leaves) {
  const composite = makeImageData(width, height);
  for (let layerIndex = leaves.length - 1; layerIndex >= 0; layerIndex -= 1) {
    const source = leaves[layerIndex].imageData.data;
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

// PSD composite channels use a historical white matte. This mirrors ag-psd's
// public write/read path so the validation compares the bytes that are
// intentionally representable in the PSD composite, while layer rasters are
// still required to round-trip byte for byte.
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

function collectTree(children, leaves = [], names = []) {
  for (const child of children ?? []) {
    names.push(child.name);
    if (child.children !== undefined) collectTree(child.children, leaves, names);
    else leaves.push(child);
  }
  return { leaves, names };
}

function compareBytes(actual, expected, label) {
  if (actual.length !== expected.length) {
    fail(`${label} byte length changed (${actual.length} != ${expected.length}).`);
  }
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expected[index]) {
      fail(
        `${label} differs at byte ${index} ` +
          `(actual ${actual[index]}, expected ${expected[index]}).`,
      );
    }
  }
}

function validateWrittenPsd(bytes, width, height, tree, expectedComposite) {
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
  compareBytes(
    parsed.imageData.data,
    simulateAgPsdCompositeRoundTrip(expectedComposite).data,
    "PSD composite",
  );

  const parsedTree = collectTree(parsed.children);
  const expectedNames = collectTree(tree.children).names;
  if (JSON.stringify(parsedTree.names) !== JSON.stringify(expectedNames)) {
    fail(
      `PSD_STRUCTURE_VALIDATION_FAILED: ` +
        `${JSON.stringify(parsedTree.names)} != ${JSON.stringify(expectedNames)}.`,
    );
  }
  assertUnique(parsedTree.names, "PSD layer/group names");
  if (parsedTree.leaves.length !== tree.expectedLeaves.length) {
    fail("PSD_LEAF_COUNT_VALIDATION_FAILED.");
  }
  const expectedByName = new Map(
    tree.expectedLeaves.map((layer) => [layer.name, layer.imageData]),
  );
  for (const layer of parsedTree.leaves) {
    const expected = expectedByName.get(layer.name);
    if (expected === undefined) fail(`PSD_UNEXPECTED_LEAF:${layer.name}`);
    if (
      layer.imageData === undefined ||
      layer.top !== 0 ||
      layer.left !== 0 ||
      layer.opacity !== 1 ||
      layer.blendMode !== "normal" ||
      layer.clipping === true ||
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
    leafCount: parsedTree.leaves.length,
    names: parsedTree.names,
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

async function writeMaterialPsd(filePath, width, height, tree) {
  const composite = compositeBottomToTop(width, height, tree.expectedLeaves);
  const bytes = writePsdBuffer(
    {
      width,
      height,
      channels: 4,
      bitsPerChannel: 8,
      colorMode: 3,
      imageData: cloneImageData(composite),
      children: tree.children,
    },
    {
      generateThumbnail: false,
      trimImageData: false,
      noBackground: true,
      compress: true,
    },
  );
  const validation = validateWrittenPsd(bytes, width, height, tree, composite);
  await atomicWrite(filePath, bytes);
  return { bytes, validation };
}

function buildManifest({
  config,
  configPath,
  configBytes,
  sourcePath,
  sourceBytes,
  analysis,
  materialPath,
  materialBytes,
  materialValidation,
}) {
  return {
    schemaVersion: 1,
    algorithm,
    assetId: config.assetId,
    status: "MATERIAL_SEPARATION_WORKBENCH_NOT_CUBISM_IMPORT",
    source: {
      path: projectRelative(sourcePath),
      sha256: sha256(sourceBytes),
      width: config.atlas.width,
      height: config.atlas.height,
      format: "RGBA_PNG_8_BIT",
    },
    configuration: {
      path: projectRelative(configPath),
      sha256: sha256(configBytes),
    },
    detection: analysis.detection,
    slots: analysis.slotReports,
    materialPsd: {
      path: projectRelative(materialPath),
      sha256: sha256(materialBytes),
      width: materialValidation.width,
      height: materialValidation.height,
      rasterLeafCount: materialValidation.leafCount,
      uniqueNamesValidated: true,
      pixelDataRoundTrip: "BYTE_FOR_BYTE_PASS",
      colorMode: "RGB",
      bitsPerChannel: 8,
      colorProfile: "UNTAGGED_BY_AG_PSD_REQUIRES_SRGB_AUTHORING_APP_RESAVE",
    },
    productionImport: {
      status: "BLOCKED_FAIL_CLOSED",
      outputWritten: false,
      blockers: config.productionImport.blockers,
    },
  };
}

export async function buildFromConfiguration(configPathValue, overrides = {}) {
  const configPath = resolveProjectPath(configPathValue);
  const configBytes = await readFile(configPath);
  const config = validateConfiguration(JSON.parse(configBytes.toString("utf8")));
  const sourcePath = resolveProjectPath(overrides.source ?? config.source.path);
  const sourceBytes = await readFile(sourcePath);
  const sourceHash = sha256(sourceBytes);
  if (sourceHash !== config.source.sha256) {
    fail(
      `SOURCE_SHA256_MISMATCH:${config.assetId}: expected ` +
        `${config.source.sha256}, got ${sourceHash}.`,
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
      `ATLAS_FORMAT_INVALID:${config.assetId}: expected ` +
        `${config.atlas.width}x${config.atlas.height} 8-bit RGBA PNG, got ` +
        `${decoded.width}x${decoded.height}, depth ${decoded.depth}, ` +
        `colorType ${decoded.colorType}.`,
    );
  }
  const sourceStats = imageStats(decoded);
  if (sourceStats.visiblePixels === 0 || sourceStats.transparentPixels === 0) {
    fail(`ATLAS_ALPHA_INVALID:${config.assetId}`);
  }

  const materialPath = resolveProjectPath(
    overrides.materialOutput ?? config.outputs.materialPsd,
  );
  const manifestPath = resolveProjectPath(
    overrides.manifestOutput ?? config.outputs.materialManifest,
  );
  const allPaths = [configPath, sourcePath, materialPath, manifestPath].map((value) =>
    path.resolve(value),
  );
  if (new Set(allPaths).size !== allPaths.length) {
    fail(`INPUT_OUTPUT_PATH_COLLISION:${config.assetId}`);
  }

  const analysis = analyzeAtlas(decoded, config);
  const tree = buildMaterialTree(config, analysis.layerSpecs);
  const material = await writeMaterialPsd(
    materialPath,
    decoded.width,
    decoded.height,
    tree,
  );
  const manifest = buildManifest({
    config,
    configPath,
    configBytes,
    sourcePath,
    sourceBytes,
    analysis,
    materialPath,
    materialBytes: material.bytes,
    materialValidation: material.validation,
  });
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await atomicWrite(manifestPath, manifestBytes);
  return {
    algorithm,
    assetId: config.assetId,
    status: "GENERATED_WORKBENCH_NOT_CUBISM_IMPORT",
    source: { path: projectRelative(sourcePath), sha256: sourceHash },
    materialPsd: {
      path: projectRelative(materialPath),
      sha256: sha256(material.bytes),
      rasterLeafCount: material.validation.leafCount,
      pixelDataRoundTrip: "BYTE_FOR_BYTE_PASS",
    },
    manifest: {
      path: projectRelative(manifestPath),
      sha256: sha256(manifestBytes),
    },
    detection: analysis.detection,
    productionImport: "BLOCKED_FAIL_CLOSED",
  };
}

export async function runBuild(options = {}) {
  if (options.config !== undefined) {
    return [await buildFromConfiguration(options.config)];
  }
  const requestedAsset = options.asset ?? "all";
  if (!new Set(["all", "hair", "cloth"]).has(requestedAsset)) {
    fail(`Unknown asset "${requestedAsset}". Expected all, hair, or cloth.`);
  }
  const assets = requestedAsset === "all" ? ["hair", "cloth"] : [requestedAsset];
  const results = [];
  for (const asset of assets) {
    const overrides =
      assets.length === 1
        ? {
            source: options.source,
            materialOutput: options.materialOutput,
            manifestOutput: options.manifestOutput,
          }
        : {};
    results.push(await buildFromConfiguration(defaultConfigurations[asset], overrides));
  }
  return results;
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const results = await runBuild({
    asset: arguments_.asset,
    config: arguments_.config,
    source: arguments_.source,
    materialOutput: arguments_["material-output"],
    manifestOutput: arguments_["manifest-output"],
  });
  process.stdout.write(`${JSON.stringify({ algorithm, results }, null, 2)}\n`);
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
