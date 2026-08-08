import type { CharacterScopedAction, MotionId } from "../actions/types";

export interface ActionDescriptor {
  readonly priority: number;
  readonly durationMs: number;
  readonly interruptible: boolean;
}

const MOTION_DESCRIPTORS: Readonly<Record<MotionId, ActionDescriptor>> = {
  idle: { priority: 60, durationMs: 1, interruptible: true },
  greet: { priority: 50, durationMs: 1_200, interruptible: true },
  listen: { priority: 45, durationMs: 1_500, interruptible: true },
  reactLight: { priority: 80, durationMs: 1_800, interruptible: false },
  earTwitch: { priority: 25, durationMs: 650, interruptible: true },
  tailSway: { priority: 25, durationMs: 1_000, interruptible: true },
};

export function describeAction(action: CharacterScopedAction): ActionDescriptor {
  switch (action.action) {
    case "setExpression":
      return { priority: 40, durationMs: 2_400, interruptible: true };
    case "lookAt":
      return { priority: 30, durationMs: 1_600, interruptible: true };
    case "lookAtCharacter":
      return { priority: 35, durationMs: 1_800, interruptible: true };
    case "playMotion":
      return MOTION_DESCRIPTORS[action.motion];
  }
}

