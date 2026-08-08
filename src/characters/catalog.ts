import type { CharacterId, ExpressionId, MotionId } from "../actions/types";

export interface CharacterCapabilities {
  readonly id: CharacterId;
  readonly displayName: string;
  readonly expressions: ReadonlySet<ExpressionId>;
  readonly motions: ReadonlySet<MotionId>;
  readonly accent: string;
}

export const CHARACTER_CAPABILITIES: Readonly<
  Record<CharacterId, CharacterCapabilities>
> = {
  riai: {
    id: "riai",
    displayName: "Riai",
    expressions: new Set([
      "neutral",
      "happy",
      "surprised",
      "thinking",
      "concerned",
    ]),
    motions: new Set([
      "idle",
      "greet",
      "listen",
      "reactLight",
      "earTwitch",
      "tailSway",
    ]),
    accent: "#75c7ff",
  },
  noa: {
    id: "noa",
    displayName: "Noa",
    expressions: new Set([
      "neutral",
      "happy",
      "surprised",
      "curious",
      "concerned",
    ]),
    motions: new Set([
      "idle",
      "greet",
      "listen",
      "reactLight",
      "earTwitch",
      "tailSway",
    ]),
    accent: "#a998ff",
  },
};

