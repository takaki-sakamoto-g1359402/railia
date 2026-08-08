import { describe, expect, it } from "vitest";

import { CharacterActionApi } from "../src/actions/character-action-api";
import { AuditLogger } from "../src/logging/audit-logger";
import { RecordingMockRuntime } from "../src/runtime/runtime-adapter";
import { actionEnvelope, mutableClock } from "./test-helpers";

describe("CharacterActionApi", () => {
  it("dispatches validated actions to both characters and records every disposition", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({ runtime });
    const result = api.executeJson(
      actionEnvelope("valid-batch", [
        { action: "setExpression", character: "riai", expression: "happy" },
        { action: "lookAt", character: "noa", x: -0.25, y: 0.5 },
        { action: "lookAtCharacter", character: "riai", target: "noa" },
        { action: "playMotion", character: "noa", motion: "greet" },
      ]),
    );

    expect(result).toMatchObject({
      accepted: true,
      code: "ACCEPTED",
      requestId: "valid-batch",
      dispatchedActions: 4,
    });
    expect(result.snapshot.characters.riai).toMatchObject({
      expression: "happy",
      activeAction: "setExpression",
      queuedActions: ["lookAtCharacter"],
    });
    expect(result.snapshot.characters.noa).toMatchObject({
      motion: "greet",
      activeAction: "playMotion",
      queuedActions: [],
    });
    expect(runtime.renderCount()).toBe(1);
    expect(runtime.latest()).toEqual(result.snapshot);
    expect(api.logger.entries()).toHaveLength(4);
    expect(api.logger.entries().map((entry) => entry.code)).toEqual([
      "STARTED",
      "STARTED",
      "QUEUED",
      "INTERRUPTED",
    ]);
  });

  it.each([
    ["riai", "curious"],
    ["noa", "thinking"],
  ] as const)(
    "rejects expression capabilities not owned by %s",
    (character, expression) => {
      const runtime = new RecordingMockRuntime();
      const api = new CharacterActionApi({ runtime });
      const before = api.snapshot();

      const result = api.executeJson(
        actionEnvelope(`capability-${character}`, [
          { action: "setExpression", character, expression },
        ]),
      );

      expect(result).toMatchObject({
        accepted: false,
        code: "POLICY_REJECTED",
        dispatchedActions: 0,
      });
      expect(result.snapshot).toEqual(before);
      expect(runtime.renderCount()).toBe(0);
      expect(api.logger.entries().at(-1)?.code).toBe(
        "CHARACTER_CAPABILITY_REJECTED",
      );
    },
  );

  it("rejects self-targeting without mutating state", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({ runtime });
    const before = api.snapshot();

    const result = api.executeJson(
      actionEnvelope("self-target", [
        { action: "lookAtCharacter", character: "noa", target: "noa" },
      ]),
    );

    expect(result.code).toBe("POLICY_REJECTED");
    expect(result.snapshot).toEqual(before);
    expect(runtime.renderCount()).toBe(0);
    expect(api.logger.entries().at(-1)?.code).toBe("SELF_TARGET_REJECTED");
  });

  it("rejects a duplicate accepted requestId before dispatch", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({ runtime });
    expect(
      api.executeJson(
        actionEnvelope("duplicate-id", [
          { action: "setExpression", character: "riai", expression: "happy" },
        ]),
      ).accepted,
    ).toBe(true);
    const beforeDuplicate = api.snapshot();

    const duplicate = api.executeJson(
      actionEnvelope("duplicate-id", [
        { action: "playMotion", character: "noa", motion: "greet" },
      ]),
    );

    expect(duplicate).toMatchObject({
      accepted: false,
      code: "POLICY_REJECTED",
      dispatchedActions: 0,
    });
    expect(duplicate.snapshot).toEqual(beforeDuplicate);
    expect(runtime.renderCount()).toBe(1);
    expect(api.logger.entries().at(-1)?.code).toBe("DUPLICATE_REQUEST");
  });

  it("rate-limits whole requests atomically and recovers after the window", () => {
    const clock = mutableClock(1_000);
    const runtime = new RecordingMockRuntime();
    const logger = new AuditLogger(clock.now);
    const api = new CharacterActionApi({
      runtime,
      logger,
      clock: clock.now,
      maxActionCostPerWindow: 2,
      rateWindowMs: 100,
    });
    expect(
      api.executeJson(
        actionEnvelope("rate-first", [
          { action: "lookAt", character: "riai", x: 0.1, y: 0.2 },
          { action: "lookAt", character: "noa", x: -0.1, y: 0.2 },
        ]),
      ).accepted,
    ).toBe(true);
    const beforeLimited = api.snapshot();

    const limited = api.executeJson(
      actionEnvelope("rate-limited", [
        { action: "setExpression", character: "riai", expression: "happy" },
      ]),
    );

    expect(limited.code).toBe("RATE_LIMITED");
    expect(limited.dispatchedActions).toBe(0);
    expect(limited.snapshot).toEqual(beforeLimited);
    expect(runtime.renderCount()).toBe(1);
    expect(logger.entries().at(-1)?.code).toBe("RATE_LIMITED");

    clock.advance(101);
    const recovered = api.executeJson(
      actionEnvelope("rate-recovered", [
        { action: "setExpression", character: "riai", expression: "happy" },
      ]),
    );
    expect(recovered.accepted).toBe(true);
    expect(runtime.renderCount()).toBe(2);
  });

  it("rejects a policy-invalid batch atomically even when its first action is valid", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({ runtime });
    const before = api.snapshot();

    const result = api.executeJson(
      actionEnvelope("atomic-policy", [
        { action: "setExpression", character: "riai", expression: "happy" },
        { action: "setExpression", character: "riai", expression: "curious" },
      ]),
    );

    expect(result.code).toBe("POLICY_REJECTED");
    expect(result.dispatchedActions).toBe(0);
    expect(result.snapshot).toEqual(before);
    expect(runtime.renderCount()).toBe(0);
    expect(api.logger.entries()).toHaveLength(1);
  });

  it("rejects a schema-invalid batch atomically and never renders it", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({ runtime });
    const before = api.snapshot();

    const result = api.executeJson(
      actionEnvelope("atomic-schema", [
        { action: "setExpression", character: "riai", expression: "happy" },
        {
          action: "lookAt",
          character: "noa",
          x: 0,
          y: 0,
          parameterId: "ParamEyeBallX",
        },
      ]),
    );

    expect(result.code).toBe("VALIDATION_REJECTED");
    expect(result.dispatchedActions).toBe(0);
    expect(result.snapshot).toEqual(before);
    expect(runtime.renderCount()).toBe(0);
  });

  it("rejects queue overflow atomically before dispatching any part of the batch", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({
      runtime,
      maxActionCostPerWindow: 100,
      rateWindowMs: 10_000,
    });
    const queuedLook = { action: "lookAt", character: "riai", x: 0, y: 0 } as const;

    expect(
      api.executeJson(
        actionEnvelope("queue-lock", [
          { action: "playMotion", character: "riai", motion: "reactLight" },
        ]),
      ).accepted,
    ).toBe(true);
    expect(
      api.executeJson(
        actionEnvelope("queue-fill-a", Array.from({ length: 8 }, () => queuedLook)),
      ).accepted,
    ).toBe(true);
    expect(
      api.executeJson(
        actionEnvelope("queue-fill-b", Array.from({ length: 8 }, () => queuedLook)),
      ).accepted,
    ).toBe(true);
    expect(api.snapshot().characters.riai.queuedActions).toHaveLength(16);
    const beforeOverflow = api.snapshot();
    const rendersBeforeOverflow = runtime.renderCount();

    const overflow = api.executeJson(
      actionEnvelope("queue-overflow", [queuedLook]),
    );

    expect(overflow.code).toBe("POLICY_REJECTED");
    expect(overflow.dispatchedActions).toBe(0);
    expect(overflow.snapshot).toEqual(beforeOverflow);
    expect(runtime.renderCount()).toBe(rendersBeforeOverflow);
    expect(api.logger.entries().at(-1)?.code).toBe("QUEUE_CAPACITY_REJECTED");
  });

  it("requires emergencyStop to be the sole action", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({ runtime });
    const before = api.snapshot();

    const result = api.executeJson(
      actionEnvelope("mixed-emergency", [
        { action: "emergencyStop" },
        { action: "setExpression", character: "riai", expression: "happy" },
      ]),
    );

    expect(result.code).toBe("POLICY_REJECTED");
    expect(result.snapshot).toEqual(before);
    expect(runtime.emergencyResetCount()).toBe(0);
    expect(api.logger.entries().at(-1)?.code).toBe(
      "EMERGENCY_STOP_MUST_BE_SOLE_ACTION",
    );
  });

  it("emergencyStop clears both queues and restores a neutral safe idle", () => {
    const runtime = new RecordingMockRuntime();
    const api = new CharacterActionApi({
      runtime,
      maxActionCostPerWindow: 100,
    });
    api.executeJson(
      actionEnvelope("emergency-active", [
        { action: "playMotion", character: "riai", motion: "reactLight" },
        { action: "playMotion", character: "noa", motion: "reactLight" },
      ]),
    );
    api.executeJson(
      actionEnvelope("emergency-queued", [
        { action: "setExpression", character: "riai", expression: "happy" },
        { action: "setExpression", character: "noa", expression: "curious" },
      ]),
    );
    expect(api.snapshot().characters.riai.queuedActions).toHaveLength(1);
    expect(api.snapshot().characters.noa.queuedActions).toHaveLength(1);

    const result = api.executeJson(
      actionEnvelope("emergency-now", [{ action: "emergencyStop" }]),
    );

    expect(result).toMatchObject({
      accepted: true,
      code: "EMERGENCY_STOPPED",
      dispatchedActions: 1,
    });
    expect(result.snapshot.emergencyStopCount).toBe(1);
    for (const character of Object.values(result.snapshot.characters)) {
      expect(character).toMatchObject({
        expression: "neutral",
        motion: "idle",
        gazeTarget: { kind: "forward" },
        mode: "safeIdle",
        priority: 0,
        interruptible: true,
        activeAction: null,
        queuedActions: [],
      });
    }
    expect(runtime.emergencyResetCount()).toBe(1);
    expect(runtime.latest()).toEqual(result.snapshot);
    expect(api.logger.entries().at(-1)).toMatchObject({
      outcome: "accepted",
      code: "EMERGENCY_STOPPED",
      action: "emergencyStop",
    });
  });
});
