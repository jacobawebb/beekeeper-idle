"use client";

import { useEffect, useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { CURRENCY_PALETTE, CurrencyIcon } from "./currency";
import { getEvolutionBlockers, getEvolutionRequirements } from "@/game/engine/evolution";
import { getHiveUpgradeCost } from "@/game/engine/economy";

type HiveContextMenuProps = {
  open: boolean;
  x: number;
  y: number;
  hiveId: string | null;
  onClose: () => void;
};

export default function HiveContextMenu({
  open,
  x,
  y,
  hiveId,
  onClose,
}: HiveContextMenuProps) {
  const gameState = useGameStore((state) => state.gameState);
  const upgradeHive = useGameStore((state) => state.upgradeHive);
  const evolveHive = useGameStore((state) => state.evolveHive);

  const hive = useMemo(() => {
    if (!gameState || !hiveId) return null;
    return gameState.hives.find((item) => item.id === hiveId) ?? null;
  }, [gameState, hiveId]);

  const blockers = useMemo(() => {
    if (!gameState || !hiveId) return [];
    return getEvolutionBlockers(gameState, hiveId);
  }, [gameState, hiveId]);

  const canEvolve = blockers.length === 0;
  const honey = gameState?.currencies.honey ?? 0;
  const honeyMultiplier = gameState?.upgrades.globalMultipliers.honey ?? 1;

  const upgradeInfo = useMemo(() => {
    if (!hive || !gameState) return null;
    const cost = getHiveUpgradeCost(hive.level);
    const canAfford = honey >= cost;
    const ratio = Math.min(1, Math.max(0, honey / cost));
    const currentRate =
      hive.baseCycleMs > 0
        ? (hive.baseYield / (hive.baseCycleMs / 1000)) * honeyMultiplier
        : 0;
    const nextRate =
      hive.baseCycleMs > 0
        ? ((hive.baseYield * 1.15) / (hive.baseCycleMs / 1000)) * honeyMultiplier
        : 0;
    const delta = Math.max(0, nextRate - currentRate);
    return { cost, canAfford, ratio, delta };
  }, [gameState, hive, honey, honeyMultiplier]);

  const evolutionInfo = useMemo(() => {
    if (!hive || !gameState) return null;
    const requirements = getEvolutionRequirements(hive.evolutionTier);
    const ratio = Math.min(1, Math.max(0, honey / requirements.cost));
    const currentRate =
      hive.baseCycleMs > 0
        ? (hive.baseYield / (hive.baseCycleMs / 1000)) * honeyMultiplier
        : 0;
    const nextRate =
      hive.baseCycleMs > 0
        ? ((hive.baseYield * 1.5) / ((hive.baseCycleMs * 0.9) / 1000)) *
          honeyMultiplier
        : 0;
    const delta = Math.max(0, nextRate - currentRate);
    return {
      cost: requirements.cost,
      ratio,
      delta,
    };
  }, [gameState, hive, honey, honeyMultiplier]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handleClick = () => {
      onClose();
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("pointerdown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("pointerdown", handleClick);
    };
  }, [onClose, open]);

  if (!open || !hiveId) return null;

  return (
    <div
      className="pointer-events-auto fixed z-40 w-56 rounded-xl border border-amber-200 bg-white/95 px-3 py-3 text-xs text-amber-900 shadow-xl backdrop-blur"
      style={{ left: x, top: y }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
          Hive
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-amber-200 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-700 transition hover:bg-amber-50"
        >
          X
        </button>
      </div>
      <div className="mt-2 text-sm font-semibold">
        {hive ? `Level ${hive.level}` : hiveId}
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            upgradeHive(hiveId);
          }}
          disabled={!upgradeInfo?.canAfford}
          className="relative w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-amber-50 disabled:opacity-50"
          style={{
            borderColor: CURRENCY_PALETTE.honey.soft,
            color: upgradeInfo?.canAfford
              ? CURRENCY_PALETTE.honey.color
              : "#9a7b4b",
          }}
        >
          <span
            className="absolute left-0 top-0 h-full"
            style={{
              backgroundColor: upgradeInfo?.canAfford
                ? CURRENCY_PALETTE.honey.color
                : CURRENCY_PALETTE.honey.soft,
              opacity: upgradeInfo?.canAfford ? 0.25 : 0.5,
              width: `${(upgradeInfo?.ratio ?? 0) * 100}%`,
            }}
          />
          <span className="relative">Upgrade Hive</span>
        </button>
        <div className="text-[10px] text-amber-700">
          +{upgradeInfo ? upgradeInfo.delta.toFixed(2) : "0"} honey/sec
        </div>
        <button
          type="button"
          onClick={() => {
            evolveHive(hiveId);
          }}
          disabled={!canEvolve}
          className="relative w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-amber-50 disabled:opacity-50"
          style={{
            borderColor: CURRENCY_PALETTE.honey.soft,
            color: canEvolve ? CURRENCY_PALETTE.honey.color : "#9a7b4b",
          }}
        >
          <span
            className="absolute left-0 top-0 h-full"
            style={{
              backgroundColor: canEvolve
                ? CURRENCY_PALETTE.honey.color
                : CURRENCY_PALETTE.honey.soft,
              opacity: canEvolve ? 0.25 : 0.5,
              width: `${(evolutionInfo?.ratio ?? 0) * 100}%`,
            }}
          />
          <span className="relative">Evolve</span>
        </button>
        {!canEvolve && blockers.length > 0 ? (
          <div className="rounded-md border border-amber-100 bg-amber-50 px-2 py-2 text-[10px] text-amber-700">
            Blocked by: {blockers.join(", ")}
          </div>
        ) : null}
        <div className="text-[10px] text-amber-700">
          +{evolutionInfo ? evolutionInfo.delta.toFixed(2) : "0"} honey/sec · -10% cycle
        </div>
        <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          <div className="flex items-center justify-between">
            <span>Honey/sec</span>
            <span className="flex items-center gap-1 font-semibold" style={{ color: CURRENCY_PALETTE.honey.color }}>
              <CurrencyIcon currency="honey" size={12} />
              {hive && hive.baseCycleMs > 0
                ? (hive.baseYield / (hive.baseCycleMs / 1000)).toFixed(2)
                : "0"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
