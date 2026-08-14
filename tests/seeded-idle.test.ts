import { describe, expect, it } from "vitest";

import { SeededIdleBehavior } from "../src/state/seeded-idle";

describe("SeededIdleBehavior", () => {
  it("produces identical results for the same seed independent of time-step chunking", () => {
    const singleStep = new SeededIdleBehavior(0x12345678);
    const chunked = new SeededIdleBehavior(0x12345678);

    const singleSnapshot = singleStep.advance(10_000);
    for (let index = 0; index < 10; index += 1) {
      chunked.advance(1_000);
    }

    expect(chunked.snapshot()).toEqual(singleSnapshot);
  });

  it("canonicalizes equivalent fractional step partitions", () => {
    const singleStep = new SeededIdleBehavior(0x87654321);
    const fractionalSteps = new SeededIdleBehavior(0x87654321);

    const singleSnapshot = singleStep.advance(1);
    for (let index = 0; index < 10; index += 1) {
      fractionalSteps.advance(0.1);
    }

    expect(fractionalSteps.snapshot()).toEqual(singleSnapshot);
  });

  it("uses the seed to produce a distinct deterministic stream", () => {
    const left = new SeededIdleBehavior(111);
    const right = new SeededIdleBehavior(222);

    expect(left.advance(5_000)).not.toEqual(right.advance(5_000));
  });

  it("keeps blink, breathing, sway, and gaze inside their documented bounds", () => {
    const idle = new SeededIdleBehavior(333);

    for (let index = 0; index < 200; index += 1) {
      const snapshot = idle.advance(100);
      expect(snapshot.blinkOpen).toBeGreaterThanOrEqual(0.08);
      expect(snapshot.blinkOpen).toBeLessThanOrEqual(1);
      expect(snapshot.breath).toBeGreaterThanOrEqual(0);
      expect(snapshot.breath).toBeLessThanOrEqual(1);
      expect(snapshot.sway).toBeGreaterThanOrEqual(-1);
      expect(snapshot.sway).toBeLessThanOrEqual(1);
      expect(snapshot.gazeX).toBeGreaterThanOrEqual(-0.22);
      expect(snapshot.gazeX).toBeLessThanOrEqual(0.22);
      expect(snapshot.gazeY).toBeGreaterThanOrEqual(-0.12);
      expect(snapshot.gazeY).toBeLessThanOrEqual(0.18);
    }
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid delta %s",
    (deltaMs) => {
      const idle = new SeededIdleBehavior(1);
      expect(() => idle.advance(deltaMs)).toThrow(
        "Idle delta must be a finite non-negative number.",
      );
    },
  );
});
