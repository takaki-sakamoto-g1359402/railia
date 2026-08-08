import type {
  CharacterId,
  ExpressionId,
  MotionId,
} from "../actions/types";

export type GazeTarget =
  | { readonly kind: "forward" }
  | { readonly kind: "point"; readonly x: number; readonly y: number }
  | { readonly kind: "character"; readonly target: CharacterId };

export interface IdleState {
  readonly blinkOpen: number;
  readonly breath: number;
  readonly sway: number;
  readonly gazeX: number;
  readonly gazeY: number;
  readonly eventSequence: number;
}

export interface CharacterSnapshot {
  readonly id: CharacterId;
  readonly expression: ExpressionId;
  readonly motion: MotionId;
  readonly gazeTarget: GazeTarget;
  readonly mode: "safeIdle" | "acting";
  readonly priority: number;
  readonly interruptible: boolean;
  readonly activeAction: string | null;
  readonly queuedActions: readonly string[];
  readonly idle: IdleState;
  readonly revision: number;
}

export interface WorldSnapshot {
  readonly elapsedMs: number;
  readonly emergencyStopCount: number;
  readonly characters: Readonly<Record<CharacterId, CharacterSnapshot>>;
}

