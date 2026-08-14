import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeCanvas, readPsd, writePsdBuffer } from "ag-psd";
import { PNG } from "pngjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const prototypeRoot = path.join(projectRoot, "art", "live2d", "prototype");
const importDirectory = path.join(prototypeRoot, "import");

// ag-psd's raw image-data reader still asks for an ImageData constructor for
// 8-bit RGBA. Supply only that constructor so validation never routes pixels
// through a premultiplied-alpha Canvas implementation.
initializeCanvas(
  () => {
    throw new Error("Canvas rendering is disabled for the PSD build pipeline.");
  },
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  }),
);

const assets = [
  {
    character: "riai",
    displayName: "Riai",
    input: path.join(
      prototypeRoot,
      "cutouts",
      "riai_poc_cutout_v001.png",
    ),
    output: path.join(importDirectory, "riai_poc_v001.psd"),
    layerName: "riai_poc_full",
  },
  {
    character: "noa",
    displayName: "Noa",
    input: path.join(
      prototypeRoot,
      "cutouts",
      "noa_poc_cutout_v001.png",
    ),
    output: path.join(importDirectory, "noa_poc_v001.psd"),
    layerName: "noa_poc_full",
  },
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function clonePixelData(decoded) {
  return {
    width: decoded.width,
    height: decoded.height,
    data: new Uint8ClampedArray(decoded.data),
  };
}

function validateDecodedPng(asset, decoded) {
  if (decoded.depth !== 8 || decoded.colorType !== 6) {
    throw new Error(
      `${asset.character}: expected an 8-bit RGBA PNG, got depth ${decoded.depth} and color type ${decoded.colorType}.`,
    );
  }

  let transparentPixels = 0;
  let opaquePixels = 0;
  for (let index = 3; index < decoded.data.length; index += 4) {
    const alpha = decoded.data[index];
    if (alpha === 0) transparentPixels += 1;
    if (alpha === 255) opaquePixels += 1;
  }
  if (transparentPixels === 0 || opaquePixels === 0) {
    throw new Error(
      `${asset.character}: the prototype requires both transparent and opaque pixels.`,
    );
  }
  return { transparentPixels, opaquePixels };
}

function makePsd(asset, decoded) {
  return {
    width: decoded.width,
    height: decoded.height,
    channels: 4,
    bitsPerChannel: 8,
    colorMode: 3,
    imageData: clonePixelData(decoded),
    children: [
      {
        name: asset.layerName,
        top: 0,
        left: 0,
        opacity: 1,
        hidden: false,
        blendMode: "normal",
        clipping: false,
        imageData: clonePixelData(decoded),
      },
    ],
  };
}

function validateWrittenPsd(
  asset,
  bytes,
  expectedWidth,
  expectedHeight,
  expectedBytes,
) {
  const expectedByteLength = expectedBytes.length;
  const parsed = readPsd(bytes, {
    useImageData: true,
    skipThumbnail: true,
    throwForMissingFeatures: true,
  });
  if (
    parsed.width !== expectedWidth ||
    parsed.height !== expectedHeight ||
    parsed.bitsPerChannel !== 8 ||
    parsed.colorMode !== 3
  ) {
    throw new Error(`${asset.character}: PSD header validation failed.`);
  }
  const layer = parsed.children?.[0];
  if (
    parsed.children?.length !== 1 ||
    layer?.name !== asset.layerName ||
    layer.children !== undefined ||
    layer.blendMode !== "normal" ||
    layer.clipping === true ||
    layer.imageData === undefined
  ) {
    throw new Error(`${asset.character}: PSD layer contract validation failed.`);
  }

  let hasTransparentPixel = false;
  let hasVisiblePixel = false;
  for (let index = 3; index < layer.imageData.data.length; index += 4) {
    const alpha = layer.imageData.data[index];
    hasTransparentPixel ||= alpha === 0;
    hasVisiblePixel ||= alpha > 0;
  }
  if (!hasTransparentPixel || !hasVisiblePixel) {
    throw new Error(`${asset.character}: PSD alpha validation failed.`);
  }
  if (layer.imageData.data.length !== expectedByteLength) {
    throw new Error(`${asset.character}: PSD layer byte length changed.`);
  }
  for (let index = 0; index < expectedByteLength; index += 1) {
    if (layer.imageData.data[index] !== expectedBytes[index]) {
      throw new Error(
        `${asset.character}: PSD layer pixel data differs at byte ${index}.`,
      );
    }
  }
}

await mkdir(importDirectory, { recursive: true });
const manifest = {
  status: "GENERATED_PROTOTYPE_NOT_CANONICAL_MASTER",
  generatedAt: new Date().toISOString(),
  generator: {
    library: "ag-psd",
    version: "31.0.2",
    compatibility: "UNGUARANTEED_UNTIL_CUBISM_EDITOR_IMPORT_SMOKE_TEST",
  },
  models: [],
};

for (const asset of assets) {
  const inputBytes = await readFile(asset.input);
  const decoded = PNG.sync.read(inputBytes, { skipRescale: true });
  const alpha = validateDecodedPng(asset, decoded);
  const psdBytes = writePsdBuffer(makePsd(asset, decoded), {
    generateThumbnail: false,
    trimImageData: false,
    noBackground: true,
    compress: false,
  });
  validateWrittenPsd(
    asset,
    psdBytes,
    decoded.width,
    decoded.height,
    decoded.data,
  );
  await writeFile(asset.output, psdBytes);

  manifest.models.push({
    character: asset.character,
    source: path.relative(projectRoot, asset.input),
    sourceSha256: sha256(inputBytes),
    psd: path.relative(projectRoot, asset.output),
    psdSha256: sha256(psdBytes),
    width: decoded.width,
    height: decoded.height,
    layerName: asset.layerName,
    transparentPixels: alpha.transparentPixels,
    opaquePixels: alpha.opaquePixels,
  });
}

const manifestPath = path.join(importDirectory, "prototype-psd-manifest.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
