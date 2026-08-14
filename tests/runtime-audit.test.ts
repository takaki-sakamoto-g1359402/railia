import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterActionApi } from "../src/actions/character-action-api";
import { AuditLogger, type AuditEntry } from "../src/logging/audit-logger";
import { CanvasMockRuntime } from "../src/mock/canvas-mock-runtime";
import {
  RecordingMockRuntime,
  type CharacterRuntimeAdapter,
} from "../src/runtime/runtime-adapter";
import { CharacterController } from "../src/state/character-controller";
import type { WorldSnapshot } from "../src/state/types";
import { actionEnvelope, mutableClock } from "./test-helpers";

function auditInput(code: string): Omit<AuditEntry, "id" | "timestamp"> {
  return {
    outcome: "system",
    code,
    requestId: null,
    action: null,
    character: null,
    detail: `entry ${code}`,
  };
}

function canvasHarness(): {
  readonly canvas: HTMLCanvasElement;
  readonly fillText: ReturnType<typeof vi.fn>;
  readonly strokeRect: ReturnType<typeof vi.fn>;
  readonly clearRect: ReturnType<typeof vi.fn>;
  readonly translate: ReturnType<typeof vi.fn>;
  readonly rotate: ReturnType<typeof vi.fn>;
} {
  const fillText = vi.fn();
  const strokeRect = vi.fn();
  const clearRect = vi.fn();
  const translate = vi.fn();
  const rotate = vi.fn();
  const gradient = { addColorStop: vi.fn() } as unknown as CanvasGradient;
  const context = {
    setTransform: vi.fn(),
    clearRect,
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    translate,
    rotate,
    stroke: vi.fn(),
    restore: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    strokeRect,
    fillText,
    scale: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillRectForShape: vi.fn(),
    ellipse: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    getBoundingClientRect: vi.fn(
      () => ({ width: 320, height: 180 }) as DOMRect,
    ),
  } as unknown as HTMLCanvasElement;
  return { canvas, fillText, strokeRect, clearRect, translate, rotate };
}

function captureMotionFrame(
  motion: "greet" | "tailSway" | "earTwitch",
  deltas: readonly number[],
): {
  readonly snapshot: ReturnType<CharacterController["snapshot"]>;
  readonly translations: readonly unknown[][];
  readonly rotations: readonly unknown[][];
} {
  vi.stubGlobal("window", { devicePixelRatio: 2 });
  const harness = canvasHarness();
  const controller = new CharacterController(0x1357);
  const runtime = new CanvasMockRuntime(harness.canvas);
  runtime.initialize(controller.snapshot());
  harness.translate.mockClear();
  harness.rotate.mockClear();

  controller.dispatchBatch(
    [{ action: "playMotion", character: "riai", motion }],
    `motion-${motion}`,
  );
  for (const deltaMs of deltas) {
    controller.advanceTime(deltaMs);
  }
  const snapshot = controller.snapshot();
  runtime.render(snapshot);
  return {
    snapshot,
    translations: harness.translate.mock.calls.map((call) => [...call]),
    rotations: harness.rotate.mock.calls.map((call) => [...call]),
  };
}

class FaultInjectingRuntime implements CharacterRuntimeAdapter {
  public readonly kind = "mock" as const;
  public failRender = false;
  public failEmergencyReset = false;
  public emergencyResetAttempts = 0;
  public latest: WorldSnapshot | null = null;

  public initialize(snapshot: WorldSnapshot): void {
    this.latest = snapshot;
  }

  public render(snapshot: WorldSnapshot): void {
    if (this.failRender) {
      throw new Error("injected render failure");
    }
    this.latest = snapshot;
  }

  public emergencyReset(snapshot: WorldSnapshot): void {
    this.emergencyResetAttempts += 1;
    if (this.failEmergencyReset) {
      throw new Error("injected emergency-reset failure");
    }
    this.latest = snapshot;
  }

  public dispose(): void {
    this.latest = null;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mock runtime adapters", () => {
  it("records initialize, visible render, emergency reset, and disposal snapshots", () => {
    const controller = new CharacterController(123);
    const runtime = new RecordingMockRuntime();
    const initial = controller.snapshot();

    runtime.initialize(initial);
    expect(runtime.kind).toBe("mock");
    expect(runtime.latest()).toEqual(initial);
    expect(runtime.renderCount()).toBe(0);

    controller.dispatchBatch(
      [{ action: "setExpression", character: "riai", expression: "happy" }],
      "render",
    );
    const active = controller.snapshot();
    runtime.render(active);
    expect(runtime.latest()).toEqual(active);
    expect(runtime.renderCount()).toBe(1);

    controller.emergencyStop();
    const reset = controller.snapshot();
    runtime.emergencyReset(reset);
    expect(runtime.latest()).toEqual(reset);
    expect(runtime.renderCount()).toBe(2);
    expect(runtime.emergencyResetCount()).toBe(1);

    runtime.dispose();
    expect(runtime.latest()).toBeNull();
  });

  it("renders the explicit MOCK label and emergency frame through CanvasMockRuntime", () => {
    vi.stubGlobal("window", { devicePixelRatio: 2 });
    const { canvas, fillText, strokeRect, clearRect } = canvasHarness();
    const runtime = new CanvasMockRuntime(canvas);
    const snapshot = new CharacterController(321).snapshot();

    runtime.initialize(snapshot);
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(fillText).toHaveBeenCalledWith(
      "MOCK PLACEHOLDERS — NO LIVE2D MODEL LOADED",
      480,
      30,
    );

    runtime.emergencyReset(snapshot);
    expect(strokeRect).toHaveBeenCalledWith(7, 7, 946, 526);

    runtime.dispose();
    expect(clearRect).toHaveBeenCalledWith(0, 0, 640, 360);
  });

  it("fails clearly when a canvas has no 2D context", () => {
    const canvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    expect(() => new CanvasMockRuntime(canvas)).toThrow(
      "A 2D canvas context is required for the MOCK runtime.",
    );
  });

  it.each([
    ["greet", 300, [100, 100, 100]],
    ["tailSway", 250, [50, 50, 50, 50, 50]],
    ["earTwitch", 260, [65, 65, 65, 65]],
  ] as const)(
    "renders %s from action time independently of step subdivision",
    (motion, totalMs, chunks) => {
      const singleStep = captureMotionFrame(motion, [totalMs]);
      const chunked = captureMotionFrame(motion, chunks);

      expect(chunked.snapshot).toEqual(singleStep.snapshot);
      expect(chunked.translations).toEqual(singleStep.translations);
      expect(chunked.rotations).toEqual(singleStep.rotations);

      const character = singleStep.snapshot.characters.riai;
      const oscillation = Math.sin(character.actionProgress * Math.PI * 2);
      if (motion === "greet") {
        const bodyTranslation = singleStep.translations[1];
        expect(Number(bodyTranslation?.[1])).toBeCloseTo(
          335 + oscillation * 8 - (character.idle.breath - 0.5) * 5,
        );
      } else if (motion === "tailSway") {
        const tailRotation = singleStep.rotations[1];
        expect(Number(tailRotation?.[0])).toBeCloseTo(
          (oscillation * 16 * Math.PI) / 180,
        );
      } else {
        const leftEarRotation = singleStep.rotations[3];
        expect(Number(leftEarRotation?.[0])).toBeCloseTo(
          -oscillation * 0.22,
        );
      }
    },
  );

  it("fails closed without throwing when action rendering fails", () => {
    const runtime = new FaultInjectingRuntime();
    const api = new CharacterActionApi({ runtime });
    runtime.failRender = true;
    const request = actionEnvelope("render-failure", [
      { action: "setExpression", character: "riai", expression: "happy" },
    ]);

    const result = api.executeJson(request);

    expect(result).toMatchObject({
      accepted: false,
      code: "RUNTIME_FAILED",
      requestId: "render-failure",
      dispatchedActions: 0,
    });
    expect(result.snapshot.characters.riai).toMatchObject({
      expression: "neutral",
      motion: "idle",
      mode: "safeIdle",
      activeAction: null,
      queuedActions: [],
    });
    expect(runtime.emergencyResetAttempts).toBe(1);
    expect(runtime.latest).toEqual(result.snapshot);
    expect(api.logger.entries().at(-1)).toMatchObject({
      outcome: "system",
      code: "RUNTIME_FAILED",
      requestId: "render-failure",
    });

    runtime.failRender = false;
    expect(api.executeJson(request).code).toBe("ACCEPTED");
  });

  it("returns a safe failure when emergency rendering itself fails", () => {
    const runtime = new FaultInjectingRuntime();
    const api = new CharacterActionApi({ runtime });
    runtime.failEmergencyReset = true;
    const request = actionEnvelope("reset-failure", [
      { action: "emergencyStop" },
    ]);

    const result = api.executeJson(request);

    expect(result).toMatchObject({
      accepted: false,
      code: "RUNTIME_FAILED",
      requestId: "reset-failure",
      dispatchedActions: 0,
    });
    for (const character of Object.values(result.snapshot.characters)) {
      expect(character).toMatchObject({
        expression: "neutral",
        motion: "idle",
        mode: "safeIdle",
        activeAction: null,
        queuedActions: [],
      });
    }
    expect(runtime.emergencyResetAttempts).toBe(1);
    expect(api.logger.entries().at(-1)).toMatchObject({
      outcome: "system",
      code: "RUNTIME_FAILED",
      requestId: "reset-failure",
    });

    runtime.failEmergencyReset = false;
    expect(api.executeJson(request).code).toBe("EMERGENCY_STOPPED");
  });

  it("fails closed without throwing when an advance-time render fails", () => {
    const runtime = new FaultInjectingRuntime();
    const api = new CharacterActionApi({ runtime });
    runtime.failRender = true;

    const snapshot = api.advanceTime(16);

    expect(snapshot.characters.riai.mode).toBe("safeIdle");
    expect(snapshot.characters.noa.mode).toBe("safeIdle");
    expect(runtime.emergencyResetAttempts).toBe(1);
    expect(api.logger.entries().at(-1)).toMatchObject({
      outcome: "system",
      code: "RUNTIME_FAILED",
      requestId: null,
    });
  });
});

describe("AuditLogger", () => {
  it("maintains a bounded immutable sequence and isolates returned arrays", () => {
    const clock = mutableClock(Date.UTC(2026, 7, 9));
    const logger = new AuditLogger(clock.now, 3);
    const first = logger.record(auditInput("ONE"));
    clock.advance(1_000);
    logger.record(auditInput("TWO"));
    logger.record(auditInput("THREE"));
    logger.record(auditInput("FOUR"));

    expect(Object.isFrozen(first)).toBe(true);
    expect(first).toMatchObject({
      id: "audit-000001",
      timestamp: "2026-08-09T00:00:00.000Z",
    });
    expect(logger.entries().map((entry) => entry.code)).toEqual([
      "TWO",
      "THREE",
      "FOUR",
    ]);
    const external = logger.entries() as AuditEntry[];
    external.length = 0;
    expect(logger.entries()).toHaveLength(3);
  });

  it("publishes snapshots immediately and supports unsubscribe", () => {
    const logger = new AuditLogger(() => 0);
    const observed: (readonly AuditEntry[])[] = [];
    const unsubscribe = logger.subscribe((entries) => observed.push(entries));
    expect(observed).toEqual([[]]);

    logger.record(auditInput("FIRST"));
    expect(observed.at(-1)?.map((entry) => entry.code)).toEqual(["FIRST"]);
    unsubscribe();
    logger.record(auditInput("SECOND"));
    expect(observed).toHaveLength(2);
  });

  it("isolates subscriber exceptions and continues notifying healthy listeners", () => {
    const logger = new AuditLogger(() => 0);
    const observed: (readonly AuditEntry[])[] = [];

    expect(() =>
      logger.subscribe((entries) => {
        if (entries.length > 0) {
          (entries as AuditEntry[]).length = 0;
        }
        throw new Error("broken audit subscriber");
      }),
    ).not.toThrow();
    logger.subscribe((entries) => observed.push(entries));

    expect(() => logger.record(auditInput("SAFE"))).not.toThrow();
    expect(logger.entries().map((entry) => entry.code)).toEqual(["SAFE"]);
    expect(observed.at(-1)?.map((entry) => entry.code)).toEqual(["SAFE"]);
  });

  it("does not let a throwing subscriber partially fail a valid API action", () => {
    const runtime = new RecordingMockRuntime();
    const logger = new AuditLogger(() => Date.UTC(2026, 7, 9));
    const observed: (readonly AuditEntry[])[] = [];
    logger.subscribe((entries) => {
      if (entries.length > 0) {
        throw new Error("injected subscriber failure");
      }
    });
    logger.subscribe((entries) => observed.push(entries));
    const api = new CharacterActionApi({ runtime, logger });

    const result = api.executeJson(
      actionEnvelope("subscriber-safe-action", [
        { action: "setExpression", character: "riai", expression: "happy" },
      ]),
    );

    expect(result).toMatchObject({
      accepted: true,
      code: "ACCEPTED",
      requestId: "subscriber-safe-action",
      dispatchedActions: 1,
    });
    expect(result.snapshot.characters.riai).toMatchObject({
      expression: "happy",
      mode: "acting",
      activeAction: "setExpression",
    });
    expect(logger.entries()).toHaveLength(1);
    expect(observed.at(-1)?.at(-1)).toMatchObject({
      outcome: "accepted",
      code: "STARTED",
      requestId: "subscriber-safe-action",
    });
  });

  it("captures accepted, rejected, and emergency API outcomes", () => {
    const runtime = new RecordingMockRuntime();
    const logger = new AuditLogger(() => Date.UTC(2026, 7, 9));
    const api = new CharacterActionApi({ runtime, logger });

    api.executeJson(
      actionEnvelope("audit-accepted", [
        { action: "setExpression", character: "riai", expression: "happy" },
      ]),
    );
    api.executeJson('{"broken"');
    api.executeJson(
      actionEnvelope("audit-emergency", [{ action: "emergencyStop" }]),
    );

    expect(logger.entries()).toMatchObject([
      {
        outcome: "accepted",
        code: "STARTED",
        requestId: "audit-accepted",
        action: "setExpression",
        character: "riai",
      },
      {
        outcome: "rejected",
        code: "MALFORMED_JSON",
        requestId: null,
        action: null,
        character: null,
      },
      {
        outcome: "accepted",
        code: "EMERGENCY_STOPPED",
        requestId: "audit-emergency",
        action: "emergencyStop",
        character: null,
      },
    ]);
  });
});
