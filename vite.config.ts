import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";
import { defineConfig } from "vite";

import actionSchema from "./src/actions/character-action.schema.json" with {
  type: "json",
};

const ACTION_VALIDATOR_ID = "virtual:character-action-validator";
const RESOLVED_ACTION_VALIDATOR_ID = `\0${ACTION_VALIDATOR_ID}`;

function characterActionValidatorPlugin() {
  const ajv = new Ajv2020({
    allErrors: true,
    coerceTypes: false,
    removeAdditional: false,
    useDefaults: false,
    strict: true,
    code: {
      esm: true,
      source: true,
    },
  });
  const validate = ajv.compile(actionSchema);
  const generatedModule = standaloneCode(ajv, validate);

  return {
    name: "character-action-validator",
    enforce: "pre" as const,
    resolveId(id: string) {
      return id === ACTION_VALIDATOR_ID ? RESOLVED_ACTION_VALIDATOR_ID : null;
    },
    load(id: string) {
      return id === RESOLVED_ACTION_VALIDATOR_ID ? generatedModule : null;
    },
  };
}

export default defineConfig({
  plugins: [characterActionValidatorPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    cors: false,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
