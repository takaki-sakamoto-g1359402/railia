import type { CharacterAction } from "../src/actions/types";

export function actionEnvelope(
  requestId: string,
  actions: readonly (CharacterAction | Readonly<Record<string, unknown>>)[],
): string {
  return JSON.stringify({
    version: 1,
    requestId,
    actions,
  });
}

export interface MutableClock {
  readonly now: () => number;
  readonly advance: (deltaMs: number) => void;
}

export function mutableClock(initialMs = 0): MutableClock {
  let currentMs = initialMs;
  return {
    now: () => currentMs,
    advance: (deltaMs: number) => {
      currentMs += deltaMs;
    },
  };
}
