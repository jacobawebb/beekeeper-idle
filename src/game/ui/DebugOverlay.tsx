"use client";

import { useMemo } from "react";
import type { GameState } from "@/game/state/types";

type DebugOverlayProps = {
  deltaMs: number;
  ticksPerSec: number;
  fps: number;
  sessionSeconds: number;
  gameState: GameState | null;
};

function formatSmall(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value < 1) return value.toFixed(3);
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
}

function computeHoneyPerSecond(state: GameState) {
  const honeyMultiplier = state.upgrades.globalMultipliers.honey ?? 1;
  return state.hives.reduce((sum, hive) => {
    if (hive.baseCycleMs <= 0) return sum;
    return sum + (hive.baseYield / (hive.baseCycleMs / 1000)) * honeyMultiplier;
  }, 0);
}

export default function DebugOverlay({
  deltaMs,
  ticksPerSec,
  fps,
  sessionSeconds,
  gameState,
}: DebugOverlayProps) {
  const stats = useMemo(() => {
    if (!gameState) {
      return { honey: 0, honeyPerSec: 0 };
    }
    return {
      honey: gameState.currencies.honey,
      honeyPerSec: computeHoneyPerSecond(gameState),
    };
  }, [gameState]);

  return (
    <div className="pointer-events-none rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-[11px] text-amber-900 shadow-md backdrop-blur">
      <div className="font-semibold uppercase tracking-[0.2em] text-amber-700">
        Debug
      </div>
      <div className="mt-1 flex flex-col gap-1">
        <div>fps: {formatSmall(fps)}</div>
        <div>session: {Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</div>
        <div>dt: {formatSmall(deltaMs)} ms</div>
        <div>ticks/sec: {formatSmall(ticksPerSec)}</div>
        <div>totalHoney: {formatSmall(stats.honey)}</div>
        <div>honey/sec: {formatSmall(stats.honeyPerSec)}</div>
      </div>
    </div>
  );
}
