export const DEFAULT_REPLAY_GUARD_CAPACITY = 128;

export interface ReplayRememberResult {
  readonly remembered: boolean;
  readonly evictedRequestId: string | null;
}

/**
 * Session-local, bounded replay window.
 *
 * Once `capacity` unique accepted IDs are retained, remembering another ID
 * deterministically evicts the oldest one. An evicted ID can be accepted
 * again; this guard is not durable idempotency across sessions or an
 * unbounded security-nonce store. `remember` reports every eviction so the
 * caller can audit that change in replay coverage.
 */
export class ReplayGuard {
  readonly #acceptedIds = new Set<string>();
  readonly #order: string[] = [];

  public constructor(
    private readonly capacity = DEFAULT_REPLAY_GUARD_CAPACITY,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Replay-guard capacity must be a positive integer.");
    }
  }

  public has(requestId: string): boolean {
    return this.#acceptedIds.has(requestId);
  }

  public remember(requestId: string): Readonly<ReplayRememberResult> {
    if (this.#acceptedIds.has(requestId)) {
      return Object.freeze({ remembered: false, evictedRequestId: null });
    }
    this.#acceptedIds.add(requestId);
    this.#order.push(requestId);
    let evictedRequestId: string | null = null;
    if (this.#order.length > this.capacity) {
      const expired = this.#order.shift();
      if (expired !== undefined) {
        this.#acceptedIds.delete(expired);
        evictedRequestId = expired;
      }
    }
    return Object.freeze({ remembered: true, evictedRequestId });
  }

  public reset(): void {
    this.#acceptedIds.clear();
    this.#order.length = 0;
  }
}
