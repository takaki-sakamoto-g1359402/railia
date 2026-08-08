import { describe, expect, it } from "vitest";

import { CharacterStateMachine } from "../src/state/character-state-machine";

describe("CharacterStateMachine", () => {
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
    });

    machine.advance(2_399);
    expect(machine.snapshot().expression).toBe("happy");
    machine.advance(1);
    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      motion: "idle",
      mode: "safeIdle",
      priority: 0,
      activeAction: null,
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
      priority: 50,
      queuedActions: ["setExpression", "lookAtCharacter"],
    });

    machine.advance(1_200);
    expect(machine.snapshot()).toMatchObject({
      expression: "happy",
      motion: "idle",
      activeAction: "setExpression",
      queuedActions: ["lookAtCharacter"],
    });

    machine.advance(2_400);
    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      gazeTarget: { kind: "character", target: "noa" },
      activeAction: "lookAtCharacter",
      queuedActions: [],
    });

    machine.advance(1_800);
    expect(machine.snapshot()).toMatchObject({
      expression: "neutral",
      motion: "idle",
      mode: "safeIdle",
      activeAction: null,
      queuedActions: [],
    });
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
