import type { CharacterScopedAction } from "./types";
import { isCharacterScopedAction, isEmergencyStop } from "./types";
import {
  CharacterActionValidator,
  isStrictSoleEmergencyCandidateJson,
} from "./validator";
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
  | "RUNTIME_FAILED"
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
  readonly maxAttemptsPerWindow?: number;
  readonly attemptWindowMs?: number;
}

export class CharacterActionApi {
  readonly #validator = new CharacterActionValidator();
  readonly #policy = new CharacterSafetyPolicy();
  readonly #replayGuard = new ReplayGuard();
  readonly #actionRateLimiter: SlidingWindowRateLimiter;
  readonly #attemptRateLimiter: SlidingWindowRateLimiter;
  readonly #controller: CharacterController;
  readonly #runtime: CharacterRuntimeAdapter;
  public readonly logger: AuditLogger;

  public constructor(options: CharacterActionApiOptions) {
    const clock = options.clock ?? Date.now;
    this.#controller = options.controller ?? new CharacterController();
    this.#runtime = options.runtime;
    this.logger = options.logger ?? new AuditLogger(clock);
    const actionWindowMs = options.rateWindowMs ?? 10_000;
    this.#actionRateLimiter = new SlidingWindowRateLimiter(
      options.maxActionCostPerWindow ?? 12,
      actionWindowMs,
      clock,
    );
    this.#attemptRateLimiter = new SlidingWindowRateLimiter(
      options.maxAttemptsPerWindow ?? 32,
      options.attemptWindowMs ?? actionWindowMs,
      clock,
    );
    this.#runtime.initialize(this.#controller.snapshot());
  }

  public executeJson(rawJson: string): ExecutionResult {
    // Consume the cheap attempt budget before parsing, scanning, or invoking
    // the compiled schema. Once exhausted, only a tightly bounded, exact-shape
    // emergency candidate may proceed to mandatory full validation.
    const attemptAllowed = this.#attemptRateLimiter.allow();
    if (
      !attemptAllowed &&
      !isStrictSoleEmergencyCandidateJson(rawJson)
    ) {
      return this.#attemptRateLimited(null);
    }

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
    const firstAction = envelope.actions[0];
    const soleEmergency =
      envelope.actions.length === 1 &&
      firstAction !== undefined &&
      isEmergencyStop(firstAction);

    // The cheap candidate check is intentionally narrower than the full
    // validator. Fail closed if either contract ever drifts out of sync.
    if (!attemptAllowed && !soleEmergency) {
      return this.#attemptRateLimited(envelope.requestId);
    }

    const scopedActions = envelope.actions.filter(isCharacterScopedAction);
    const duplicateRequest = this.#replayGuard.has(envelope.requestId);
    const policy = this.#policy.evaluate(envelope, {
      duplicateRequest,
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

    if (soleEmergency) {
      return this.#executeEmergencyStop(envelope.requestId, duplicateRequest);
    }

    if (!this.#actionRateLimiter.allow(scopedActions.length)) {
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
    try {
      this.#runtime.render(this.#controller.snapshot());
    } catch {
      return this.#runtimeFailure(envelope.requestId, "render", false, false);
    }
    this.#rememberAcceptedRequest(envelope.requestId);
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
    try {
      this.#runtime.render(snapshot);
    } catch {
      return this.#runtimeFailure(null, "advanceTime.render", false, false)
        .snapshot;
    }
    return snapshot;
  }

  public snapshot(): WorldSnapshot {
    return this.#controller.snapshot();
  }

  public dispose(): void {
    this.#runtime.dispose();
  }

  #executeEmergencyStop(
    requestId: string,
    duplicateRequest: boolean,
  ): ExecutionResult {
    this.#controller.emergencyStop();
    try {
      this.#runtime.emergencyReset(this.#controller.snapshot());
    } catch {
      return this.#runtimeFailure(
        requestId,
        "emergencyReset",
        true,
        true,
      );
    }

    this.#rememberAcceptedRequest(requestId);
    this.logger.record({
      outcome: "accepted",
      code: duplicateRequest
        ? "EMERGENCY_STOP_REASSERTED"
        : "EMERGENCY_STOPPED",
      requestId,
      action: "emergencyStop",
      character: null,
      detail: duplicateRequest
        ? "Duplicate emergency request reasserted neutral safe idle."
        : "Queues cleared; both characters restored to neutral safe idle.",
    });
    return this.#result(
      true,
      "EMERGENCY_STOPPED",
      "Emergency stop restored neutral safe idle.",
      requestId,
      1,
    );
  }

  #attemptRateLimited(requestId: string | null): ExecutionResult {
    this.logger.record({
      outcome: "rejected",
      code: "ATTEMPT_RATE_LIMITED",
      requestId,
      action: null,
      character: null,
      detail: "Request attempt exceeded the sliding-window safety limit.",
    });
    return this.#result(
      false,
      "RATE_LIMITED",
      "Request attempt rate limit exceeded.",
      requestId,
      0,
    );
  }

  #rememberAcceptedRequest(requestId: string): void {
    const replayResult = this.#replayGuard.remember(requestId);
    if (replayResult.evictedRequestId === null) {
      return;
    }
    this.logger.record({
      outcome: "system",
      code: "REPLAY_WINDOW_EVICTED",
      requestId: replayResult.evictedRequestId,
      action: null,
      character: null,
      detail:
        "Oldest accepted requestId left the bounded replay window and may be accepted again.",
    });
  }

  #runtimeFailure(
    requestId: string | null,
    operation: "render" | "advanceTime.render" | "emergencyReset",
    controllerAlreadySafe: boolean,
    runtimeResetAlreadyAttempted: boolean,
  ): ExecutionResult {
    if (!controllerAlreadySafe) {
      this.#controller.emergencyStop();
    }

    let runtimeResetSucceeded = false;
    if (!runtimeResetAlreadyAttempted) {
      try {
        this.#runtime.emergencyReset(this.#controller.snapshot());
        runtimeResetSucceeded = true;
      } catch {
        runtimeResetSucceeded = false;
      }
    }

    this.logger.record({
      outcome: "system",
      code: "RUNTIME_FAILED",
      requestId,
      action: null,
      character: null,
      detail: `${operation} failed; controller entered neutral safe idle; runtimeReset=${runtimeResetSucceeded ? "succeeded" : "failed"}.`,
    });
    return this.#result(
      false,
      "RUNTIME_FAILED",
      runtimeResetSucceeded
        ? "Runtime failed; neutral safe idle was restored."
        : "Runtime failed; controller entered neutral safe idle but runtime reset failed.",
      requestId,
      0,
    );
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
