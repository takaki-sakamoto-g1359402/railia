import { createHash } from "node:crypto";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeCanvas, readPsd, type Layer } from "ag-psd";
import { PNG } from "pngjs";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(
  new URL("../scripts/build-riai-secondary-material-psds.mjs", import.meta.url),
);
const temporaryDirectories: string[] = [];

initializeCanvas(
  () => {
    throw new Error("Canvas rendering is disabled in PSD builder tests.");
  },
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    }) as ImageData,
);

function temporaryDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "riai-secondary-psd-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeSyntheticAtlas(filePath: string, orphan = false): string {
  const png = new PNG({ width: 96, height: 64, colorType: 6 });
  png.data.fill(0);
  const fill = (
    left: number,
    top: number,
    right: number,
    bottom: number,
    color: readonly [number, number, number, number],
  ) => {
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const offset = (y * png.width + x) * 4;
        png.data.set(color, offset);
      }
    }
  };
  fill(4, 4, 16, 16, [32, 96, 220, 255]);
  fill(36, 5, 50, 18, [236, 232, 248, 210]);
  fill(10, 41, 54, 55, [112, 118, 30, 255]);
  // The four exact edge specks are known matte-solver artifacts and must be
  // counted as explicit exclusions before slot assignment.
  fill(0, 0, 1, 1, [90, 250, 90, 1]);
  fill(95, 0, 96, 1, [90, 250, 90, 1]);
  fill(0, 63, 1, 64, [90, 250, 90, 1]);
  fill(95, 63, 96, 64, [90, 250, 90, 1]);
  if (orphan) fill(78, 25, 81, 28, [250, 80, 90, 8]);
  const bytes = PNG.sync.write(png, { colorType: 6 });
  writeFileSync(filePath, bytes);
  return sha256(bytes);
}

type Configuration = ReturnType<typeof makeConfiguration>;

function makeConfiguration(
  atlasPath: string,
  sourceHash: string,
  materialPath: string,
  manifestPath: string,
) {
  return {
    schemaVersion: 1,
    assetId: "riai_secondary_synthetic",
    status: "SYNTHETIC_TEST",
    source: { path: atlasPath, sha256: sourceHash },
    atlas: {
      width: 96,
      height: 64,
      seedAlphaExclusive: 16,
      minimumSeedArea: 4,
      expectedMainComponents: 3,
      connectivity: 8,
      requireEveryVisiblePixelAccounted: true,
      auditedDustPolicy: {
        mode: "reject_explicit_regions",
        maximumComponents: 4,
        maximumAreaPerComponent: 1,
        maximumTotalPixels: 4,
        allowedRegions: [
          [0, 0, 2, 2],
          [94, 0, 96, 2],
          [0, 62, 2, 64],
          [94, 62, 96, 64],
        ],
      },
    },
    material: {
      rootGroup: "riai_secondary_material_separation",
      categories: [
        { id: "parts", groupName: "riai_secondary_parts" },
        { id: "rejected", groupName: "riai_secondary_rejected" },
      ],
    },
    slots: [
      {
        id: "part_a",
        category: "parts",
        roi: [2, 2, 24, 24],
        materialName: "secondary_part_a",
        sourcePolicy: "include",
        productionIntegrity: "synthetic_candidate",
      },
      {
        id: "part_b",
        category: "parts",
        roi: [30, 2, 60, 24],
        materialName: "secondary_part_b",
        sourcePolicy: "include",
        productionIntegrity: "synthetic_candidate",
      },
      {
        id: "olive_chain",
        category: "rejected",
        roi: [2, 34, 70, 60],
        materialName: "secondary_olive_chain_rejected",
        sourcePolicy: "reject",
        rejectionReason: "synthetic_olive_chain_contamination",
        productionIntegrity: "rejected",
      },
    ],
    productionImport: {
      enabled: false,
      blockers: ["SYNTHETIC_IMPORT_DISABLED"],
    },
    outputs: {
      materialPsd: materialPath,
      materialManifest: manifestPath,
    },
  };
}

function writeConfiguration(filePath: string, configuration: Configuration): void {
  writeFileSync(filePath, `${JSON.stringify(configuration, null, 2)}\n`);
}

function runBuilder(configPath: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [scriptPath, `--config=${configPath}`], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

function expectSuccess(result: SpawnSyncReturns<string>): void {
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

function expectFailure(result: SpawnSyncReturns<string>, pattern: RegExp): void {
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(`${result.stderr}\n${result.stdout}`).toMatch(pattern);
}

function collectLeaves(children: Layer[] | undefined, leaves: Layer[] = []): Layer[] {
  for (const child of children ?? []) {
    if (child.children !== undefined) collectLeaves(child.children, leaves);
    else leaves.push(child);
  }
  return leaves;
}

function readLeaves(filePath: string): Layer[] {
  const parsed = readPsd(readFileSync(filePath), {
    useImageData: true,
    skipThumbnail: true,
    throwForMissingFeatures: true,
  });
  expect(parsed.width).toBe(96);
  expect(parsed.height).toBe(64);
  return collectLeaves(parsed.children);
}

function alphaAt(layer: Layer, x: number, y: number): number {
  if (layer.imageData === undefined) throw new Error("Expected raster layer.");
  return layer.imageData.data[(y * layer.imageData.width + x) * 4 + 3] ?? -1;
}

describe("Riai secondary-motion material PSD builder", () => {
  it("writes deterministic full-canvas layers while excluding the olive chain and edge dust", () => {
    const directory = temporaryDirectory();
    const atlasPath = path.join(directory, "atlas.png");
    const configPath = path.join(directory, "config.json");
    const materialPath = path.join(directory, "material_separation.psd");
    const manifestPath = path.join(directory, "material_separation.manifest.json");
    const sourceHash = writeSyntheticAtlas(atlasPath);
    writeConfiguration(
      configPath,
      makeConfiguration(atlasPath, sourceHash, materialPath, manifestPath),
    );

    const first = runBuilder(configPath);
    expectSuccess(first);
    const firstPsdHash = sha256(readFileSync(materialPath));
    const firstManifestHash = sha256(readFileSync(manifestPath));
    const second = runBuilder(configPath);
    expectSuccess(second);
    expect(sha256(readFileSync(materialPath))).toBe(firstPsdHash);
    expect(sha256(readFileSync(manifestPath))).toBe(firstManifestHash);

    const leaves = readLeaves(materialPath);
    expect(leaves.map(({ name }) => name).sort()).toEqual([
      "secondary_part_a__source",
      "secondary_part_b__source",
    ]);
    expect(leaves.every((layer) => layer.imageData?.width === 96)).toBe(true);
    expect(leaves.every((layer) => layer.imageData?.height === 64)).toBe(true);

    const partA = leaves.find(({ name }) => name === "secondary_part_a__source");
    const partB = leaves.find(({ name }) => name === "secondary_part_b__source");
    expect(partA).toBeDefined();
    expect(partB).toBeDefined();
    expect(alphaAt(partA!, 5, 5)).toBe(255);
    expect(alphaAt(partA!, 40, 10)).toBe(0);
    expect(alphaAt(partB!, 40, 10)).toBe(210);
    expect(alphaAt(partA!, 20, 45)).toBe(0);
    expect(alphaAt(partB!, 20, 45)).toBe(0);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.materialPsd.pixelDataRoundTrip).toBe("BYTE_FOR_BYTE_PASS");
    expect(manifest.materialPsd.rasterLeafCount).toBe(2);
    expect(manifest.detection.explicitlyRejectedDustPixels).toBe(4);
    expect(manifest.detection.accountedVisiblePixels).toBe(
      manifest.detection.visiblePixels,
    );
    const chain = manifest.slots.find(
      (slot: { id: string }) => slot.id === "olive_chain",
    );
    expect(chain.sourcePolicy).toBe("reject");
    expect(chain.includedInMaterialPsd).toBe(false);
    expect(chain.assignedVisiblePixels).toBe(44 * 14);
    expect(manifest.productionImport.status).toBe("BLOCKED_FAIL_CLOSED");
    expect(manifest.productionImport.outputWritten).toBe(false);
  });

  it("fails closed when an unmapped low-alpha component appears outside every slot", () => {
    const directory = temporaryDirectory();
    const atlasPath = path.join(directory, "atlas.png");
    const configPath = path.join(directory, "config.json");
    const materialPath = path.join(directory, "material.psd");
    const manifestPath = path.join(directory, "manifest.json");
    const sourceHash = writeSyntheticAtlas(atlasPath, true);
    writeConfiguration(
      configPath,
      makeConfiguration(atlasPath, sourceHash, materialPath, manifestPath),
    );

    const result = runBuilder(configPath);
    expectFailure(result, /VISIBLE_PIXEL_ASSIGNMENT_FAILED/);
    expect(existsSync(materialPath)).toBe(false);
    expect(existsSync(manifestPath)).toBe(false);
  });

  it("fails before writing outputs when the approved source hash changes", () => {
    const directory = temporaryDirectory();
    const atlasPath = path.join(directory, "atlas.png");
    const configPath = path.join(directory, "config.json");
    const materialPath = path.join(directory, "material.psd");
    const manifestPath = path.join(directory, "manifest.json");
    writeSyntheticAtlas(atlasPath);
    writeConfiguration(
      configPath,
      makeConfiguration(atlasPath, "0".repeat(64), materialPath, manifestPath),
    );

    const result = runBuilder(configPath);
    expectFailure(result, /SOURCE_SHA256_MISMATCH/);
    expect(existsSync(materialPath)).toBe(false);
    expect(existsSync(manifestPath)).toBe(false);
  });
});
