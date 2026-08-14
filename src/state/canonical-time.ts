/**
 * Phase 1 time is represented at microsecond precision. Keeping the raw
 * floating-point sum and quantizing the cumulative value (rather than each
 * individual delta) makes equivalent fractional step partitions converge to
 * the same public elapsed time.
 */
export const TIME_CANONICAL_SCALE = 1_000_000;

export function canonicalizeMilliseconds(value: number): number {
  return Math.round(value * TIME_CANONICAL_SCALE) / TIME_CANONICAL_SCALE;
}

export interface CanonicalTimeStep {
  readonly elapsedMs: number;
  readonly deltaMs: number;
}

export class CanonicalElapsedTime {
  #rawElapsedMs = 0;
  #elapsedMs = 0;

  public advance(deltaMs: number): CanonicalTimeStep {
    this.#rawElapsedMs += deltaMs;
    const elapsedMs = canonicalizeMilliseconds(this.#rawElapsedMs);
    const effectiveDeltaMs = canonicalizeMilliseconds(
      elapsedMs - this.#elapsedMs,
    );
    this.#elapsedMs = elapsedMs;
    return Object.freeze({
      elapsedMs,
      deltaMs: effectiveDeltaMs,
    });
  }

  public elapsedMs(): number {
    return this.#elapsedMs;
  }
}
