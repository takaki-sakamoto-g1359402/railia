import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterActionApi } from "../src/actions/character-action-api";
import { AuditLogger, type AuditEntry } from "../src/logging/audit-logger";
import { CanvasMockRuntime } from "../src/mock/canvas-mock-runtime";
import { RecordingMockRuntime } from "../src/runtime/runtime-adapter";
import { CharacterController } from "../src/state/character-controller";
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
} {
  const fillText = vi.fn();
  const strokeRect = vi.fn();
  const clearRect = vi.fn();
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
    translate: vi.fn(),
    rotate: vi.fn(),
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
  return { canvas, fillText, strokeRect, clearRect };
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
