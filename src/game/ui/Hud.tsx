"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import type { GameState } from "@/game/state/types";
import { CURRENCY_PALETTE, CurrencyIcon } from "./currency";
import Tooltip from "./Tooltip";

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value < 10) return value.toFixed(2);
  if (value < 1000) return value.toFixed(0);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 1_000_000).toFixed(2)}m`;
}

function formatRate(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value < 1) return value.toFixed(2);
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return formatNumber(value);
}

function computeHoneyPerSecond(state: GameState) {
  const honeyMultiplier = state.upgrades.globalMultipliers.honey ?? 1;
  const perSecond = state.hives.reduce((sum, hive) => {
    if (hive.baseCycleMs <= 0) return sum;
    return sum + (hive.baseYield / (hive.baseCycleMs / 1000)) * honeyMultiplier;
  }, 0);
  return perSecond;
}

type HudProps = {
  onMenuToggle: () => void;
  menuOpen: boolean;
};

export default function Hud({ onMenuToggle, menuOpen }: HudProps) {
  const gameState = useGameStore((state) => state.gameState);

  const metrics = useMemo(() => {
    if (!gameState) {
      return {
        honey: "0",
        honeyPerSec: "0",
        wax: "0",
        royalJelly: "0",
        researchPoints: "0",
      };
    }
    return {
      honey: formatNumber(gameState.currencies.honey),
      honeyPerSec: formatRate(computeHoneyPerSecond(gameState)),
      wax: formatNumber(gameState.currencies.wax),
      royalJelly: formatNumber(gameState.currencies.royalJelly),
      researchPoints: formatNumber(gameState.currencies.researchPoints),
    };
  }, [gameState]);

  return (
    <div className="pointer-events-auto w-full max-w-xl">
      <div className="wood-panel px-3 py-2 text-[#f3e4c8]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[170px]">
              <Tooltip
                label="Honey"
                description="Primary currency produced by hives."
                source="Basic hives"
                rate={`${metrics.honeyPerSec} / sec`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  <CurrencyIcon currency="honey" />
                  <span style={{ color: CURRENCY_PALETTE.honey.color }}>
                    Honey
                  </span>
                </div>
              </Tooltip>
              <div
                className="mt-1 text-2xl font-semibold"
                style={{ color: CURRENCY_PALETTE.honey.color }}
              >
                {metrics.honey}
              </div>
              <div
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: CURRENCY_PALETTE.honey.color }}
              >
                {metrics.honeyPerSec} / sec
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[#e1c79b]">
              <div className="wood-border rounded-xl px-3 py-2">
                <Tooltip
                  label="Wax"
                  description="Secondary currency unlocked via upgrades."
                  source="Evolved hives"
                  rate="0 / sec"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
                    <CurrencyIcon currency="wax" size={12} />
                    <span style={{ color: CURRENCY_PALETTE.wax.color }}>
                      Wax
                    </span>
                  </div>
                </Tooltip>
                <div
                  className="mt-1 text-sm font-semibold"
                  style={{ color: CURRENCY_PALETTE.wax.color }}
                >
                  {metrics.wax}
                </div>
              </div>
              <div className="wood-border rounded-xl px-3 py-2">
                <Tooltip
                  label="Royal Jelly"
                  description="Premium resource for hive evolution."
                  source="Advanced hives"
                  rate="0 / sec"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
                    <CurrencyIcon currency="royalJelly" size={12} />
                    <span style={{ color: CURRENCY_PALETTE.royalJelly.color }}>
                      Royal
                    </span>
                  </div>
                </Tooltip>
                <div
                  className="mt-1 text-sm font-semibold"
                  style={{ color: CURRENCY_PALETTE.royalJelly.color }}
                >
                  {metrics.royalJelly}
                </div>
              </div>
              <div className="wood-border rounded-xl px-3 py-2">
                <Tooltip
                  label="Research"
                  description="Used for long-term automation and tech."
                  source="Research labs"
                  rate="0 / sec"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
                    <CurrencyIcon currency="researchPoints" size={12} />
                    <span style={{ color: CURRENCY_PALETTE.researchPoints.color }}>
                      Research
                    </span>
                  </div>
                </Tooltip>
                <div
                  className="mt-1 text-sm font-semibold"
                  style={{ color: CURRENCY_PALETTE.researchPoints.color }}
                >
                  {metrics.researchPoints}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onMenuToggle}
            className="h-8 rounded-md border border-[#5a3a22] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b98a] transition hover:bg-[#3b2415]"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>
    </div>
  );
}
