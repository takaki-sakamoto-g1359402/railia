import validateSchema from "virtual:character-action-validator";

import type { ActionEnvelope } from "./types";

export const MAX_ACTION_JSON_BYTES = 4_096;
export const MAX_EMERGENCY_CANDIDATE_CODE_UNITS = 256;
const MAX_STRUCTURE_DEPTH = 6;
const MAX_STRUCTURE_NODES = 96;
const MAX_ANY_STRING_LENGTH = 256;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

/**
 * Cheap, fail-closed admission check used only after the entry attempt budget
 * is exhausted. It deliberately mirrors the strict schema shape for a sole
 * emergency stop without invoking structural scanning or the compiled schema.
 * Full validation is still mandatory before the emergency is executed.
 */
export function isStrictSoleEmergencyCandidateJson(rawJson: string): boolean {
  if (
    rawJson.length === 0 ||
    rawJson.length > MAX_EMERGENCY_CANDIDATE_CODE_UNITS
  ) {
    return false;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    return false;
  }

  if (
    !isRecord(parsed) ||
    !hasExactKeys(parsed, ["version", "requestId", "actions"]) ||
    parsed.version !== 1 ||
    typeof parsed.requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(parsed.requestId) ||
    !Array.isArray(parsed.actions) ||
    parsed.actions.length !== 1
  ) {
    return false;
  }

  const action = parsed.actions[0];
  return (
    isRecord(action) &&
    hasExactKeys(action, ["action"]) &&
    action.action === "emergencyStop"
  );
}

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
    // UTF-8 cannot use fewer bytes than this UTF-16 code-unit count. Rejecting
    // here prevents an attacker-controlled oversized string from first being
    // copied into an equally unbounded TextEncoder allocation.
    if (rawJson.length > MAX_ACTION_JSON_BYTES) {
      return {
        ok: false,
        code: "INPUT_TOO_LARGE",
        message: `Action JSON exceeds ${MAX_ACTION_JSON_BYTES} bytes.`,
        byteLength: rawJson.length,
      };
    }

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
