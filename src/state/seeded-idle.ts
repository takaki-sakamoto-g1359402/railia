import type { IdleState } from "./types";
import { CanonicalElapsedTime } from "./canonical-time";

class XorShift32 {
  #state: number;

  public constructor(seed: number) {
    this.#state = (seed >>> 0) || 0x6d2b79f5;
  }

  public next(): number {
    let value = this.#state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.#state = value >>> 0;
    return this.#state / 0x1_0000_0000;
  }

  public range(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.next();
  }
}

/**
 * Deterministic idle behavior. Blink and gaze use independent random streams,
 * so results do not depend on the caller's time-step chunk size.
 */
export class SeededIdleBehavior {
  readonly #blinkRandom: XorShift32;
  readonly #gazeRandom: XorShift32;
  readonly #phase: number;
  readonly #time = new CanonicalElapsedTime();
  #nextBlinkAtMs: number;
  #blinkUntilMs = -1;
  #nextGazeAtMs: number;
  #gazeX = 0;
  #gazeY = 0;
  #eventSequence = 0;

  public constructor(seed: number) {
    this.#blinkRandom = new XorShift32(seed ^ 0xa5a5a5a5);
    this.#gazeRandom = new XorShift32(seed ^ 0x5a5a5a5a);
    this.#phase = (seed >>> 0) / 0xffff_ffff;
    this.#nextBlinkAtMs = this.#blinkRandom.range(1_400, 2_800);
    this.#nextGazeAtMs = this.#gazeRandom.range(900, 1_800);
  }

  public advance(deltaMs: number): IdleState {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new Error("Idle delta must be a finite non-negative number.");
    }
    const elapsedMs = this.#time.advance(deltaMs).elapsedMs;

    while (elapsedMs >= this.#nextBlinkAtMs) {
      this.#blinkUntilMs = this.#nextBlinkAtMs + 115;
      this.#nextBlinkAtMs =
        this.#blinkUntilMs + this.#blinkRandom.range(1_600, 3_600);
      this.#eventSequence += 1;
    }

    while (elapsedMs >= this.#nextGazeAtMs) {
      this.#gazeX = this.#gazeRandom.range(-0.22, 0.22);
      this.#gazeY = this.#gazeRandom.range(-0.12, 0.18);
      this.#nextGazeAtMs += this.#gazeRandom.range(1_300, 2_900);
      this.#eventSequence += 1;
    }

    return this.snapshot();
  }

  public snapshot(): IdleState {
    const elapsedMs = this.#time.elapsedMs();
    const breathAngle =
      (elapsedMs / 3_200 + this.#phase) * Math.PI * 2;
    const swayAngle =
      (elapsedMs / 4_600 + this.#phase * 0.5) * Math.PI * 2;
    return Object.freeze({
      blinkOpen:
        elapsedMs >= this.#blinkUntilMs - 115 &&
        elapsedMs < this.#blinkUntilMs
          ? 0.08
          : 1,
      breath: 0.5 + Math.sin(breathAngle) * 0.5,
      sway: Math.sin(swayAngle),
      gazeX: this.#gazeX,
      gazeY: this.#gazeY,
      eventSequence: this.#eventSequence,
    });
  }
}
