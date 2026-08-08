import { describe, expect, it, vi } from "vitest";

import {
  CharacterActionValidator,
  MAX_ACTION_JSON_BYTES,
  MAX_EMERGENCY_CANDIDATE_CODE_UNITS,
  isStrictSoleEmergencyCandidateJson,
} from "../src/actions/validator";
import { actionEnvelope } from "./test-helpers";

describe("CharacterActionValidator", () => {
  const validator = new CharacterActionValidator();

  it("accepts the complete allowlisted high-level action set and freezes it", () => {
    const result = validator.validateJson(
      JSON.stringify({
        version: 1,
        requestId: "valid-all-actions",
        actions: [
          { action: "setExpression", character: "riai", expression: "happy" },
          { action: "lookAt", character: "noa", x: -0.25, y: 0.5 },
          { action: "lookAtCharacter", character: "riai", target: "noa" },
          { action: "playMotion", character: "noa", motion: "greet" },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    expect(result.envelope.requestId).toBe("valid-all-actions");
    expect(Object.isFrozen(result.envelope)).toBe(true);
    expect(Object.isFrozen(result.envelope.actions)).toBe(true);
    expect(Object.isFrozen(result.envelope.actions[0])).toBe(true);
  });

  it("accepts emergencyStop only as a schema-valid action", () => {
    const result = validator.validateJson(
      JSON.stringify({
        version: 1,
        requestId: "valid-emergency",
        actions: [{ action: "emergencyStop" }],
      }),
    );

    expect(result.ok).toBe(true);
  });

  it.each([
    ["empty", "", "EMPTY_INPUT"],
    ["whitespace", "   \n\t", "EMPTY_INPUT"],
    ["truncated object", '{"version":1', "MALFORMED_JSON"],
    ["trailing token", '{"version":1} nope', "MALFORMED_JSON"],
  ])("rejects %s input", (_label, rawJson, expectedCode) => {
    const result = validator.validateJson(rawJson);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure.");
    }
    expect(result.code).toBe(expectedCode);
  });

  it.each([
    {
      label: "unknown envelope property",
      value: {
        version: 1,
        requestId: "extra-envelope",
        actions: [{ action: "setExpression", character: "riai", expression: "happy" }],
        debug: true,
      },
    },
    {
      label: "unknown action property",
      value: {
        version: 1,
        requestId: "extra-action",
        actions: [
          {
            action: "setExpression",
            character: "riai",
            expression: "happy",
            duration: 99,
          },
        ],
      },
    },
    {
      label: "raw Cubism parameter",
      value: {
        version: 1,
        requestId: "raw-parameter",
        actions: [
          {
            action: "setExpression",
            character: "riai",
            expression: "happy",
            parameterId: "ParamAngleX",
            value: 30,
          },
        ],
      },
    },
  ])("fails closed for $label", ({ value }) => {
    const result = validator.validateJson(JSON.stringify(value));

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected schema rejection.");
    }
    expect(result.code).toBe("SCHEMA_REJECTED");
  });

  it.each([
    ["unknown character", { action: "setExpression", character: "other", expression: "happy" }],
    ["unknown action", { action: "executeJavaScript", character: "riai", code: "alert(1)" }],
    ["shell execution", { action: "runShell", character: "riai", command: "whoami" }],
    ["out-of-bounds gaze", { action: "lookAt", character: "noa", x: 1.01, y: 0 }],
  ])("rejects %s", (_label, action) => {
    const result = validator.validateJson(
      JSON.stringify({ version: 1, requestId: "unknown-or-unsafe", actions: [action] }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected schema rejection.");
    }
    expect(result.code).toBe("SCHEMA_REJECTED");
  });

  it.each(["__proto__", "prototype", "constructor"])(
    "blocks the dangerous key %s before schema evaluation",
    (key) => {
      const rawJson = `{"version":1,"requestId":"danger-${key}","actions":[{"action":"setExpression","character":"riai","expression":"happy"}],"${key}":{"polluted":true}}`;
      const result = validator.validateJson(rawJson);

      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("Expected dangerous-key rejection.");
      }
      expect(result.code).toBe("DANGEROUS_KEY");
      expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
    },
  );

  it("rejects UTF-8 payloads above the byte limit before parsing", () => {
    const rawJson = "界".repeat(Math.floor(MAX_ACTION_JSON_BYTES / 3) + 1);
    expect(rawJson.length).toBeLessThan(MAX_ACTION_JSON_BYTES);
    expect(new TextEncoder().encode(rawJson).byteLength).toBeGreaterThan(
      MAX_ACTION_JSON_BYTES,
    );

    const result = validator.validateJson(rawJson);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected oversized-input rejection.");
    }
    expect(result.code).toBe("INPUT_TOO_LARGE");
  });

  it("rejects overlong code-unit input before allocating a UTF-8 copy", () => {
    const encode = vi.spyOn(TextEncoder.prototype, "encode");
    const rawJson = "x".repeat(MAX_ACTION_JSON_BYTES + 1);

    const result = validator.validateJson(rawJson);

    expect(encode).not.toHaveBeenCalled();
    encode.mockRestore();
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected oversized-input rejection.");
    }
    expect(result.code).toBe("INPUT_TOO_LARGE");
    expect(result.byteLength).toBe(rawJson.length);
  });

  it("admits only a small exact-shape sole emergency as a cheap candidate", () => {
    const valid = actionEnvelope("emergency-candidate", [
      { action: "emergencyStop" },
    ]);
    expect(isStrictSoleEmergencyCandidateJson(valid)).toBe(true);

    const rejected = [
      actionEnvelope("emergency/invalid", [{ action: "emergencyStop" }]),
      JSON.stringify({
        version: 1,
        requestId: "emergency-extra-envelope",
        actions: [{ action: "emergencyStop" }],
        extra: true,
      }),
      JSON.stringify({
        version: 1,
        requestId: "emergency-extra-action",
        actions: [{ action: "emergencyStop", extra: true }],
      }),
      actionEnvelope("emergency-mixed", [
        { action: "emergencyStop" },
        { action: "setExpression", character: "riai", expression: "happy" },
      ]),
      `${" ".repeat(MAX_EMERGENCY_CANDIDATE_CODE_UNITS)}${valid}`,
    ];
    for (const candidate of rejected) {
      expect(isStrictSoleEmergencyCandidateJson(candidate)).toBe(false);
    }
  });

  it("rejects strings above the structural string limit", () => {
    const result = validator.validateJson(
      JSON.stringify({
        version: 1,
        requestId: "x".repeat(257),
        actions: [{ action: "emergencyStop" }],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected long-string rejection.");
    }
    expect(result.code).toBe("STRING_TOO_LONG");
  });

  it("rejects excessive structural node counts before schema evaluation", () => {
    const result = validator.validateJson(
      JSON.stringify({
        version: 1,
        requestId: "too-many-nodes",
        actions: [{ action: "emergencyStop" }],
        nodes: Array.from({ length: 97 }, () => null),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected structural-size rejection.");
    }
    expect(result.code).toBe("STRUCTURE_TOO_LARGE");
  });
});
