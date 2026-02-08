"use client";

import { useMemo, useState } from "react";
import {
  canAddHiveToSwarm,
  getClickMultiplier,
  getClickPowerCost,
  getHiveUpgradeCost,
  getHivePurchaseCost,
  getSwarmAddCost,
} from "@/game/engine/economy";
import { getEvolutionBlockers, getEvolutionRequirements } from "@/game/engine/evolution";
import { useGameStore } from "@/game/state/store";
import { CURRENCY_PALETTE, CurrencyIcon } from "./currency";

export default function Panels() {
  const gameState = useGameStore((state) => state.gameState);
  const upgradeHive = useGameStore((state) => state.upgradeHive);
  const evolveHive = useGameStore((state) => state.evolveHive);
  const upgradeClickPower = useGameStore((state) => state.upgradeClickPower);
  const addHiveToSwarm = useGameStore((state) => state.addHiveToSwarm);
  const purchaseHive = useGameStore((state) => state.purchaseHive);
  const autoUpgradeEnabled =
    useGameStore((state) => state.gameState?.settings.automation.autoUpgradeEnabled) ??
    false;
  const setAutoUpgradeEnabled = useGameStore((state) => state.setAutoUpgradeEnabled);
  const [activeTab, setActiveTab] = useState<"global" | "hives" | "av">("global");
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);

  const honeyMultiplier = gameState?.upgrades.globalMultipliers.honey ?? 1;
  const autoUpgradeUnlocked =
    gameState?.hives.some((hive) => hive.evolutionTier >= 1) ?? false;

  const hiveCards = useMemo(() => {
    if (!gameState) return [];
    return gameState.hives.map((hive, index) => {
      const cost = getHiveUpgradeCost(hive.level);
      const canAfford = gameState.currencies.honey >= cost;
      const affordRatio = Math.min(
        1,
        Math.max(0, gameState.currencies.honey / cost)
      );
      const currentRate =
        hive.baseCycleMs > 0
          ? (hive.baseYield / (hive.baseCycleMs / 1000)) * honeyMultiplier
          : 0;
      const upgradeRate =
        hive.baseCycleMs > 0
          ? ((hive.baseYield * 1.15) / (hive.baseCycleMs / 1000)) *
            honeyMultiplier
          : 0;
      const upgradeDelta = Math.max(0, upgradeRate - currentRate);
      const evolution = getEvolutionRequirements(hive.evolutionTier);
      const blockers = getEvolutionBlockers(gameState, hive.id);
      const evolutionAffordRatio = Math.min(
        1,
        Math.max(0, gameState.currencies.honey / evolution.cost)
      );
      const canEvolve =
        hive.level >= evolution.requiredLevel &&
        gameState.currencies.honey >= evolution.cost;
      const canAddToSwarm = canAddHiveToSwarm(hive);
      const currentSwarmCount = gameState.hives.filter((item) => item.swarmEnabled).length;
      const swarmCost = getSwarmAddCost(currentSwarmCount);
      const swarmRatio = Math.min(1, Math.max(0, gameState.currencies.honey / swarmCost));
      const canAffordSwarm = gameState.currencies.honey >= swarmCost;
      const evolvedRate =
        hive.baseCycleMs > 0
          ? ((hive.baseYield * 1.5) /
              ((hive.baseCycleMs * 0.9) / 1000)) *
            honeyMultiplier
          : 0;
      const evolveDelta = Math.max(0, evolvedRate - currentRate);
      const cycleDeltaPct = hive.baseCycleMs > 0 ? 10 : 0;
      const currentRateDisplay =
        hive.baseCycleMs > 0
          ? (hive.baseYield / (hive.baseCycleMs / 1000)) * honeyMultiplier
          : 0;
      return {
        id: hive.id,
        label: `Hive ${index + 1}`,
        level: hive.level,
        cost,
        canAfford,
        affordRatio,
        upgradeDelta,
        evolutionTier: hive.evolutionTier,
        evolutionCost: evolution.cost,
        evolutionLevel: evolution.requiredLevel,
        evolutionAffordRatio,
        canEvolve,
        blockers,
        evolveDelta,
        cycleDeltaPct,
        currentRateDisplay,
        canAddToSwarm,
        swarmCost,
        swarmRatio,
        canAffordSwarm,
      };
    });
  }, [gameState, honeyMultiplier]);

  const formatRate = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    if (value < 0.01) return value.toFixed(3);
    if (value < 1) return value.toFixed(2);
    if (value < 10) return value.toFixed(2);
    if (value < 100) return value.toFixed(1);
    return value.toFixed(0);
  };

  const globalUpgrades = useMemo(() => {
    if (!gameState) return [];
    const clickMultiplier = getClickMultiplier(gameState);
    const clickPowerCost = getClickPowerCost(clickMultiplier.powerPct);
    const canAffordPower = gameState.currencies.honey >= clickPowerCost;
    const powerRatio = Math.min(1, Math.max(0, gameState.currencies.honey / clickPowerCost));

    return [
      {
        id: "click-power",
        label: "Tap Strength",
        description: `Clicks grant ${(clickMultiplier.powerPct * 100).toFixed(0)}% of honey/sec`,
        cost: clickPowerCost,
        canAfford: canAffordPower,
        ratio: powerRatio,
        onBuy: upgradeClickPower,
      },
    ];
  }, [gameState, upgradeClickPower]);

  if (!gameState) {
    return (
      <div className="pointer-events-auto w-72 rounded-2xl border border-amber-200 bg-white/90 px-4 py-3 text-xs text-amber-700 shadow-lg backdrop-blur">
        Loading upgrades...
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full">
      <div className="wood-panel px-4 py-4 text-[#f3e4c8]">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7b98a]">
          Upgrades
        </div>
        <div className="flex gap-1 text-[10px] uppercase tracking-[0.2em]">
          {[
            { id: "global", label: "Global" },
            { id: "hives", label: "Hives" },
            { id: "av", label: "Audio/Visual" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="rounded-md border border-[#5a3a22] px-2 py-1 text-[#d7b98a] transition hover:bg-[#3b2415]"
              style={{
                backgroundColor:
                  activeTab === tab.id ? CURRENCY_PALETTE.honey.soft : "transparent",
                color:
                  activeTab === tab.id
                    ? CURRENCY_PALETTE.honey.color
                    : "#c7a77b",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "global" ? (
        <div className="mt-3 grid grid-cols-2 justify-center gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {globalUpgrades.map((upgrade) => (
            <div
              key={upgrade.id}
              className="wood-border w-[170px] rounded-xl px-3 py-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[#d7b98a]">
                <span>{upgrade.label}</span>
                <span className="text-[10px]">Global</span>
              </div>
              <div className="mt-2 text-xs text-[#e1c79b]">
                {upgrade.description}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-[#e1c79b]">
                <span>Cost</span>
                <span
                  className="flex items-center gap-1 font-semibold"
                  style={{ color: CURRENCY_PALETTE.honey.color }}
                >
                  <CurrencyIcon currency="honey" size={12} />
                  {upgrade.cost}
                </span>
              </div>
              <button
                type="button"
                disabled={!upgrade.canAfford}
                onClick={upgrade.onBuy}
                className="relative mt-2 w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: CURRENCY_PALETTE.honey.soft,
                  color: upgrade.canAfford
                    ? CURRENCY_PALETTE.honey.color
                    : "#9a7b4b",
                }}
              >
                <span
                  className="absolute left-0 top-0 h-full"
                  style={{
                    backgroundColor: upgrade.canAfford
                      ? CURRENCY_PALETTE.honey.color
                      : CURRENCY_PALETTE.honey.soft,
                    opacity: upgrade.canAfford ? 0.25 : 0.5,
                    width: `${upgrade.ratio * 100}%`,
                  }}
                />
                <span className="relative">Upgrade</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "hives" ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="wood-border rounded-xl px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b98a]">
              Hives
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {hiveCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedHiveId(card.id)}
                  className="flex items-center justify-between rounded-lg border border-[#5a3a22] px-3 py-2 text-left text-xs text-[#e1c79b] transition hover:bg-[#3b2415]"
                  style={{
                    backgroundColor:
                      selectedHiveId === card.id ? "#3b2415" : "transparent",
                  }}
                >
                  <span className="flex flex-col">
                    <span>{card.label}</span>
                    <span className="text-[10px] text-[#c9b086]">
                      {formatRate(card.currentRateDisplay)} / sec
                    </span>
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em]">
                    Lv {card.level}
                  </span>
                </button>
              ))}
              <div className="mt-2 flex items-center justify-between text-xs text-[#e1c79b]">
                <span>New Hive</span>
                <span
                  className="flex items-center gap-1 font-semibold"
                  style={{ color: CURRENCY_PALETTE.honey.color }}
                >
                  <CurrencyIcon currency="honey" size={12} />
                  {gameState ? getHivePurchaseCost(gameState.hives.length) : 0}
                </span>
              </div>
              <button
                type="button"
                onClick={purchaseHive}
                disabled={
                  !gameState ||
                  gameState.currencies.honey <
                    getHivePurchaseCost(gameState.hives.length)
                }
                className="relative w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-[#3b2415] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: CURRENCY_PALETTE.honey.soft,
                  color:
                    gameState &&
                    gameState.currencies.honey >=
                      getHivePurchaseCost(gameState.hives.length)
                      ? CURRENCY_PALETTE.honey.color
                      : "#9a7b4b",
                }}
              >
                <span className="relative">Purchase Hive</span>
              </button>
              <div className="mt-4 rounded-lg border border-[#5a3a22] px-3 py-2 text-xs text-[#e1c79b]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b98a]">
                    Auto Upgrade
                  </span>
                  <input
                    type="checkbox"
                    checked={autoUpgradeEnabled}
                    disabled={!autoUpgradeUnlocked}
                    onChange={(event) => setAutoUpgradeEnabled(event.target.checked)}
                    className="h-4 w-4 accent-[#c28b4b]"
                  />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#c9b086]">
                  {autoUpgradeUnlocked
                    ? "Auto upgrades hives when affordable."
                    : "Unlocks after first evolution."}
                </div>
              </div>
            </div>
          </div>
          <div className="wood-border rounded-xl px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b98a]">
              Hives → {selectedHiveId ?? "Select"} → Overview
            </div>
            {selectedHiveId ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {hiveCards
                  .filter((card) => card.id === selectedHiveId)
                  .map((card) => (
                    <div
                      key={card.id}
                      className="wood-border w-[180px] rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[#d7b98a]">
                        <span>{card.label}</span>
                        <span>Lv {card.level}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-[#e1c79b]">
                        {formatRate(card.currentRateDisplay)} honey/sec
                      </div>
                      <div className="mt-3 text-xs text-[#e1c79b]">Upgrade</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-[#e1c79b]">
                        <span>Cost</span>
                        <span
                          className="flex items-center gap-1 font-semibold"
                          style={{ color: CURRENCY_PALETTE.honey.color }}
                        >
                          <CurrencyIcon currency="honey" size={12} />
                          {card.cost}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => upgradeHive(card.id)}
                        disabled={!card.canAfford}
                        className="relative mt-2 w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          borderColor: CURRENCY_PALETTE.honey.soft,
                          color: card.canAfford
                            ? CURRENCY_PALETTE.honey.color
                            : "#9a7b4b",
                        }}
                      >
                        <span
                          className="absolute left-0 top-0 h-full"
                          style={{
                            backgroundColor: card.canAfford
                              ? CURRENCY_PALETTE.honey.color
                              : CURRENCY_PALETTE.honey.soft,
                            opacity: card.canAfford ? 0.25 : 0.5,
                            width: `${card.affordRatio * 100}%`,
                          }}
                        />
                        <span className="relative">Upgrade</span>
                      </button>
                      <div className="mt-2 text-[11px] text-[#e1c79b]">
                        +{formatRate(card.upgradeDelta)} honey/sec
                      </div>
                      <div className="mt-3 text-xs text-[#e1c79b]">Evolution</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-[#e1c79b]">
                        <span>Req</span>
                        <span className="font-semibold text-amber-900">
                          Lv {card.evolutionLevel}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-[#e1c79b]">
                        <span>Cost</span>
                        <span
                          className="flex items-center gap-1 font-semibold"
                          style={{ color: CURRENCY_PALETTE.honey.color }}
                        >
                          <CurrencyIcon currency="honey" size={12} />
                          {card.evolutionCost}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => evolveHive(card.id)}
                        disabled={!card.canEvolve}
                        className="relative mt-2 w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          borderColor: CURRENCY_PALETTE.honey.soft,
                          color: card.canEvolve
                            ? CURRENCY_PALETTE.honey.color
                            : "#9a7b4b",
                        }}
                      >
                        <span
                          className="absolute left-0 top-0 h-full"
                          style={{
                            backgroundColor: card.canEvolve
                              ? CURRENCY_PALETTE.honey.color
                              : CURRENCY_PALETTE.honey.soft,
                            opacity: card.canEvolve ? 0.25 : 0.5,
                            width: `${card.evolutionAffordRatio * 100}%`,
                          }}
                        />
                        <span className="relative">Evolve</span>
                      </button>
                      {!card.canEvolve && card.blockers.length > 0 ? (
                        <div className="mt-2 text-[10px] text-[#e1c79b]">
                          Blocked by: {card.blockers.join(", ")}
                        </div>
                      ) : null}
                      <div className="mt-2 text-[11px] text-[#e1c79b]">
                        +{formatRate(card.evolveDelta)} honey/sec · -{card.cycleDeltaPct}% cycle
                      </div>
                      <div className="mt-3 text-xs text-[#e1c79b]">Swarm Slot</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-[#e1c79b]">
                        <span>Cost</span>
                        <span
                          className="flex items-center gap-1 font-semibold"
                          style={{ color: CURRENCY_PALETTE.honey.color }}
                        >
                          <CurrencyIcon currency="honey" size={12} />
                          {card.swarmCost}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addHiveToSwarm(card.id)}
                        disabled={!card.canAddToSwarm || !card.canAffordSwarm}
                        className="relative mt-2 w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          borderColor: CURRENCY_PALETTE.honey.soft,
                          color:
                            card.canAddToSwarm && card.canAffordSwarm
                              ? CURRENCY_PALETTE.honey.color
                              : "#9a7b4b",
                        }}
                      >
                        <span
                          className="absolute left-0 top-0 h-full"
                          style={{
                            backgroundColor:
                              card.canAddToSwarm && card.canAffordSwarm
                                ? CURRENCY_PALETTE.honey.color
                                : CURRENCY_PALETTE.honey.soft,
                            opacity:
                              card.canAddToSwarm && card.canAffordSwarm ? 0.25 : 0.5,
                            width: `${card.swarmRatio * 100}%`,
                          }}
                        />
                        <span className="relative">Add to Swarm</span>
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="mt-3 text-xs text-[#e1c79b]">
                Select a hive to view upgrades.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "av" ? (
        <div className="wood-border mt-3 rounded-xl px-3 py-3 text-xs text-[#e1c79b]">
          Audio/visual upgrades will live here once audio settings and VFX land.
        </div>
      ) : null}
      </div>
    </div>
  );
}
