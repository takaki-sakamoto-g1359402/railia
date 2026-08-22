import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

const backgrounds = [
  { name: "white", color: [255, 255, 255] },
  { name: "mid-grey", color: [128, 128, 128] },
  { name: "near-black", color: [12, 14, 24] },
];

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

function compositeChannel(foreground, background, alpha) {
  return Math.round(foreground * alpha + background * (1 - alpha));
}

function renderReview(input) {
  const output = new PNG({
    width: input.width * backgrounds.length,
    height: input.height,
    colorType: 6,
  });

  for (let panel = 0; panel < backgrounds.length; panel += 1) {
    const background = backgrounds[panel].color;
    for (let y = 0; y < input.height; y += 1) {
      for (let x = 0; x < input.width; x += 1) {
        const inputOffset = (y * input.width + x) * 4;
        const outputX = panel * input.width + x;
        const outputOffset = (y * output.width + outputX) * 4;
        const alpha = input.data[inputOffset + 3] / 255;
        output.data[outputOffset] = compositeChannel(
          input.data[inputOffset],
          background[0],
          alpha,
        );
        output.data[outputOffset + 1] = compositeChannel(
          input.data[inputOffset + 1],
          background[1],
          alpha,
        );
        output.data[outputOffset + 2] = compositeChannel(
          input.data[inputOffset + 2],
          background[2],
          alpha,
        );
        output.data[outputOffset + 3] = 255;
      }
    }
  }
  return output;
}

const options = parseArguments(process.argv.slice(2));
if (options.input === options.output) {
  throw new Error("Input and output paths must differ.");
}
if (!options.force) {
  try {
    await access(options.output);
    throw new Error(
      `Refusing to overwrite ${options.output}. Pass --force=true only after inspection.`,
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const inputBytes = await readFile(options.input);
const input = PNG.sync.read(inputBytes, { skipRescale: true });
if (input.depth !== 8 || input.colorType !== 6) {
  throw new Error(
    `Expected an 8-bit RGBA PNG, got depth ${input.depth} and color type ${input.colorType}.`,
  );
}
const review = renderReview(input);
const outputBytes = PNG.sync.write(review, { colorType: 6 });
await mkdir(path.dirname(options.output), { recursive: true });
await writeFile(options.output, outputBytes, { flag: options.force ? "w" : "wx" });

console.log(
  JSON.stringify(
    {
      status: "ALPHA_REVIEW_RENDERED",
      input: options.input,
      output: options.output,
      panels: backgrounds.map(({ name, color }) => ({ name, color })),
      width: review.width,
      height: review.height,
      sha256: createHash("sha256").update(outputBytes).digest("hex"),
    },
    null,
    2,
  ),
);
