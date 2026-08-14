import type {
  CharacterId,
  CharacterScopedAction,
} from "../actions/types";
import { describeAction, type ActionDescriptor } from "./action-priority";
import { SeededIdleBehavior } from "./seeded-idle";
import type { CharacterSnapshot, GazeTarget, IdleState } from "./types";
import {
  CanonicalElapsedTime,
  TIME_CANONICAL_SCALE,
  canonicalizeMilliseconds,
} from "./canonical-time";

export const MAX_QUEUED_ACTIONS_PER_CHARACTER = 16;

export type DispatchDisposition = "started" | "queued" | "interrupted";

export interface DispatchRecord {
  readonly disposition: DispatchDisposition;
  readonly action: string;
  readonly character: CharacterId;
  readonly requestId: string;
}

interface ScheduledAction {
  readonly action: CharacterScopedAction;
  readonly descriptor: ActionDescriptor;
  readonly requestId: string;
  readonly sequence: number;
}

interface ActiveAction extends ScheduledAction {
  readonly durationMs: number;
  elapsedMs: number;
  remainingMs: number;
}

interface MutableCharacterState {
  expression: CharacterSnapshot["expression"];
  motion: CharacterSnapshot["motion"];
  gazeTarget: GazeTarget;
  mode: CharacterSnapshot["mode"];
  priority: number;
  interruptible: boolean;
  activeAction: string | null;
  idle: IdleState;
  revision: number;
}

export class CharacterStateMachine {
  readonly #idle: SeededIdleBehavior;
  readonly #queue: ScheduledAction[] = [];
  readonly #state: MutableCharacterState;
  #active: ActiveAction | null = null;
  #sequence = 0;
  readonly #time = new CanonicalElapsedTime();

  public constructor(
    public readonly character: CharacterId,
    seed: number,
  ) {
    this.#idle = new SeededIdleBehavior(seed);
    this.#state = {
      expression: "neutral",
      motion: "idle",
      gazeTarget: { kind: "forward" },
      mode: "safeIdle",
      priority: 0,
      interruptible: true,
      activeAction: null,
      idle: this.#idle.snapshot(),
      revision: 0,
    };
  }

  public canAccept(additionalCount: number): boolean {
    return (
      Number.isInteger(additionalCount) &&
      additionalCount >= 0 &&
      this.#queue.length + additionalCount <=
        MAX_QUEUED_ACTIONS_PER_CHARACTER
    );
  }

  public dispatch(
    action: CharacterScopedAction,
    requestId: string,
  ): DispatchRecord {
    this.#sequence += 1;
    const scheduled: ScheduledAction = {
      action,
      descriptor: describeAction(action),
      requestId,
      sequence: this.#sequence,
    };

    if (this.#active === null) {
      this.#start(scheduled);
      return this.#record("started", scheduled);
    }

    if (
      this.#active.descriptor.interruptible &&
      scheduled.descriptor.priority >= this.#active.descriptor.priority
    ) {
      this.#restoreChannel(this.#active.action);
      this.#start(scheduled);
      return this.#record("interrupted", scheduled);
    }

    if (this.#queue.length >= MAX_QUEUED_ACTIONS_PER_CHARACTER) {
      throw new Error(`Safe action queue is full for ${this.character}.`);
    }
    this.#queue.push(scheduled);
    this.#queue.sort(
      (left, right) =>
        right.descriptor.priority - left.descriptor.priority ||
        left.sequence - right.sequence,
    );
    this.#touch();
    return this.#record("queued", scheduled);
  }

  public advance(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 60_000) {
      throw new Error("State-machine delta must be between 0 and 60000 ms.");
    }
    if (deltaMs === 0) {
      return;
    }
    const effectiveDeltaMs = this.#time.advance(deltaMs).deltaMs;
    if (effectiveDeltaMs === 0) {
      return;
    }
    this.#state.idle = this.#idle.advance(effectiveDeltaMs);

    let unconsumedMs = effectiveDeltaMs;
    while (
      this.#active !== null &&
      unconsumedMs + 1 / TIME_CANONICAL_SCALE >= this.#active.remainingMs
    ) {
      this.#active.elapsedMs = this.#active.durationMs;
      unconsumedMs = Math.max(0, unconsumedMs - this.#active.remainingMs);
      this.#completeActive();
      this.#startNext();
    }
    if (this.#active !== null) {
      this.#active.elapsedMs = canonicalizeMilliseconds(
        this.#active.elapsedMs + unconsumedMs,
      );
      this.#active.remainingMs = canonicalizeMilliseconds(
        this.#active.remainingMs - unconsumedMs,
      );
    } else {
      this.#state.gazeTarget = {
        kind: "point",
        x: this.#state.idle.gazeX,
        y: this.#state.idle.gazeY,
      };
    }
  }

  public emergencyStop(): void {
    this.#queue.length = 0;
    this.#active = null;
    this.#state.expression = "neutral";
    this.#state.motion = "idle";
    this.#state.gazeTarget = { kind: "forward" };
    this.#state.mode = "safeIdle";
    this.#state.priority = 0;
    this.#state.interruptible = true;
    this.#state.activeAction = null;
    this.#touch();
  }

  public snapshot(): CharacterSnapshot {
    const actionElapsedMs = this.#active?.elapsedMs ?? 0;
    const actionProgress =
      this.#active === null
        ? 0
        : Math.min(1, actionElapsedMs / this.#active.durationMs);
    const gazeTarget =
      this.#state.gazeTarget.kind === "point"
        ? { ...this.#state.gazeTarget }
        : this.#state.gazeTarget.kind === "character"
          ? { ...this.#state.gazeTarget }
          : ({ kind: "forward" } as const);
    return Object.freeze({
      id: this.character,
      expression: this.#state.expression,
      motion: this.#state.motion,
      gazeTarget,
      mode: this.#state.mode,
      priority: this.#state.priority,
      interruptible: this.#state.interruptible,
      activeAction: this.#state.activeAction,
      actionElapsedMs,
      actionProgress,
      queuedActions: Object.freeze(
        this.#queue.map((item) => item.action.action),
      ),
      idle: Object.freeze({ ...this.#state.idle }),
      revision: this.#state.revision,
    });
  }

  #start(scheduled: ScheduledAction): void {
    const durationMs = Math.max(1, scheduled.descriptor.durationMs);
    this.#active = {
      ...scheduled,
      durationMs,
      elapsedMs: 0,
      remainingMs: durationMs,
    };
    this.#applyAction(scheduled.action);
    this.#state.mode = "acting";
    this.#state.priority = scheduled.descriptor.priority;
    this.#state.interruptible = scheduled.descriptor.interruptible;
    this.#state.activeAction = scheduled.action.action;
    this.#touch();
  }

  #startNext(): void {
    const next = this.#queue.shift();
    if (next === undefined) {
      this.#state.mode = "safeIdle";
      this.#state.priority = 0;
      this.#state.interruptible = true;
      this.#state.activeAction = null;
      this.#touch();
      return;
    }
    this.#start(next);
  }

  #completeActive(): void {
    if (this.#active === null) {
      return;
    }
    this.#restoreChannel(this.#active.action);
    this.#active = null;
  }

  #restoreChannel(action: CharacterScopedAction): void {
    switch (action.action) {
      case "setExpression":
        this.#state.expression = "neutral";
        break;
      case "lookAt":
      case "lookAtCharacter":
        this.#state.gazeTarget = { kind: "forward" };
        break;
      case "playMotion":
        this.#state.motion = "idle";
        break;
    }
  }

  #applyAction(action: CharacterScopedAction): void {
    switch (action.action) {
      case "setExpression":
        this.#state.expression = action.expression;
        break;
      case "lookAt":
        this.#state.gazeTarget = {
          kind: "point",
          x: action.x,
          y: action.y,
        };
        break;
      case "lookAtCharacter":
        this.#state.gazeTarget = {
          kind: "character",
          target: action.target,
        };
        break;
      case "playMotion":
        this.#state.motion = action.motion;
        break;
    }
  }

  #record(
    disposition: DispatchDisposition,
    scheduled: ScheduledAction,
  ): DispatchRecord {
    return Object.freeze({
      disposition,
      action: scheduled.action.action,
      character: this.character,
      requestId: scheduled.requestId,
    });
  }

  #touch(): void {
    this.#state.revision += 1;
  }
}
