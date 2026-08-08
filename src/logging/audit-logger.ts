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
    listener(this.entries());
    return () => this.#listeners.delete(listener);
  }

  readonly #emit = (): void => {
    const snapshot = this.entries();
    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  };
}

