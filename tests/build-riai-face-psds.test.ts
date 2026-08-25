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
  new URL("../scripts/build-riai-face-psds.mjs", import.meta.url),
);
const currentConfigPath = fileURLToPath(
  new URL(
    "../art/live2d/production-workbench/riai-face/config/riai-face-atlas-v002.json",
    import.meta.url,
  ),
);
const temporaryDirectories: string[] = [];

initializeCanvas(
  () => {
    throw new Error("Canvas rendering is disabled in PSD builder tests.");
  },
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  }) as ImageData,
);

function temporaryDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "riai-face-psd-test-"));
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

function makeAtlas(filePath: string, extraComponent = false): string {
  const png = new PNG({ width: 64, height: 48, colorType: 6 });
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
  fill(4, 4, 13, 13, [24, 80, 220, 255]);
  fill(24, 4, 33, 13, [220, 160, 30, 255]);
  // Deliberately green-contaminated atlas blush. The builder must audit and
  // reject these pixels, replacing them with the configured procedural layer.
  fill(44, 5, 57, 16, [190, 250, 170, 180]);
  if (extraComponent) fill(58, 38, 63, 44, [220, 30, 40, 255]);
  const bytes = PNG.sync.write(png, { colorType: 6 });
  writeFileSync(filePath, bytes);
  return sha256(bytes);
}

type TestConfiguration = ReturnType<typeof makeConfiguration>;

function makeConfiguration(
  atlasPath: string,
  sourceHash: string,
  importReady = false,
) {
  return {
    schemaVersion: 1,
    status: "SYNTHETIC_TEST",
    source: { path: atlasPath, sha256: sourceHash },
    atlas: {
      width: 64,
      height: 48,
      seedAlphaExclusive: 16,
      minimumSeedArea: 4,
      expectedMainComponents: 3,
      connectivity: 8,
      requireEveryVisiblePixelAccounted: true,
      unmappedVisiblePolicy: {
        mode: "reject_audited_dust",
        maximumComponents: 0,
        maximumAreaPerComponent: 0,
        maximumTotalPixels: 0,
        allowedRegions: [] as number[][],
      },
    },
    qa: {
      greenDominanceMargin: 20,
      greenCheckAlphaExclusive: 16,
      maximumGreenDominantPixelsPerIncludedSourceSlot: 0,
    },
    material: {
      rootGroup: "riai_face_material_separation",
      categories: [
        { id: "cheeks", groupName: "riai_face_cheeks" },
        { id: "parts", groupName: "riai_face_parts" },
      ],
    },
    slots: [
      {
        id: "part_a_slot",
        category: "parts",
        roi: [2, 2, 16, 16],
        materialName: "part_a_candidate",
        sourcePolicy: "include",
        productionIntegrity: importReady ? "approved" : "candidate_unapproved",
        importName: importReady ? "part_a" : null,
      },
      {
        id: "part_b_slot",
        category: "parts",
        roi: [20, 2, 36, 16],
        materialName: "part_b_candidate",
        sourcePolicy: "include",
        productionIntegrity: importReady ? "approved" : "candidate_unapproved",
        importName: importReady ? "part_b" : null,
      },
      {
        id: "blush_atlas_slot",
        category: "cheeks",
        roi: [40, 2, 60, 18],
        materialName: "blush_atlas_rejected",
        sourcePolicy: "reject",
        rejectionReason: "green_matte_contamination",
        replacementRequired: true,
        productionIntegrity: "rejected_green_fringe",
        importName: null,
      },
    ],
    proceduralLayers: [
      {
        id: "cheek_blush_procedural",
        enabled: true,
        category: "cheeks",
        replacesSlot: "blush_atlas_slot",
        materialName: "cheek_blush_procedural",
        importName: importReady ? "cheek_blush_l" : null,
        generator: {
          type: "elliptical_radial_v1",
          center: [50, 10],
          radius: [7, 4],
          color: [240, 120, 150],
          maximumAlpha: 80,
          falloffExponent: 1.5,
        },
      },
    ],
    sideMap: {
      status: importReady ? "approved" : "unresolved",
      slotA: importReady ? "r" : null,
      slotB: importReady ? "l" : null,
      requiredForImport: true,
    },
    targetPlacement: {
      status: importReady ? "approved" : "unresolved",
      mode: importReady ? "atlas_identity_approved" : "atlas_layout_only",
      requiredForImport: true,
    },
    importPolicy: {
      enabled: importReady,
      rootGroup: "riai",
      blockers: importReady ? [] : ["SYNTHETIC_IMPORT_DISABLED"],
    },
    outputs: {
      materialPsd: "unused-material.psd",
      materialManifest: "unused-material.json",
      importPsd: "unused-import.psd",
    },
  };
}

function writeConfiguration(
  filePath: string,
  configuration: TestConfiguration,
): void {
  writeFileSync(filePath, `${JSON.stringify(configuration, null, 2)}\n`);
}

function runBuilder(
  mode: "material" | "import" | "both",
  config: string,
  atlas: string,
  outputs: {
    readonly material: string;
    readonly manifest: string;
    readonly importPsd: string;
  },
): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      `--mode=${mode}`,
      `--config=${config}`,
      `--atlas=${atlas}`,
      `--material-output=${outputs.material}`,
      `--manifest-output=${outputs.manifest}`,
      `--import-output=${outputs.importPsd}`,
    ],
    { encoding: "utf8", timeout: 30_000 },
  );
}

function expectSuccess(result: SpawnSyncReturns<string>): void {
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

function expectFailure(
  result: SpawnSyncReturns<string>,
  expected: RegExp,
): void {
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(`${result.stderr}\n${result.stdout}`).toMatch(expected);
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
  return collectLeaves(parsed.children);
}

function greenDominantPixels(layer: Layer): number {
  if (layer.imageData === undefined) throw new Error("Expected raster layer.");
  let count = 0;
  for (let offset = 0; offset < layer.imageData.data.length; offset += 4) {
    const red = layer.imageData.data[offset]!;
    const green = layer.imageData.data[offset + 1]!;
    const blue = layer.imageData.data[offset + 2]!;
    const alpha = layer.imageData.data[offset + 3]!;
    if (alpha > 16 && green - Math.max(red, blue) > 20) count += 1;
  }
  return count;
}

describe("Riai face component PSD builder", () => {
  it("writes a deterministic material PSD, rejects atlas blush, and round-trips raster pixels", () => {
    const directory = temporaryDirectory();
    const atlas = path.join(directory, "atlas.png");
    const config = path.join(directory, "config.json");
    const material = path.join(directory, "riai_material_separation.psd");
    const manifest = path.join(directory, "riai_material_separation.manifest.json");
    const importPsd = path.join(directory, "riai_import.psd");
    const sourceHash = makeAtlas(atlas);
    writeConfiguration(config, makeConfiguration(atlas, sourceHash));

    const first = runBuilder("material", config, atlas, {
      material,
      manifest,
      importPsd,
    });
    expectSuccess(first);
    const firstHash = sha256(readFileSync(material));
    const second = runBuilder("material", config, atlas, {
      material,
      manifest,
      importPsd,
    });
    expectSuccess(second);
    expect(sha256(readFileSync(material))).toBe(firstHash);

    const leaves = readLeaves(material);
    expect(leaves.map(({ name }) => name).sort()).toEqual([
      "cheek_blush_procedural__procedural",
      "part_a_candidate__source",
      "part_b_candidate__source",
    ]);
    expect(leaves.every((layer) => greenDominantPixels(layer) === 0)).toBe(true);

    const report = JSON.parse(readFileSync(manifest, "utf8"));
    const rejected = report.slots.find(
      (slot: { id: string }) => slot.id === "blush_atlas_slot",
    );
    expect(rejected.sourcePolicy).toBe("reject");
    expect(rejected.includedInMaterialPsd).toBe(false);
    expect(rejected.greenDominantPixels).toBeGreaterThan(0);
    expect(report.proceduralLayers).toHaveLength(1);
    expect(report.materialPsd.pixelDataRoundTrip).toBe("BYTE_FOR_BYTE_PASS");
    expect(report.detection.accountedVisiblePixels).toBe(
      report.detection.visiblePixels,
    );
    expect(existsSync(importPsd)).toBe(false);
  });

  it("fails closed without touching an import output when production gates are blocked", () => {
    const directory = temporaryDirectory();
    const atlas = path.join(directory, "atlas.png");
    const config = path.join(directory, "config.json");
    const outputs = {
      material: path.join(directory, "material.psd"),
      manifest: path.join(directory, "manifest.json"),
      importPsd: path.join(directory, "riai_import.psd"),
    };
    const sourceHash = makeAtlas(atlas);
    writeConfiguration(config, makeConfiguration(atlas, sourceHash));

    const result = runBuilder("import", config, atlas, outputs);
    expectFailure(result, /PRODUCTION_IMPORT_BLOCKED/);
    expect(existsSync(outputs.importPsd)).toBe(false);
    expect(existsSync(outputs.material)).toBe(false);
  });

  it("can write and validate an import PSD only with every explicit gate approved", () => {
    const directory = temporaryDirectory();
    const atlas = path.join(directory, "atlas.png");
    const config = path.join(directory, "config.json");
    const outputs = {
      material: path.join(directory, "material.psd"),
      manifest: path.join(directory, "manifest.json"),
      importPsd: path.join(directory, "riai_import.psd"),
    };
    const sourceHash = makeAtlas(atlas);
    writeConfiguration(config, makeConfiguration(atlas, sourceHash, true));

    const result = runBuilder("import", config, atlas, outputs);
    expectSuccess(result);
    expect(readLeaves(outputs.importPsd).map(({ name }) => name).sort()).toEqual([
      "cheek_blush_l",
      "part_a",
      "part_b",
    ]);
  });

  it("rejects an unexpected semantic-sized component outside every declared ROI", () => {
    const directory = temporaryDirectory();
    const atlas = path.join(directory, "atlas.png");
    const config = path.join(directory, "config.json");
    const outputs = {
      material: path.join(directory, "material.psd"),
      manifest: path.join(directory, "manifest.json"),
      importPsd: path.join(directory, "import.psd"),
    };
    const sourceHash = makeAtlas(atlas, true);
    writeConfiguration(config, makeConfiguration(atlas, sourceHash));

    const result = runBuilder("material", config, atlas, outputs);
    expectFailure(result, /COMPONENT_COUNT_MISMATCH/);
    expect(existsSync(outputs.material)).toBe(false);
  });

  it("keeps the checked-in Riai import gate closed", () => {
    const directory = temporaryDirectory();
    const output = path.join(directory, "must-not-exist.psd");
    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        "--mode=import",
        `--config=${currentConfigPath}`,
        `--import-output=${output}`,
      ],
      { encoding: "utf8", timeout: 30_000 },
    );
    expectFailure(result, /FUSED_EYE_WHITE_AND_LID_COMPONENTS/);
    expect(existsSync(output)).toBe(false);
  });
});
