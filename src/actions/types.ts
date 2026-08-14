export const CHARACTER_IDS = ["riai", "noa"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export const EXPRESSION_IDS = [
  "neutral",
  "happy",
  "surprised",
  "thinking",
  "concerned",
  "curious",
] as const;
export type ExpressionId = (typeof EXPRESSION_IDS)[number];

/**
 * Single source of truth for Character Action API v1 motion scheduling.
 * `cubismAssetAliases` maps only semantically direct aliases from the proposed
 * Live2D model spec. A null value is an explicit production-asset gap; a real
 * adapter must fail closed instead of substituting a different gesture.
 */
export const MOTION_CONTRACT_V1 = {
  idle: {
    priority: 60,
    durationMs: 1,
    interruptible: true,
    cubismAssetAliases: { riai: "idle_primary", noa: "idle_primary" },
  },
  greet: {
    priority: 50,
    durationMs: 1_200,
    interruptible: true,
    cubismAssetAliases: { riai: null, noa: null },
  },
  listen: {
    priority: 45,
    durationMs: 1_500,
    interruptible: true,
    cubismAssetAliases: { riai: "listen", noa: null },
  },
  reactLight: {
    priority: 80,
    durationMs: 1_800,
    interruptible: false,
    cubismAssetAliases: { riai: "notice_light", noa: "notice_light" },
  },
  earTwitch: {
    priority: 25,
    durationMs: 650,
    interruptible: true,
    cubismAssetAliases: { riai: null, noa: "ear_twitch" },
  },
  tailSway: {
    priority: 25,
    durationMs: 1_000,
    interruptible: true,
    cubismAssetAliases: { riai: null, noa: "tail_wag_soft" },
  },
} as const;

export type MotionId = keyof typeof MOTION_CONTRACT_V1;

export const MOTION_IDS: readonly MotionId[] = Object.freeze(
  Object.keys(MOTION_CONTRACT_V1) as MotionId[],
);

export interface SetExpressionAction {
  readonly action: "setExpression";
  readonly character: CharacterId;
  readonly expression: ExpressionId;
}

export interface LookAtAction {
  readonly action: "lookAt";
  readonly character: CharacterId;
  /** Normalized stage coordinate: -1 is left/bottom and +1 is right/top. */
  readonly x: number;
  readonly y: number;
}

export interface LookAtCharacterAction {
  readonly action: "lookAtCharacter";
  readonly character: CharacterId;
  readonly target: CharacterId;
}

export interface PlayMotionAction {
  readonly action: "playMotion";
  readonly character: CharacterId;
  readonly motion: MotionId;
}

export interface EmergencyStopAction {
  readonly action: "emergencyStop";
}

export type CharacterScopedAction =
  | SetExpressionAction
  | LookAtAction
  | LookAtCharacterAction
  | PlayMotionAction;

export type CharacterAction = CharacterScopedAction | EmergencyStopAction;

export interface ActionEnvelope {
  readonly version: 1;
  readonly requestId: string;
  readonly actions: readonly CharacterAction[];
}

export function isEmergencyStop(
  action: CharacterAction,
): action is EmergencyStopAction {
  return action.action === "emergencyStop";
}

export function isCharacterScopedAction(
  action: CharacterAction,
): action is CharacterScopedAction {
  return action.action !== "emergencyStop";
}
