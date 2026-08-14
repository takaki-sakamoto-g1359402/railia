import type { Clock } from "../safety/rate-limiter";

export type AuditOutcome = "accepted" | "rejected" | "system";

export interface AuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly outcome: AuditOutcome;
  readonly code: string;
  readonly requestId: string | null;
  readonly action: string | null;
  readonly character: string | null;
  readonly detail: string;
}

export type AuditListener = (entries: readonly AuditEntry[]) => void;

export class AuditLogger {
  readonly #entries: AuditEntry[] = [];
  readonly #listeners = new Set<AuditListener>();
  #sequence = 0;

  public constructor(
    private readonly clock: Clock = Date.now,
    private readonly capacity = 100,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Audit capacity must be a positive integer.");
    }
  }

  public record(
    entry: Omit<AuditEntry, "id" | "timestamp">,
  ): AuditEntry {
    this.#sequence += 1;
    const recorded: AuditEntry = Object.freeze({
      ...entry,
      id: `audit-${String(this.#sequence).padStart(6, "0")}`,
      timestamp: new Date(this.clock()).toISOString(),
    });
    this.#entries.push(recorded);
    if (this.#entries.length > this.capacity) {
      this.#entries.shift();
    }
    this.#emit();
    return recorded;
  }

  public entries(): readonly AuditEntry[] {
    return [...this.#entries];
  }

  public subscribe(listener: AuditListener): () => void {
    this.#listeners.add(listener);
    this.#notify(listener, this.#listenerSnapshot());
    return () => this.#listeners.delete(listener);
  }

  readonly #emit = (): void => {
    const snapshot = this.#listenerSnapshot();
    for (const listener of this.#listeners) {
      this.#notify(listener, snapshot);
    }
  };

  #listenerSnapshot(): readonly AuditEntry[] {
    return Object.freeze(this.entries());
  }

  /**
   * Audit observers are presentation/telemetry consumers, never part of the
   * action transaction. A broken observer must not reject an already-recorded
   * action or prevent healthy observers from receiving the same snapshot.
   */
  #notify(listener: AuditListener, snapshot: readonly AuditEntry[]): void {
    try {
      listener(snapshot);
    } catch {
      // Intentionally isolated. Recording another audit event here would
      // recurse through the same failing subscriber.
    }
  }
}
