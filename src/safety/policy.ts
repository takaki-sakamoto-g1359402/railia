import {
  isCharacterScopedAction,
  isEmergencyStop,
  type ActionEnvelope,
  type CharacterScopedAction,
} from "../actions/types";
import { CHARACTER_CAPABILITIES } from "../characters/catalog";

export type PolicyFailureCode =
  | "DUPLICATE_REQUEST"
  | "EMERGENCY_STOP_MUST_BE_SOLE_ACTION"
  | "CHARACTER_CAPABILITY_REJECTED"
  | "SELF_TARGET_REJECTED"
  | "QUEUE_CAPACITY_REJECTED";

export interface PolicySuccess {
  readonly ok: true;
}

export interface PolicyFailure {
  readonly ok: false;
  readonly code: PolicyFailureCode;
  readonly message: string;
}

export type PolicyResult = PolicySuccess | PolicyFailure;

export interface PolicyContext {
  readonly duplicateRequest: boolean;
  readonly canAcceptBatch: (actions: readonly CharacterScopedAction[]) => boolean;
}

export class CharacterSafetyPolicy {
  public evaluate(
    envelope: Readonly<ActionEnvelope>,
    context: PolicyContext,
  ): PolicyResult {
    if (context.duplicateRequest) {
      return {
        ok: false,
        code: "DUPLICATE_REQUEST",
        message: "The requestId has already been accepted.",
      };
    }

    const emergencyActions = envelope.actions.filter(isEmergencyStop);
    if (emergencyActions.length > 0 && envelope.actions.length !== 1) {
      return {
        ok: false,
        code: "EMERGENCY_STOP_MUST_BE_SOLE_ACTION",
        message: "emergencyStop must be the only action in its request.",
      };
    }
    if (emergencyActions.length === 1) {
      return { ok: true };
    }

    const scopedActions = envelope.actions.filter(isCharacterScopedAction);
    for (const action of scopedActions) {
      const capabilities = CHARACTER_CAPABILITIES[action.character];
      if (
        action.action === "setExpression" &&
        !capabilities.expressions.has(action.expression)
      ) {
        return {
          ok: false,
          code: "CHARACTER_CAPABILITY_REJECTED",
          message: `${action.character} does not allow expression ${action.expression}.`,
        };
      }
      if (
        action.action === "playMotion" &&
        !capabilities.motions.has(action.motion)
      ) {
        return {
          ok: false,
          code: "CHARACTER_CAPABILITY_REJECTED",
          message: `${action.character} does not allow motion ${action.motion}.`,
        };
      }
      if (
        action.action === "lookAtCharacter" &&
        action.character === action.target
      ) {
        return {
          ok: false,
          code: "SELF_TARGET_REJECTED",
          message: "A character cannot target itself with lookAtCharacter.",
        };
      }
    }

    if (!context.canAcceptBatch(scopedActions)) {
      return {
        ok: false,
        code: "QUEUE_CAPACITY_REJECTED",
        message: "The action queue cannot safely accept this batch.",
      };
    }
    return { ok: true };
  }
}

