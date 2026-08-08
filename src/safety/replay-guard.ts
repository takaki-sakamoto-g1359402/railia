export class ReplayGuard {
  readonly #acceptedIds = new Set<string>();
  readonly #order: string[] = [];

  public constructor(private readonly capacity = 128) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Replay-guard capacity must be a positive integer.");
    }
  }

  public has(requestId: string): boolean {
    return this.#acceptedIds.has(requestId);
  }

  public remember(requestId: string): void {
    if (this.#acceptedIds.has(requestId)) {
      return;
    }
    this.#acceptedIds.add(requestId);
    this.#order.push(requestId);
    if (this.#order.length > this.capacity) {
      const expired = this.#order.shift();
      if (expired !== undefined) {
        this.#acceptedIds.delete(expired);
      }
    }
  }

  public reset(): void {
    this.#acceptedIds.clear();
    this.#order.length = 0;
  }
}

