import type { GameState } from "@/game/state/types";

function clampNumber(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function step(state: GameState, dtMs: number): GameState {
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return state;
  }

  const honeyMultiplier = clampNumber(state.upgrades.globalMultipliers.honey ?? 1, 0);

  let honeyGain = 0;
  const nextHives = state.hives.map((hive) => {
    const cycleMs = clampNumber(hive.baseCycleMs, 1);
    const baseYield = clampNumber(hive.baseYield, 0);
    const progress = clampNumber(hive.cycleProgressMs, 0) + dtMs;
    const cycles = Math.floor(progress / cycleMs);
    const nextProgress = progress - cycles * cycleMs;

    honeyGain += cycles * baseYield * honeyMultiplier;

    return {
      ...hive,
      cycleProgressMs: nextProgress,
    };
  });

  return {
    ...state,
    meta: {
      ...state.meta,
      lastTickAt: clampNumber(state.meta.lastTickAt + dtMs, 0),
    },
    currencies: {
      ...state.currencies,
      honey: clampNumber(state.currencies.honey + honeyGain, 0),
    },
    hives: nextHives,
  };
}
