import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { initializeCanvas, readPsd } from "ag-psd";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const stageRoot = path.join(
  projectRoot,
  "art",
  "live2d",
  "production-workbench",
  "riai-face",
  "stage",
);

initializeCanvas(
  () => {
    throw new Error("Canvas rendering is disabled in PSD contract tests.");
  },
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  }) as ImageData,
);

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("Riai facial rig workbench stage", () => {
  it("round-trips the documented one-raster-per-part PSD contract", () => {
    const manifest = JSON.parse(
      readFileSync(
        path.join(stageRoot, "riai-face-stage-manifest-v001.json"),
        "utf8",
      ),
    );
    expect(manifest.status).toBe("WORKBENCH_NOT_PRODUCTION_IMPORT");
    expect(manifest.sideConvention).toContain("viewer-left=Riai anatomical R");
    expect(manifest.blockedForProduction).toHaveLength(4);

    const psdBytes = readFileSync(
      path.join(stageRoot, "riai_face_stage_import_WORKBENCH_v001.psd"),
    );
    expect(sha256(psdBytes)).toBe(manifest.outputs.psdSha256);
    const parsed = readPsd(psdBytes, {
      useImageData: true,
      skipThumbnail: true,
      throwForMissingFeatures: true,
    });
    expect(parsed.width).toBe(1254);
    expect(parsed.height).toBe(1254);
    expect(parsed.bitsPerChannel).toBe(8);
    expect(parsed.colorMode).toBe(3);

    const children = parsed.children ?? [];
    expect(children).toHaveLength(23);
    expect(new Set(children.map((layer) => layer.name)).size).toBe(23);
    for (const child of children) {
      expect(child.children).toBeUndefined();
      expect(child.imageData).toBeDefined();
      expect(child.blendMode).toBe("normal");
      expect(child.clipping).not.toBe(true);
    }

    expect(children.find((layer) => layer.name === "EyeClosed_L")?.hidden).toBe(
      true,
    );
    expect(children.find((layer) => layer.name === "EyeWhite_L")?.hidden).toBe(
      false,
    );
    expect(children.map((layer) => layer.name)).toEqual(
      expect.arrayContaining([
        "FaceBase",
        "Iris_L",
        "Iris_R",
        "Eyebrow_L",
        "Eyebrow_R",
        "Cheek_L",
        "Cheek_R",
        "MouthNeutral",
        "MouthSmile",
        "MouthInner",
      ]),
    );
  });

  it("keeps every expression preview content-addressed", () => {
    const manifest = JSON.parse(
      readFileSync(
        path.join(stageRoot, "riai-face-stage-manifest-v001.json"),
        "utf8",
      ),
    );
    expect(Object.keys(manifest.outputs.expressionPreviews).sort()).toEqual([
      "blink_smile",
      "neutral",
      "open_happy",
      "soft_smile",
    ]);
    for (const output of Object.values(
      manifest.outputs.expressionPreviews,
    ) as Array<{ path: string; sha256: string }>) {
      const bytes = readFileSync(path.join(projectRoot, output.path));
      expect(sha256(bytes)).toBe(output.sha256);
    }
  });

  it("fails closed when production output is requested", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(projectRoot, "scripts", "build-riai-face-stage.mjs"), "--production"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Production import intentionally blocked");
  });
});
