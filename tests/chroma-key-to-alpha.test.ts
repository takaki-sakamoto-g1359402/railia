import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";

import { PNG } from "pngjs";
import { afterEach, describe, expect, it } from "vitest";

type Rgb = readonly [red: number, green: number, blue: number];

interface RampSample {
  readonly alpha: number;
  readonly x: number;
  readonly y: number;
}

interface RampFixture {
  readonly width: number;
  readonly height: number;
  readonly samples: ReadonlyMap<string, readonly RampSample[]>;
  readonly opaqueSamples: ReadonlyMap<string, { readonly color: Rgb; readonly x: number; readonly y: number }>;
}

const scriptPath = fileURLToPath(
  new URL("../scripts/chroma-key-to-alpha.mjs", import.meta.url),
);
const greenScreen: Rgb = [0, 255, 0];
const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "chroma-key-to-alpha-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function composite(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  return [
    Math.round(foreground[0] * alpha + background[0] * (1 - alpha)),
    Math.round(foreground[1] * alpha + background[1] * (1 - alpha)),
    Math.round(foreground[2] * alpha + background[2] * (1 - alpha)),
  ];
}

function createPng(
  width: number,
  height: number,
  pixelAt: (x: number, y: number) => Rgb,
): PNG {
  const png = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue] = pixelAt(x, y);
      png.data[offset] = red;
      png.data[offset + 1] = green;
      png.data[offset + 2] = blue;
      png.data[offset + 3] = 255;
    }
  }
  return png;
}

function writeRgbPng(filePath: string, png: PNG): void {
  // pngjs always exposes decoded pixels as RGBA. colorType=2 is what makes the
  // encoded fixture an opaque RGB source without an alpha channel.
  writeFileSync(filePath, PNG.sync.write(png, { colorType: 2 }));
  expect(PNG.sync.read(readFileSync(filePath)).colorType).toBe(2);
}

function pixel(png: PNG, x: number, y: number): readonly [number, number, number, number] {
  const offset = (y * png.width + x) * 4;
  return [
    png.data[offset]!,
    png.data[offset + 1]!,
    png.data[offset + 2]!,
    png.data[offset + 3]!,
  ];
}

function runConverter(
  input: string,
  output: string,
  extraArguments: readonly string[] = [],
): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [scriptPath, `--input=${input}`, `--output=${output}`, ...extraArguments],
    {
      encoding: "utf8",
      timeout: 20_000,
    },
  );
}

function expectSuccess(result: SpawnSyncReturns<string>): void {
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

function expectFailure(result: SpawnSyncReturns<string>, message: RegExp): void {
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(`${result.stderr}\n${result.stdout}`).toMatch(message);
}

function buildRampFixture(filePath: string): RampFixture {
  const width = 220;
  const height = 112;
  const patchTop = 38;
  const patchHeight = 36;
  const bandWidth = 4;
  const alphaLevels = [1, 0.8, 0.6, 0.4, 0.2] as const;
  const colors = [
    ["black", [0, 0, 0]],
    ["navy", [7, 18, 48]],
    ["blue", [18, 76, 224]],
    ["gold", [212, 157, 34]],
    ["white", [246, 246, 250]],
    ["skin", [235, 174, 146]],
    ["pink", [239, 128, 181]],
  ] as const satisfies readonly (readonly [string, Rgb])[];

  const samples = new Map<string, RampSample[]>();
  const opaqueSamples = new Map<
    string,
    { readonly color: Rgb; readonly x: number; readonly y: number }
  >();
  const patches = colors.map(([name, color], colorIndex) => {
    const left = 18 + colorIndex * 29;
    samples.set(
      name,
      alphaLevels.map((alpha, band) => ({
        alpha,
        x: left + band * bandWidth + Math.floor(bandWidth / 2),
        y: patchTop + Math.floor(patchHeight / 2),
      })),
    );
    opaqueSamples.set(name, {
      color,
      x: left + Math.floor(bandWidth / 2),
      y: patchTop + Math.floor(patchHeight / 2),
    });
    return { color, left };
  });

  const source = createPng(width, height, (x, y) => {
    if (y < patchTop || y >= patchTop + patchHeight) return greenScreen;
    for (const patch of patches) {
      const localX = x - patch.left;
      if (localX < 0 || localX >= bandWidth * alphaLevels.length) continue;
      const band = Math.floor(localX / bandWidth);
      return composite(patch.color, greenScreen, alphaLevels[band]!);
    }
    return greenScreen;
  });
  writeRgbPng(filePath, source);
  return { width, height, samples, opaqueSamples };
}

describe("chroma-key-to-alpha trimap conversion", () => {
  it("recovers monotonic black, navy, blue, gold, white, skin and pink alpha ramps", () => {
    const directory = temporaryDirectory();
    const input = path.join(directory, "ramps-rgb.png");
    const output = path.join(directory, "ramps-rgba.png");
    const fixture = buildRampFixture(input);

    const result = runConverter(input, output);
    expectSuccess(result);
    const converted = PNG.sync.read(readFileSync(output), { skipRescale: true });

    for (const [name, samples] of fixture.samples) {
      const actualAlphas = samples.map(({ x, y }) => pixel(converted, x, y)[3]);
      expect(actualAlphas, `${name} alpha ramp`).toEqual(
        [...actualAlphas].sort((left, right) => right - left),
      );
      for (let index = 0; index < samples.length; index += 1) {
        const sample = samples[index]!;
        expect(actualAlphas[index]!, `${name} alpha=${sample.alpha}`).toBeCloseTo(
          sample.alpha * 255,
          -1,
        );
      }

      const opaque = fixture.opaqueSamples.get(name);
      expect(opaque).toBeDefined();
      const [red, green, blue, alpha] = pixel(converted, opaque!.x, opaque!.y);
      expect(alpha).toBe(255);
      expect(red).toBeCloseTo(opaque!.color[0], 0);
      expect(green).toBeCloseTo(opaque!.color[1], 0);
      expect(blue).toBeCloseTo(opaque!.color[2], 0);
    }
  });

  it("preserves detached tiny blue and gold ornaments instead of deleting small components", () => {
    const directory = temporaryDirectory();
    const input = path.join(directory, "ornaments-rgb.png");
    const output = path.join(directory, "ornaments-rgba.png");
    const ornaments = [
      { color: [26, 92, 238] as const, left: 25, top: 28, width: 2, height: 2 },
      { color: [218, 163, 37] as const, left: 126, top: 72, width: 3, height: 1 },
    ];
    const source = createPng(160, 112, (x, y) => {
      if (x >= 58 && x < 103 && y >= 38 && y < 79) return [7, 18, 48];
      for (const ornament of ornaments) {
        if (
          x >= ornament.left &&
          x < ornament.left + ornament.width &&
          y >= ornament.top &&
          y < ornament.top + ornament.height
        ) {
          return ornament.color;
        }
      }
      return greenScreen;
    });
    writeRgbPng(input, source);

    const result = runConverter(input, output);
    expectSuccess(result);
    const converted = PNG.sync.read(readFileSync(output));
    for (const ornament of ornaments) {
      for (let y = ornament.top; y < ornament.top + ornament.height; y += 1) {
        for (let x = ornament.left; x < ornament.left + ornament.width; x += 1) {
          const [red, green, blue, alpha] = pixel(converted, x, y);
          expect(alpha, `ornament pixel ${x},${y}`).toBeGreaterThanOrEqual(250);
          expect([red, green, blue]).toEqual([...ornament.color]);
        }
      }
    }
  });

  it("rejects a source that contains any non-opaque source alpha", () => {
    const directory = temporaryDirectory();
    const input = path.join(directory, "source-alpha.png");
    const output = path.join(directory, "output.png");
    const source = createPng(120, 96, (x, y) =>
      x >= 40 && x < 80 && y >= 28 && y < 68 ? [7, 18, 48] : greenScreen,
    );
    source.data[(48 * source.width + 60) * 4 + 3] = 128;
    writeFileSync(input, PNG.sync.write(source, { colorType: 6 }));

    const result = runConverter(input, output);
    expectFailure(result, /(?:source|input).*(?:alpha|opaque)|alpha.*(?:source|input|opaque)/i);
    expect(() => readFileSync(output)).toThrow();
  });

  it("rejects a nonuniform green-screen border instead of estimating an unsafe matte", () => {
    const directory = temporaryDirectory();
    const input = path.join(directory, "nonuniform-border.png");
    const output = path.join(directory, "output.png");
    const width = 160;
    const height = 112;
    const source = createPng(width, height, (x, y) => {
      const onBorder = x < 12 || x >= width - 12 || y < 12 || y >= height - 12;
      if (onBorder) return y < height / 2 ? [0, 255, 0] : [70, 205, 12];
      if (x >= 58 && x < 102 && y >= 38 && y < 78) return [7, 18, 48];
      return greenScreen;
    });
    writeRgbPng(input, source);

    const result = runConverter(input, output);
    expectFailure(result, /border.*(?:uniform|variance|matte|green)|(?:uniform|variance).*border/i);
    expect(() => readFileSync(output)).toThrow();
  });

  it("never overwrites a source and requires --force=true for an existing output", () => {
    const directory = temporaryDirectory();
    const input = path.join(directory, "source.png");
    const output = path.join(directory, "existing-output.png");
    const source = createPng(128, 96, (x, y) =>
      x >= 42 && x < 86 && y >= 30 && y < 70 ? [18, 76, 224] : greenScreen,
    );
    writeRgbPng(input, source);
    const sentinel = Buffer.from("do-not-overwrite-without-force", "utf8");
    writeFileSync(output, sentinel);

    const refused = runConverter(input, output);
    expectFailure(refused, /refus|overwrite|force/i);
    expect(readFileSync(output)).toEqual(sentinel);

    const forced = runConverter(input, output, ["--force=true"]);
    expectSuccess(forced);
    expect(PNG.sync.read(readFileSync(output)).colorType).toBe(6);

    const sourceBefore = readFileSync(input);
    const samePath = runConverter(input, input, ["--force=true"]);
    expectFailure(samePath, /input.*output.*(?:differ|same)|source.*overwrit/i);
    expect(readFileSync(input)).toEqual(sourceBefore);
  });

  it("emits an RGBA image and the v002 alpha-statistics contract", () => {
    const directory = temporaryDirectory();
    const input = path.join(directory, "contract-rgb.png");
    const output = path.join(directory, "contract-rgba.png");
    const fixture = buildRampFixture(input);
    const inputHash = createHash("sha256").update(readFileSync(input)).digest("hex");

    const result = runConverter(input, output);
    expectSuccess(result);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    const convertedBytes = readFileSync(output);
    const converted = PNG.sync.read(convertedBytes, { skipRescale: true });

    expect(converted.colorType).toBe(6);
    expect(converted.alpha).toBe(true);
    expect(converted.width).toBe(fixture.width);
    expect(converted.height).toBe(fixture.height);
    expect(report).toMatchObject({
      status: expect.any(String),
      algorithm: "TRIMAP_LOCAL_FOREGROUND_V002",
      width: fixture.width,
      height: fixture.height,
      matte: expect.any(Object),
      trimap: expect.any(Object),
      compositeSpace: expect.any(String),
      alpha: {
        transparentPixels: expect.any(Number),
        partialPixels: expect.any(Number),
        opaquePixels: expect.any(Number),
        visibleBounds: {
          left: expect.any(Number),
          top: expect.any(Number),
          right: expect.any(Number),
          bottom: expect.any(Number),
        },
      },
      components: expect.any(Object),
      qa: expect.any(Object),
      sha256: {
        input: inputHash,
        output: createHash("sha256").update(convertedBytes).digest("hex"),
      },
    });

    const alpha = report.alpha as {
      readonly transparentPixels: number;
      readonly partialPixels: number;
      readonly opaquePixels: number;
    };
    expect(alpha.transparentPixels).toBeGreaterThan(0);
    expect(alpha.partialPixels).toBeGreaterThan(0);
    expect(alpha.opaquePixels).toBeGreaterThan(0);
    expect(alpha.transparentPixels + alpha.partialPixels + alpha.opaquePixels).toBe(
      fixture.width * fixture.height,
    );
  });
});
