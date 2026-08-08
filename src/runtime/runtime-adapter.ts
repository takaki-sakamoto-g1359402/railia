import type { WorldSnapshot } from "../state/types";

export interface CharacterRuntimeAdapter {
  /** `cubism` is reserved for a future verified SDK adapter. */
  readonly kind: "mock" | "cubism";
  initialize(snapshot: WorldSnapshot): void;
  render(snapshot: WorldSnapshot): void;
  emergencyReset(snapshot: WorldSnapshot): void;
  dispose(): void;
}

export class RecordingMockRuntime implements CharacterRuntimeAdapter {
  public readonly kind = "mock" as const;
  #latest: WorldSnapshot | null = null;
  #renderCount = 0;
  #emergencyResetCount = 0;

  public initialize(snapshot: WorldSnapshot): void {
    this.#latest = snapshot;
  }

  public render(snapshot: WorldSnapshot): void {
    this.#latest = snapshot;
    this.#renderCount += 1;
  }

  public emergencyReset(snapshot: WorldSnapshot): void {
    this.#latest = snapshot;
    this.#emergencyResetCount += 1;
    this.#renderCount += 1;
  }

  public dispose(): void {
    this.#latest = null;
  }

  public latest(): WorldSnapshot | null {
    return this.#latest;
  }

  public renderCount(): number {
    return this.#renderCount;
  }

  public emergencyResetCount(): number {
    return this.#emergencyResetCount;
  }
}

