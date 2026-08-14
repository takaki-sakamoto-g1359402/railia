import { describe, expect, it } from "vitest";

import { CharacterStateMachine } from "../src/state/character-state-machine";
import { CharacterController } from "../src/state/character-controller";
import {
  MOTION_CONTRACT_V1,
  MOTION_IDS,
} from "../src/actions/types";
import { describeAction } from "../src/state/action-priority";

describe("CharacterStateMachine", () => {
  it("uses the API v1 motion contract as its scheduling source of truth", () => {
    for (const motion of MOTION_IDS) {
      expect(
        describeAction({ action: "playMotion", character: "riai", motion }),
      ).toBe(MOTION_CONTRACT_V1[motion]);
    }
  });

  it("transitions a bounded expression action back to neutral safe idle", () => {
    const machine = new CharacterStateMachine("riai", 1234);
    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      mode: "safeIdle",
      activeAction: null,
    });

    const started = machine.dispatch(
      { action: "setExpression", character: "riai", expression: "happy" },
      "expression",
    );
    expect(started.disposition).toBe("started");
    expect(machine.snapshot()).toMatchObject({
      expression: "happy",
      mode: "acting",
      priority: 40,
      interruptible: true,
      activeAction: "setExpression",
      actionElapsedMs: 0,
      actionProgress: 0,
    });

    machine.advance(2_399);
    expect(machine.snapshot().expression).toBe("happy");
    expect(machine.snapshot().actionElapsedMs).toBe(2_399);
    machine.advance(1);
    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      motion: "idle",
      mode: "safeIdle",
      priority: 0,
      activeAction: null,
      actionElapsedMs: 0,
      actionProgress: 0,
      queuedActions: [],
    });
  });

  it("lets an equal-or-higher priority action interrupt an interruptible action", () => {
    const machine = new CharacterStateMachine("noa", 77);
    const first = machine.dispatch(
      { action: "playMotion", character: "noa", motion: "earTwitch" },
      "low-priority",
    );
    const interrupt = machine.dispatch(
      { action: "lookAt", character: "noa", x: 0.4, y: -0.2 },
      "higher-priority",
    );

    expect(first.disposition).toBe("started");
    expect(interrupt.disposition).toBe("interrupted");
    expect(machine.snapshot()).toMatchObject({
      motion: "idle",
      gazeTarget: { kind: "point", x: 0.4, y: -0.2 },
      activeAction: "lookAt",
      priority: 30,
      queuedActions: [],
    });
  });

  it("does not interrupt reactLight and drains its queue by priority then FIFO", () => {
    const machine = new CharacterStateMachine("riai", 88);
    expect(
      machine.dispatch(
        { action: "playMotion", character: "riai", motion: "reactLight" },
        "locked",
      ).disposition,
    ).toBe("started");
    expect(
      machine.dispatch(
        { action: "setExpression", character: "riai", expression: "happy" },
        "expression",
      ).disposition,
    ).toBe("queued");
    expect(
      machine.dispatch(
        { action: "playMotion", character: "riai", motion: "greet" },
        "greet",
      ).disposition,
    ).toBe("queued");
    expect(
      machine.dispatch(
        { action: "lookAtCharacter", character: "riai", target: "noa" },
        "gaze",
      ).disposition,
    ).toBe("queued");

    expect(machine.snapshot()).toMatchObject({
      motion: "reactLight",
      priority: 80,
      interruptible: false,
      activeAction: "playMotion",
      queuedActions: ["playMotion", "setExpression", "lookAtCharacter"],
    });

    machine.advance(1_800);
    expect(machine.snapshot()).toMatchObject({
      motion: "greet",
      activeAction: "playMotion",
      actionElapsedMs: 0,
      priority: 50,
      queuedActions: ["setExpression", "lookAtCharacter"],
    });

    machine.advance(1_200);
    expect(machine.snapshot()).toMatchObject({
      expression: "happy",
      motion: "idle",
      activeAction: "setExpression",
      actionElapsedMs: 0,
      queuedActions: ["lookAtCharacter"],
    });

    machine.advance(2_400);
    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      gazeTarget: { kind: "character", target: "noa" },
      activeAction: "lookAtCharacter",
      actionElapsedMs: 0,
      queuedActions: [],
    });

    machine.advance(1_800);
    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      motion: "idle",
      mode: "safeIdle",
      activeAction: null,
      actionElapsedMs: 0,
      actionProgress: 0,
      queuedActions: [],
    });
  });

  it("is snapshot-identical for one-step and chunked action time", () => {
    const singleStep = new CharacterStateMachine("riai", 0x1234);
    const chunked = new CharacterStateMachine("riai", 0x1234);
    const action = {
      action: "playMotion",
      character: "riai",
      motion: "greet",
    } as const;
    singleStep.dispatch(action, "single");
    chunked.dispatch(action, "single");

    singleStep.advance(600);
    for (let index = 0; index < 6; index += 1) {
      chunked.advance(100);
    }

    expect(singleStep.snapshot()).toEqual(chunked.snapshot());
    expect(singleStep.snapshot()).toMatchObject({
      motion: "greet",
      actionElapsedMs: 600,
      actionProgress: 0.5,
    });
  });

  it("canonicalizes fractional fixed steps at an exact action boundary", () => {
    const singleStep = new CharacterStateMachine("riai", 0x2345);
    const fixedStep = new CharacterStateMachine("riai", 0x2345);
    const action = {
      action: "playMotion",
      character: "riai",
      motion: "greet",
    } as const;
    singleStep.dispatch(action, "fractional");
    fixedStep.dispatch(action, "fractional");

    singleStep.advance(1_200);
    for (let index = 0; index < 72; index += 1) {
      fixedStep.advance(1_200 / 72);
    }

    expect(fixedStep.snapshot()).toEqual(singleStep.snapshot());
    expect(fixedStep.snapshot()).toMatchObject({
      motion: "idle",
      mode: "safeIdle",
      activeAction: null,
      actionElapsedMs: 0,
      actionProgress: 0,
    });
  });

  it("canonicalizes world elapsed time across equivalent fractional partitions", () => {
    const singleStep = new CharacterController(0x3456);
    const fractionalSteps = new CharacterController(0x3456);
    const action = {
      action: "playMotion",
      character: "riai",
      motion: "greet",
    } as const;
    singleStep.dispatchBatch([action], "fractional-world");
    fractionalSteps.dispatchBatch([action], "fractional-world");

    singleStep.advanceTime(1);
    for (let index = 0; index < 10; index += 1) {
      fractionalSteps.advanceTime(0.1);
    }

    expect(fractionalSteps.snapshot()).toEqual(singleStep.snapshot());
    expect(fractionalSteps.snapshot().elapsedMs).toBe(1);
  });

  it("preserves deterministic elapsed time when a queued motion starts mid-step", () => {
    const singleStep = new CharacterStateMachine("riai", 0x5678);
    const chunked = new CharacterStateMachine("riai", 0x5678);
    for (const machine of [singleStep, chunked]) {
      machine.dispatch(
        { action: "playMotion", character: "riai", motion: "reactLight" },
        "locked",
      );
      machine.dispatch(
        { action: "playMotion", character: "riai", motion: "greet" },
        "queued",
      );
    }

    singleStep.advance(2_100);
    for (let index = 0; index < 3; index += 1) {
      chunked.advance(700);
    }

    expect(singleStep.snapshot()).toEqual(chunked.snapshot());
    expect(singleStep.snapshot()).toMatchObject({
      motion: "greet",
      activeAction: "playMotion",
      actionElapsedMs: 300,
      actionProgress: 0.25,
      queuedActions: [],
    });
  });

  it("treats advance(0) as a true no-op, including revision and action time", () => {
    const machine = new CharacterStateMachine("noa", 0x9abc);
    machine.dispatch(
      { action: "playMotion", character: "noa", motion: "tailSway" },
      "tail",
    );
    const atStart = machine.snapshot();

    machine.advance(0);
    expect(machine.snapshot()).toEqual(atStart);

    machine.advance(250);
    const inMotion = machine.snapshot();
    machine.advance(0);
    expect(machine.snapshot()).toEqual(inMotion);
    expect(machine.snapshot().revision).toBe(atStart.revision);
    expect(machine.snapshot().actionElapsedMs).toBe(250);
  });

  it("emergencyStop clears an uninterruptible action and all queued work", () => {
    const machine = new CharacterStateMachine("noa", 99);
    machine.dispatch(
      { action: "playMotion", character: "noa", motion: "reactLight" },
      "active",
    );
    machine.dispatch(
      { action: "setExpression", character: "noa", expression: "curious" },
      "queued-expression",
    );
    machine.dispatch(
      { action: "lookAtCharacter", character: "noa", target: "riai" },
      "queued-gaze",
    );

    machine.emergencyStop();

    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      motion: "idle",
      gazeTarget: { kind: "forward" },
      mode: "safeIdle",
      priority: 0,
      interruptible: true,
      activeAction: null,
      actionElapsedMs: 0,
      actionProgress: 0,
      queuedActions: [],
    });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 60_001])(
    "rejects unsafe delta %s",
    (deltaMs) => {
      const machine = new CharacterStateMachine("riai", 1);
      expect(() => machine.advance(deltaMs)).toThrow(
        "State-machine delta must be between 0 and 60000 ms.",
      );
    },
  );
});
