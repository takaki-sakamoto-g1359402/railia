export type Clock = () => number;

interface RateEntry {
  readonly timestampMs: number;
  readonly cost: number;
}

export class SlidingWindowRateLimiter {
  readonly #entries: RateEntry[] = [];

  public constructor(
    private readonly maxCost: number,
    private readonly windowMs: number,
    private readonly clock: Clock = Date.now,
  ) {
    if (maxCost < 1 || windowMs < 1) {
      throw new Error("Rate-limit configuration must be positive.");
    }
  }

  public allow(cost = 1): boolean {
    if (!Number.isInteger(cost) || cost < 1) {
      return false;
    }
    const now = this.clock();
    const cutoff = now - this.windowMs;
    while (
      this.#entries.length > 0 &&
      (this.#entries[0]?.timestampMs ?? Number.POSITIVE_INFINITY) <= cutoff
    ) {
      this.#entries.shift();
    }
    const consumed = this.#entries.reduce((sum, entry) => sum + entry.cost, 0);
    if (consumed + cost > this.maxCost) {
      return false;
    }
    this.#entries.push({ timestampMs: now, cost });
    return true;
  }

  public reset(): void {
    this.#entries.length = 0;
  }
}

