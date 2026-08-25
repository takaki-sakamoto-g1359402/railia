import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeCanvas, readPsd, writePsdBuffer } from "ag-psd";
import { PNG } from "pngjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const workbenchRoot = path.join(
  projectRoot,
  "art",
  "live2d",
  "production-workbench",
  "riai-face",
);
const outputDirectory = path.join(workbenchRoot, "stage");
const faceBasePath = path.join(
  workbenchRoot,
  "cutouts",
  "riai_face_base_patch_rgba_v002.png",
);
const partsAtlasPath = path.join(
  workbenchRoot,
  "cutouts",
  "riai_face_parts_rgba_v002.png",
);

const canvas = { width: 1254, height: 1254 };
const outputPsdPath = path.join(
  outputDirectory,
  "riai_face_stage_import_WORKBENCH_v001.psd",
);
const outputPreviewPath = path.join(
  outputDirectory,
  "riai_face_stage_neutral_preview_v001.png",
);
const expressionPreviewDirectory = path.join(outputDirectory, "expressions");
const outputManifestPath = path.join(
  outputDirectory,
  "riai-face-stage-manifest-v001.json",
);

// Components are tight atlas rectangles observed after the alpha solver. Slots
// A/B are converted to anatomical names explicitly: viewer-left is Riai's R,
// viewer-right is Riai's L.
const components = {
  eye_white_r: [96, 146, 146, 107],
  eye_white_l: [343, 146, 145, 107],
  iris_r: [568, 148, 95, 107],
  iris_l: [757, 156, 91, 102],
  upper_lash_r: [951, 165, 199, 44],
  upper_lash_l: [1221, 169, 181, 42],
  lower_lid_r: [973, 296, 136, 24],
  lower_lid_l: [1220, 296, 134, 24],
  eyebrow_r: [83, 431, 169, 37],
  eyebrow_l: [355, 431, 171, 37],
  closed_lid_r: [913, 474, 176, 29],
  closed_lid_l: [1220, 474, 168, 29],
  nose: [680, 499, 28, 53],
  mouth_smile: [422, 659, 96, 15],
  mouth_neutral: [180, 662, 86, 5],
  mouth_upper: [747, 647, 84, 24],
  mouth_lower: [761, 715, 59, 23],
  mouth_inner: [152, 783, 173, 120],
  tongue: [445, 793, 107, 105],
  teeth_upper: [689, 828, 144, 23],
};

const placements = [
  { name: "FaceBase", source: "face_base", x: 0, y: 0, w: 1254, h: 1254 },
  { name: "EyeWhite_R", source: "eye_white_r", x: 356, y: 458, w: 188, h: 138 },
  { name: "Iris_R", source: "iris_r", x: 398, y: 468, w: 116, h: 131 },
  { name: "EyeUpperLash_R", source: "upper_lash_r", x: 342, y: 446, w: 220, h: 49 },
  { name: "EyeLowerLid_R", source: "lower_lid_r", x: 372, y: 578, w: 168, h: 30 },
  { name: "EyeClosed_R", source: "closed_lid_r", x: 350, y: 520, w: 208, h: 34, hidden: true },
  { name: "Eyebrow_R", source: "eyebrow_r", x: 353, y: 382, w: 194, h: 43 },
  { name: "EyeWhite_L", source: "eye_white_l", x: 710, y: 458, w: 188, h: 138 },
  { name: "Iris_L", source: "iris_l", x: 744, y: 468, w: 116, h: 131 },
  { name: "EyeUpperLash_L", source: "upper_lash_l", x: 695, y: 446, w: 220, h: 51 },
  { name: "EyeLowerLid_L", source: "lower_lid_l", x: 714, y: 578, w: 168, h: 30 },
  { name: "EyeClosed_L", source: "closed_lid_l", x: 696, y: 520, w: 208, h: 36, hidden: true },
  { name: "Eyebrow_L", source: "eyebrow_l", x: 704, y: 382, w: 196, h: 43 },
  { name: "Nose", source: "nose", x: 613, y: 634, w: 28, h: 53 },
  { name: "Cheek_R", source: "procedural_blush", x: 304, y: 655, w: 190, h: 90 },
  { name: "Cheek_L", source: "procedural_blush", x: 760, y: 655, w: 190, h: 90 },
  { name: "MouthNeutral", source: "mouth_neutral", x: 584, y: 766, w: 86, h: 8 },
  { name: "MouthSmile", source: "mouth_smile", x: 579, y: 752, w: 96, h: 15, hidden: true },
  { name: "MouthUpper", source: "mouth_upper", x: 585, y: 749, w: 84, h: 24, hidden: true },
  { name: "MouthInner", source: "mouth_inner", x: 558, y: 758, w: 138, h: 96, hidden: true },
  { name: "TeethUpper", source: "teeth_upper", x: 568, y: 765, w: 118, h: 19, hidden: true },
  { name: "Tongue", source: "tongue", x: 584, y: 806, w: 86, h: 84, hidden: true },
  { name: "MouthLower", source: "mouth_lower", x: 596, y: 848, w: 59, h: 23, hidden: true },
];

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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function emptyImageData(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function crop(decoded, rectangle, padding = 8) {
  const [x, y, width, height] = rectangle;
  const left = Math.max(0, x - padding);
  const top = Math.max(0, y - padding);
  const right = Math.min(decoded.width, x + width + padding);
  const bottom = Math.min(decoded.height, y + height + padding);
  const out = emptyImageData(right - left, bottom - top);
  for (let oy = 0; oy < out.height; oy += 1) {
    for (let ox = 0; ox < out.width; ox += 1) {
      const sourceOffset = ((top + oy) * decoded.width + left + ox) * 4;
      const targetOffset = (oy * out.width + ox) * 4;
      out.data.set(decoded.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return out;
}

function samplePremultiplied(source, x, y) {
  const sx = Math.max(0, Math.min(source.width - 1, x));
  const sy = Math.max(0, Math.min(source.height - 1, y));
  const offset = (sy * source.width + sx) * 4;
  const alpha = source.data[offset + 3] / 255;
  return [
    source.data[offset] * alpha,
    source.data[offset + 1] * alpha,
    source.data[offset + 2] * alpha,
    alpha,
  ];
}

function resample(source, width, height) {
  if (source.width === width && source.height === height) {
    return {
      width,
      height,
      data: new Uint8ClampedArray(source.data),
    };
  }
  const out = emptyImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = ((y + 0.5) * source.height) / height - 0.5;
    const y0 = Math.floor(sourceY);
    const y1 = y0 + 1;
    const fy = sourceY - y0;
    for (let x = 0; x < width; x += 1) {
      const sourceX = ((x + 0.5) * source.width) / width - 0.5;
      const x0 = Math.floor(sourceX);
      const x1 = x0 + 1;
      const fx = sourceX - x0;
      const samples = [
        [samplePremultiplied(source, x0, y0), (1 - fx) * (1 - fy)],
        [samplePremultiplied(source, x1, y0), fx * (1 - fy)],
        [samplePremultiplied(source, x0, y1), (1 - fx) * fy],
        [samplePremultiplied(source, x1, y1), fx * fy],
      ];
      let premultipliedR = 0;
      let premultipliedG = 0;
      let premultipliedB = 0;
      let alpha = 0;
      for (const [sample, weight] of samples) {
        premultipliedR += sample[0] * weight;
        premultipliedG += sample[1] * weight;
        premultipliedB += sample[2] * weight;
        alpha += sample[3] * weight;
      }
      const targetOffset = (y * width + x) * 4;
      if (alpha > 0) {
        out.data[targetOffset] = Math.round(premultipliedR / alpha);
        out.data[targetOffset + 1] = Math.round(premultipliedG / alpha);
        out.data[targetOffset + 2] = Math.round(premultipliedB / alpha);
        out.data[targetOffset + 3] = Math.round(alpha * 255);
      }
    }
  }
  return out;
}

function makeBlush(width, height) {
  const out = emptyImageData(width, height);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x - centerX) / (width * 0.5);
      const ny = (y - centerY) / (height * 0.5);
      const radial = Math.sqrt(nx * nx + ny * ny);
      const softness = Math.max(0, Math.min(1, (1 - radial) / 0.65));
      const alpha = Math.round(72 * softness * softness);
      const offset = (y * width + x) * 4;
      out.data[offset] = 246;
      out.data[offset + 1] = 132;
      out.data[offset + 2] = 152;
      out.data[offset + 3] = alpha;
    }
  }
  return out;
}

function placeOnCanvas(source, placement) {
  const layer = emptyImageData(canvas.width, canvas.height);
  const resized = resample(source, placement.w, placement.h);
  for (let y = 0; y < resized.height; y += 1) {
    const targetY = placement.y + y;
    if (targetY < 0 || targetY >= canvas.height) continue;
    for (let x = 0; x < resized.width; x += 1) {
      const targetX = placement.x + x;
      if (targetX < 0 || targetX >= canvas.width) continue;
      const sourceOffset = (y * resized.width + x) * 4;
      const targetOffset = (targetY * canvas.width + targetX) * 4;
      layer.data.set(resized.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return layer;
}

function sourceOver(destination, source) {
  for (let offset = 0; offset < destination.data.length; offset += 4) {
    const sourceAlpha = source.data[offset + 3] / 255;
    if (sourceAlpha === 0) continue;
    const destinationAlpha = destination.data[offset + 3] / 255;
    const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    for (let channel = 0; channel < 3; channel += 1) {
      const sourceValue = source.data[offset + channel] / 255;
      const destinationValue = destination.data[offset + channel] / 255;
      destination.data[offset + channel] = Math.round(
        ((sourceValue * sourceAlpha +
          destinationValue * destinationAlpha * (1 - sourceAlpha)) /
          outputAlpha) *
          255,
      );
    }
    destination.data[offset + 3] = Math.round(outputAlpha * 255);
  }
}

function cloneImageData(imageData) {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data),
  };
}

function assertUniqueNames(layers) {
  const names = new Set();
  for (const layer of layers) {
    if (names.has(layer.name)) throw new Error(`Duplicate layer name: ${layer.name}`);
    names.add(layer.name);
  }
}

function renderVariant(layersToRender, { show = [], hide = [] } = {}) {
  const forcedVisible = new Set(show);
  const forcedHidden = new Set(hide);
  const result = emptyImageData(canvas.width, canvas.height);
  for (const layer of layersToRender) {
    const visible = forcedHidden.has(layer.name)
      ? false
      : forcedVisible.has(layer.name)
        ? true
        : !layer.hidden;
    if (visible) sourceOver(result, layer.imageData);
  }
  return result;
}

function encodePng(imageData) {
  const png = new PNG({ width: imageData.width, height: imageData.height });
  png.data = Buffer.from(imageData.data);
  return PNG.sync.write(png, { colorType: 6, bitDepth: 8 });
}

if (process.argv.includes("--production")) {
  throw new Error(
    "Production import intentionally blocked: eye-white/lid fusion and baked iris highlights require clean redrawing first.",
  );
}

const [faceBaseBytes, partsAtlasBytes] = await Promise.all([
  readFile(faceBasePath),
  readFile(partsAtlasPath),
]);
const faceBase = PNG.sync.read(faceBaseBytes, { skipRescale: true });
const partsAtlas = PNG.sync.read(partsAtlasBytes, { skipRescale: true });
if (faceBase.depth !== 8 || faceBase.colorType !== 6) {
  throw new Error("Face base must be an 8-bit RGBA PNG.");
}
if (partsAtlas.depth !== 8 || partsAtlas.colorType !== 6) {
  throw new Error("Parts atlas must be an 8-bit RGBA PNG.");
}

const componentImages = Object.fromEntries(
  Object.entries(components).map(([name, rectangle]) => [
    name,
    crop(partsAtlas, rectangle),
  ]),
);
const layers = placements.map((placement) => {
  let source;
  if (placement.source === "face_base") source = faceBase;
  else if (placement.source === "procedural_blush") {
    source = makeBlush(placement.w, placement.h);
  } else source = componentImages[placement.source];
  if (!source) throw new Error(`Unknown source: ${placement.source}`);
  return {
    name: placement.name,
    hidden: placement.hidden === true,
    imageData: placeOnCanvas(source, placement),
  };
});
assertUniqueNames(layers);

const expressionDefinitions = {
  neutral: {},
  soft_smile: {
    show: ["MouthSmile"],
    hide: ["MouthNeutral"],
  },
  blink_smile: {
    show: ["EyeClosed_R", "EyeClosed_L", "MouthSmile"],
    hide: [
      "EyeWhite_R",
      "Iris_R",
      "EyeUpperLash_R",
      "EyeLowerLid_R",
      "EyeWhite_L",
      "Iris_L",
      "EyeUpperLash_L",
      "EyeLowerLid_L",
      "MouthNeutral",
    ],
  },
  open_happy: {
    show: ["MouthInner", "TeethUpper"],
    hide: ["MouthNeutral"],
  },
};
const expressionImages = Object.fromEntries(
  Object.entries(expressionDefinitions).map(([name, definition]) => [
    name,
    renderVariant(layers, definition),
  ]),
);
const composite = expressionImages.neutral;

const psd = {
  width: canvas.width,
  height: canvas.height,
  channels: 4,
  bitsPerChannel: 8,
  colorMode: 3,
  imageData: cloneImageData(composite),
  children: [...layers]
    .reverse()
    .map((layer) => ({
      name: layer.name,
      top: 0,
      left: 0,
      opacity: 1,
      hidden: layer.hidden,
      blendMode: "normal",
      clipping: false,
      imageData: cloneImageData(layer.imageData),
    })),
};
const psdBytes = writePsdBuffer(psd, {
  generateThumbnail: false,
  trimImageData: false,
  noBackground: true,
  compress: false,
});
const parsed = readPsd(psdBytes, {
  useImageData: true,
  skipThumbnail: true,
  throwForMissingFeatures: true,
});
if (
  parsed.width !== canvas.width ||
  parsed.height !== canvas.height ||
  parsed.bitsPerChannel !== 8 ||
  parsed.colorMode !== 3 ||
  parsed.children?.length !== layers.length
) {
  throw new Error("PSD round-trip header or layer-count validation failed.");
}
const expectedNames = [...layers].reverse().map((layer) => layer.name);
const parsedNames = parsed.children.map((layer) => layer.name);
if (JSON.stringify(parsedNames) !== JSON.stringify(expectedNames)) {
  throw new Error("PSD round-trip changed layer names or order.");
}
for (const layer of parsed.children) {
  if (layer.imageData === undefined || layer.blendMode !== "normal") {
    throw new Error(`PSD round-trip damaged layer: ${layer.name}`);
  }
}

await Promise.all([
  mkdir(outputDirectory, { recursive: true }),
  mkdir(expressionPreviewDirectory, { recursive: true }),
]);
const previewBytes = encodePng(composite);
const expressionPreviewOutputs = Object.fromEntries(
  Object.entries(expressionImages).map(([name, imageData]) => {
    const outputPath = path.join(
      expressionPreviewDirectory,
      `riai_face_stage_${name}_v001.png`,
    );
    return [name, { outputPath, bytes: encodePng(imageData) }];
  }),
);
await Promise.all([
  writeFile(outputPsdPath, psdBytes),
  writeFile(outputPreviewPath, previewBytes),
  ...Object.values(expressionPreviewOutputs).map(({ outputPath, bytes }) =>
    writeFile(outputPath, bytes),
  ),
]);

const manifest = {
  status: "WORKBENCH_NOT_PRODUCTION_IMPORT",
  generatedAt: new Date().toISOString(),
  canvas,
  sources: {
    faceBase: path.relative(projectRoot, faceBasePath),
    faceBaseSha256: sha256(faceBaseBytes),
    partsAtlas: path.relative(projectRoot, partsAtlasPath),
    partsAtlasSha256: sha256(partsAtlasBytes),
  },
  outputs: {
    psd: path.relative(projectRoot, outputPsdPath),
    psdSha256: sha256(psdBytes),
    preview: path.relative(projectRoot, outputPreviewPath),
    previewSha256: sha256(previewBytes),
    expressionPreviews: Object.fromEntries(
      Object.entries(expressionPreviewOutputs).map(
        ([name, { outputPath, bytes }]) => [
          name,
          {
            path: path.relative(projectRoot, outputPath),
            sha256: sha256(bytes),
          },
        ],
      ),
    ),
  },
  sideConvention: "viewer-left=Riai anatomical R; viewer-right=Riai anatomical L",
  layers: placements.map(({ name, source, x, y, w, h, hidden = false }) => ({
    name,
    source,
    x,
    y,
    width: w,
    height: h,
    hidden,
  })),
  blockedForProduction: [
    "Eye whites contain fused upper-lid line art.",
    "Iris composites contain baked pupil and highlights.",
    "Generated atlas blush components were rejected for green halos and replaced procedurally.",
    "Strict sRGB ICC tagging requires a compatible painting application re-save.",
  ],
};
await writeFile(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
