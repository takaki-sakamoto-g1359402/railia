import type { CharacterScopedAction } from "./types";
import { isCharacterScopedAction, isEmergencyStop } from "./types";
import { CharacterActionValidator } from "./validator";
import { AuditLogger } from "../logging/audit-logger";
import type { CharacterRuntimeAdapter } from "../runtime/runtime-adapter";
import { CharacterSafetyPolicy } from "../safety/policy";
import { SlidingWindowRateLimiter, type Clock } from "../safety/rate-limiter";
import { ReplayGuard } from "../safety/replay-guard";
import { CharacterController } from "../state/character-controller";
import type { WorldSnapshot } from "../state/types";

export type ExecutionCode =
  | "ACCEPTED"
  | "EMERGENCY_STOPPED"
  | "VALIDATION_REJECTED"
  | "POLICY_REJECTED"
  | "RATE_LIMITED";

export interface ExecutionResult {
  readonly accepted: boolean;
  readonly code: ExecutionCode;
  readonly message: string;
  readonly requestId: string | null;
  readonly dispatchedActions: number;
  readonly snapshot: WorldSnapshot;
}

export interface CharacterActionApiOptions {
  readonly runtime: CharacterRuntimeAdapter;
  readonly controller?: CharacterController;
  readonly logger?: AuditLogger;
  readonly clock?: Clock;
  readonly maxActionCostPerWindow?: number;
  readonly rateWindowMs?: number;
}

export class CharacterActionApi {
  readonly #validator = new CharacterActionValidator();
  readonly #policy = new CharacterSafetyPolicy();
  readonly #replayGuard = new ReplayGuard();
  readonly #rateLimiter: SlidingWindowRateLimiter;
  readonly #controller: CharacterController;
  readonly #runtime: CharacterRuntimeAdapter;
  public readonly logger: AuditLogger;

  public constructor(options: CharacterActionApiOptions) {
    const clock = options.clock ?? Date.now;
    this.#controller = options.controller ?? new CharacterController();
    this.#runtime = options.runtime;
    this.logger = options.logger ?? new AuditLogger(clock);
    this.#rateLimiter = new SlidingWindowRateLimiter(
      options.maxActionCostPerWindow ?? 12,
      options.rateWindowMs ?? 10_000,
      clock,
    );
    this.#runtime.initialize(this.#controller.snapshot());
  }

  public executeJson(rawJson: string): ExecutionResult {
    const validation = this.#validator.validateJson(rawJson);
    if (!validation.ok) {
      this.logger.record({
        outcome: "rejected",
        code: validation.code,
        requestId: null,
        action: null,
        character: null,
        detail: `${validation.message} bytes=${validation.byteLength}`,
      });
      return this.#result(
        false,
        "VALIDATION_REJECTED",
        validation.message,
        null,
        0,
      );
    }

    const envelope = validation.envelope;
    const scopedActions = envelope.actions.filter(isCharacterScopedAction);
    const policy = this.#policy.evaluate(envelope, {
      duplicateRequest: this.#replayGuard.has(envelope.requestId),
      canAcceptBatch: (actions) => this.#controller.canAcceptBatch(actions),
    });
    if (!policy.ok) {
      this.logger.record({
        outcome: "rejected",
        code: policy.code,
        requestId: envelope.requestId,
        action: null,
        character: null,
        detail: policy.message,
      });
      return this.#result(
        false,
        "POLICY_REJECTED",
        policy.message,
        envelope.requestId,
        0,
      );
    }

    if (envelope.actions.length === 1 && isEmergencyStop(envelope.actions[0]!)) {
      this.#controller.emergencyStop();
      this.#runtime.emergencyReset(this.#controller.snapshot());
      this.#replayGuard.remember(envelope.requestId);
      this.logger.record({
        outcome: "accepted",
        code: "EMERGENCY_STOPPED",
        requestId: envelope.requestId,
        action: "emergencyStop",
        character: null,
        detail: "Queues cleared; both characters restored to neutral safe idle.",
      });
      return this.#result(
        true,
        "EMERGENCY_STOPPED",
        "Emergency stop restored neutral safe idle.",
        envelope.requestId,
        1,
      );
    }

    if (!this.#rateLimiter.allow(scopedActions.length)) {
      this.logger.record({
        outcome: "rejected",
        code: "RATE_LIMITED",
        requestId: envelope.requestId,
        action: null,
        character: null,
        detail: "Action cost exceeded the sliding-window safety limit.",
      });
      return this.#result(
        false,
        "RATE_LIMITED",
        "Action rate limit exceeded.",
        envelope.requestId,
        0,
      );
    }

    const dispatches = this.#controller.dispatchBatch(
      scopedActions as readonly CharacterScopedAction[],
      envelope.requestId,
    );
    this.#replayGuard.remember(envelope.requestId);
    this.#runtime.render(this.#controller.snapshot());
    for (const dispatch of dispatches) {
      this.logger.record({
        outcome: "accepted",
        code: dispatch.disposition.toUpperCase(),
        requestId: dispatch.requestId,
        action: dispatch.action,
        character: dispatch.character,
        detail: `High-level action ${dispatch.disposition}; no raw parameters exposed.`,
      });
    }
    return this.#result(
      true,
      "ACCEPTED",
      "Validated high-level actions were accepted.",
      envelope.requestId,
      dispatches.length,
    );
  }

  public advanceTime(deltaMs: number): WorldSnapshot {
    this.#controller.advanceTime(deltaMs);
    const snapshot = this.#controller.snapshot();
    this.#runtime.render(snapshot);
    return snapshot;
  }

  public snapshot(): WorldSnapshot {
    return this.#controller.snapshot();
  }

  public dispose(): void {
    this.#runtime.dispose();
  }

  #result(
    accepted: boolean,
    code: ExecutionCode,
    message: string,
    requestId: string | null,
    dispatchedActions: number,
  ): ExecutionResult {
    return Object.freeze({
      accepted,
      code,
      message,
      requestId,
      dispatchedActions,
      snapshot: this.#controller.snapshot(),
    });
  }
}

