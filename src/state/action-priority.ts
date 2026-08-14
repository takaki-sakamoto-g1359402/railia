import {
  MOTION_CONTRACT_V1,
  type CharacterScopedAction,
} from "../actions/types";

export interface ActionDescriptor {
  readonly priority: number;
  readonly durationMs: number;
  readonly interruptible: boolean;
}

export function describeAction(action: CharacterScopedAction): ActionDescriptor {
  switch (action.action) {
    case "setExpression":
      return { priority: 40, durationMs: 2_400, interruptible: true };
    case "lookAt":
      return { priority: 30, durationMs: 1_600, interruptible: true };
    case "lookAtCharacter":
      return { priority: 35, durationMs: 1_800, interruptible: true };
    case "playMotion":
      return MOTION_CONTRACT_V1[action.motion];
  }
}
