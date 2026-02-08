import type { GameState } from "@/game/state/types";
import { step } from "./step";

const DEFAULT_OFFLINE_CAP_MS = 4 * 60 * 60 * 1000;
const DEFAULT_STEP_MS = 100;

export type OfflineProgressResult = {
  state: GameState;
  appliedMs: number;
  capped: boolean;
};

export function applyOfflineProgress(
  state: GameState,
  elapsedMs: number,
  capMs = DEFAULT_OFFLINE_CAP_MS,
  stepMs = DEFAULT_STEP_MS
): OfflineProgressResult {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return { state, appliedMs: 0, capped: false };
  }

  const appliedMs = Math.min(elapsedMs, capMs);
  const capped = elapsedMs > capMs;

  let next = state;
  const steps = Math.floor(appliedMs / stepMs);
  const remainder = appliedMs - steps * stepMs;

  for (let i = 0; i < steps; i += 1) {
    next = step(next, stepMs);
  }

  if (remainder > 0) {
    next = step(next, remainder);
  }

  return { state: next, appliedMs, capped };
}
