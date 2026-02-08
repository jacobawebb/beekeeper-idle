import type { GameState } from "@/game/state/types";

const BASE_UPGRADE_COST = 10;
const UPGRADE_SCALE = 1.35;
const YIELD_MULTIPLIER = 1.15;
const CLICK_POWER_BASE = 0.5;
const CLICK_POWER_STEP = 0.25;
const CLICK_POWER_COST_BASE = 25;
const CLICK_POWER_COST_SCALE = 1.6;
const SWARM_ADD_COST_BASE = 150;
const SWARM_ADD_COST_SCALE = 1.8;
const HIVE_PURCHASE_COST_BASE = 60;
const HIVE_PURCHASE_COST_SCALE = 1.7;

export function getHiveUpgradeCost(level: number) {
  const safeLevel = Number.isFinite(level) && level > 0 ? level : 1;
  return Math.ceil(BASE_UPGRADE_COST * Math.pow(UPGRADE_SCALE, safeLevel - 1));
}

export function applyHiveUpgrade(state: GameState, hiveId: string): GameState {
  const hiveIndex = state.hives.findIndex((hive) => hive.id === hiveId);
  if (hiveIndex === -1) return state;

  const hive = state.hives[hiveIndex];
  const cost = getHiveUpgradeCost(hive.level);
  if (state.currencies.honey < cost) return state;

  const nextHives = [...state.hives];
  nextHives[hiveIndex] = {
    ...hive,
    level: hive.level + 1,
    baseYield: hive.baseYield * YIELD_MULTIPLIER,
  };

  return {
    ...state,
    currencies: {
      ...state.currencies,
      honey: state.currencies.honey - cost,
    },
    hives: nextHives,
  };
}

function computeHoneyPerSecond(state: GameState) {
  const honeyMultiplier = state.upgrades.globalMultipliers.honey ?? 1;
  return state.hives.reduce((sum, hive) => {
    if (hive.baseCycleMs <= 0) return sum;
    return sum + (hive.baseYield / (hive.baseCycleMs / 1000)) * honeyMultiplier;
  }, 0);
}

export function getClickPowerCost(powerPct: number) {
  const steps = Math.max(0, Math.round((powerPct - CLICK_POWER_BASE) / CLICK_POWER_STEP));
  return Math.ceil(CLICK_POWER_COST_BASE * Math.pow(CLICK_POWER_COST_SCALE, steps));
}

export function getClickMultiplier(state: GameState) {
  const powerPct = state.upgrades.click.powerPct;
  const swarmCount = state.hives.filter((hive) => hive.swarmEnabled).length;
  const multiClicks = Math.max(1, 1 + swarmCount);
  return { powerPct, multiClicks, swarmCount };
}

export function applyHiveClick(state: GameState, hiveId: string): GameState {
  const hiveExists = state.hives.some((hive) => hive.id === hiveId);
  if (!hiveExists) return state;

  const perSecond = computeHoneyPerSecond(state);
  const { powerPct, multiClicks } = getClickMultiplier(state);
  const gain = perSecond * Math.max(0, powerPct) * Math.max(1, multiClicks);

  return {
    ...state,
    currencies: {
      ...state.currencies,
      honey: state.currencies.honey + gain,
    },
  };
}

export function applyClickPowerUpgrade(state: GameState): GameState {
  const current = state.upgrades.click.powerPct;
  const cost = getClickPowerCost(current);
  if (state.currencies.honey < cost) return state;
  return {
    ...state,
    currencies: {
      ...state.currencies,
      honey: state.currencies.honey - cost,
    },
    upgrades: {
      ...state.upgrades,
      click: {
        ...state.upgrades.click,
        powerPct: current + CLICK_POWER_STEP,
      },
    },
  };
}

export function getSwarmAddCost(currentCount: number) {
  const safeCount = Number.isFinite(currentCount) && currentCount >= 0 ? currentCount : 0;
  return Math.ceil(SWARM_ADD_COST_BASE * Math.pow(SWARM_ADD_COST_SCALE, safeCount));
}

export function getHivePurchaseCost(currentCount: number) {
  const safeCount = Number.isFinite(currentCount) && currentCount >= 1 ? currentCount : 1;
  return Math.ceil(HIVE_PURCHASE_COST_BASE * Math.pow(HIVE_PURCHASE_COST_SCALE, safeCount - 1));
}

export function applyPurchaseHive(state: GameState): GameState {
  const currentCount = state.hives.length;
  const cost = getHivePurchaseCost(currentCount);
  if (state.currencies.honey < cost) return state;

  const nextHive = {
    id: `hive-${currentCount + 1}`,
    level: 1,
    evolutionTier: 0,
    cycleProgressMs: 0,
    baseYield: 1,
    baseCycleMs: state.hives[0]?.baseCycleMs ?? 1000,
    swarmEnabled: false,
  };

  return {
    ...state,
    currencies: {
      ...state.currencies,
      honey: state.currencies.honey - cost,
    },
    hives: [...state.hives, nextHive],
  };
}

export function canAddHiveToSwarm(hive: GameState["hives"][number]) {
  return hive.level >= 6 && hive.evolutionTier >= 1 && !hive.swarmEnabled;
}

export function applyAddHiveToSwarm(state: GameState, hiveId: string): GameState {
  const index = state.hives.findIndex((hive) => hive.id === hiveId);
  if (index === -1) return state;
  const hive = state.hives[index];
  if (!canAddHiveToSwarm(hive)) return state;

  const currentCount = state.hives.filter((item) => item.swarmEnabled).length;
  const cost = getSwarmAddCost(currentCount);
  if (state.currencies.honey < cost) return state;

  const nextHives = [...state.hives];
  nextHives[index] = {
    ...hive,
    swarmEnabled: true,
  };

  return {
    ...state,
    currencies: {
      ...state.currencies,
      honey: state.currencies.honey - cost,
    },
    hives: nextHives,
  };
}
