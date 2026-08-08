import validateSchema from "virtual:character-action-validator";

import type { ActionEnvelope } from "./types";

export const MAX_ACTION_JSON_BYTES = 4_096;
const MAX_STRUCTURE_DEPTH = 6;
const MAX_STRUCTURE_NODES = 96;
const MAX_ANY_STRING_LENGTH = 256;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type ValidationFailureCode =
  | "EMPTY_INPUT"
  | "INPUT_TOO_LARGE"
  | "MALFORMED_JSON"
  | "DANGEROUS_KEY"
  | "STRUCTURE_TOO_DEEP"
  | "STRUCTURE_TOO_LARGE"
  | "STRING_TOO_LONG"
  | "SCHEMA_REJECTED";

export interface ValidationSuccess {
  readonly ok: true;
  readonly envelope: Readonly<ActionEnvelope>;
  readonly byteLength: number;
}

export interface ValidationFailure {
  readonly ok: false;
  readonly code: ValidationFailureCode;
  readonly message: string;
  readonly byteLength: number;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

interface ScanBudget {
  nodes: number;
}

function scanStructure(
  value: unknown,
  depth: number,
  budget: ScanBudget,
): ValidationFailureCode | null {
  budget.nodes += 1;
  if (budget.nodes > MAX_STRUCTURE_NODES) {
    return "STRUCTURE_TOO_LARGE";
  }
  if (depth > MAX_STRUCTURE_DEPTH) {
    return "STRUCTURE_TOO_DEEP";
  }
  if (typeof value === "string") {
    return value.length > MAX_ANY_STRING_LENGTH ? "STRING_TOO_LONG" : null;
  }
  if (value === null || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const failure = scanStructure(item, depth + 1, budget);
      if (failure !== null) {
        return failure;
      }
    }
    return null;
  }

  for (const [key, item] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      return "DANGEROUS_KEY";
    }
    const failure = scanStructure(item, depth + 1, budget);
    if (failure !== null) {
      return failure;
    }
  }
  return null;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) {
      deepFreeze(item);
    }
  }
  return value;
}

function scanFailureMessage(code: ValidationFailureCode): string {
  switch (code) {
    case "DANGEROUS_KEY":
      return "Input contains a blocked object key.";
    case "STRUCTURE_TOO_DEEP":
      return "Input nesting exceeds the safety limit.";
    case "STRUCTURE_TOO_LARGE":
      return "Input contains too many structural nodes.";
    case "STRING_TOO_LONG":
      return "Input contains a string that exceeds the safety limit.";
    default:
      return "Input failed structural safety checks.";
  }
}

export class CharacterActionValidator {
  public validateJson(rawJson: string): ValidationResult {
    const byteLength = new TextEncoder().encode(rawJson).byteLength;
    if (rawJson.trim().length === 0) {
      return {
        ok: false,
        code: "EMPTY_INPUT",
        message: "Action JSON is empty.",
        byteLength,
      };
    }
    if (byteLength > MAX_ACTION_JSON_BYTES) {
      return {
        ok: false,
        code: "INPUT_TOO_LARGE",
        message: `Action JSON exceeds ${MAX_ACTION_JSON_BYTES} bytes.`,
        byteLength,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson) as unknown;
    } catch {
      return {
        ok: false,
        code: "MALFORMED_JSON",
        message: "Action JSON is malformed.",
        byteLength,
      };
    }

    const structuralFailure = scanStructure(parsed, 0, { nodes: 0 });
    if (structuralFailure !== null) {
      return {
        ok: false,
        code: structuralFailure,
        message: scanFailureMessage(structuralFailure),
        byteLength,
      };
    }

    if (!validateSchema(parsed)) {
      const firstError = validateSchema.errors?.[0];
      const location = firstError?.instancePath || "/";
      const keyword = firstError?.keyword ?? "schema";
      return {
        ok: false,
        code: "SCHEMA_REJECTED",
        message: `Schema rejected input at ${location} (${keyword}).`,
        byteLength,
      };
    }

    return {
      ok: true,
      envelope: deepFreeze(parsed as ActionEnvelope),
      byteLength,
    };
  }
}
