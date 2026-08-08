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

export const MOTION_IDS = [
  "idle",
  "greet",
  "listen",
  "reactLight",
  "earTwitch",
  "tailSway",
] as const;
export type MotionId = (typeof MOTION_IDS)[number];

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

