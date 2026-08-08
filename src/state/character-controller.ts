import type {
  CharacterId,
  CharacterScopedAction,
} from "../actions/types";
import {
  CharacterStateMachine,
  type DispatchRecord,
} from "./character-state-machine";
import type { WorldSnapshot } from "./types";

export class CharacterController {
  readonly #machines: Readonly<Record<CharacterId, CharacterStateMachine>>;
  #elapsedMs = 0;
  #emergencyStopCount = 0;

  public constructor(seed = 0x52494149) {
    this.#machines = {
      riai: new CharacterStateMachine("riai", seed ^ 0x13579bdf),
      noa: new CharacterStateMachine("noa", seed ^ 0x2468ace0),
    };
  }

  public canAcceptBatch(actions: readonly CharacterScopedAction[]): boolean {
    const counts: Record<CharacterId, number> = { riai: 0, noa: 0 };
    for (const action of actions) {
      counts[action.character] += 1;
    }
    return (
      this.#machines.riai.canAccept(counts.riai) &&
      this.#machines.noa.canAccept(counts.noa)
    );
  }

  public dispatchBatch(
    actions: readonly CharacterScopedAction[],
    requestId: string,
  ): readonly DispatchRecord[] {
    if (!this.canAcceptBatch(actions)) {
      throw new Error("Action batch exceeds safe queue capacity.");
    }
    return actions.map((action) =>
      this.#machines[action.character].dispatch(action, requestId),
    );
  }

  public advanceTime(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 60_000) {
      throw new Error("Controller delta must be between 0 and 60000 ms.");
    }
    this.#elapsedMs += deltaMs;
    this.#machines.riai.advance(deltaMs);
    this.#machines.noa.advance(deltaMs);
  }

  public emergencyStop(): void {
    this.#machines.riai.emergencyStop();
    this.#machines.noa.emergencyStop();
    this.#emergencyStopCount += 1;
  }

  public snapshot(): WorldSnapshot {
    return Object.freeze({
      elapsedMs: this.#elapsedMs,
      emergencyStopCount: this.#emergencyStopCount,
      characters: Object.freeze({
        riai: this.#machines.riai.snapshot(),
        noa: this.#machines.noa.snapshot(),
      }),
    });
  }
}

