import type { GameState } from "@/game/state/types";

const BASE_EVOLUTION_COST = 250;
const EVOLUTION_COST_SCALE = 2.5;
const BASE_LEVEL_REQUIREMENT = 5;
const LEVEL_REQUIREMENT_SCALE = 4;
const EVOLUTION_YIELD_MULTIPLIER = 1.5;
const EVOLUTION_CYCLE_MULTIPLIER = 0.9;

export type EvolutionRequirements = {
  requiredLevel: number;
  cost: number;
};

export function getEvolutionRequirements(evolutionTier: number): EvolutionRequirements {
  const safeTier = Number.isFinite(evolutionTier) && evolutionTier >= 0 ? evolutionTier : 0;
  return {
    requiredLevel: BASE_LEVEL_REQUIREMENT + safeTier * LEVEL_REQUIREMENT_SCALE,
    cost: Math.ceil(BASE_EVOLUTION_COST * Math.pow(EVOLUTION_COST_SCALE, safeTier)),
  };
}

export function getEvolutionBlockers(state: GameState, hiveId: string): string[] {
  const hive = state.hives.find((item) => item.id === hiveId);
  if (!hive) return ["Missing hive data"];
  const { requiredLevel, cost } = getEvolutionRequirements(hive.evolutionTier);
  const blockers: string[] = [];
  if (hive.level < requiredLevel) {
    blockers.push(`Requires level ${requiredLevel}`);
  }
  if (state.currencies.honey < cost) {
    blockers.push(`Need ${Math.ceil(cost - state.currencies.honey)} more honey`);
  }
  return blockers;
}

export function canEvolve(state: GameState, hiveId: string): boolean {
  const hive = state.hives.find((item) => item.id === hiveId);
  if (!hive) return false;
  const { requiredLevel, cost } = getEvolutionRequirements(hive.evolutionTier);
  return hive.level >= requiredLevel && state.currencies.honey >= cost;
}

export function applyEvolution(state: GameState, hiveId: string): GameState {
  const hiveIndex = state.hives.findIndex((item) => item.id === hiveId);
  if (hiveIndex === -1) return state;

  const hive = state.hives[hiveIndex];
  const { requiredLevel, cost } = getEvolutionRequirements(hive.evolutionTier);
  if (hive.level < requiredLevel || state.currencies.honey < cost) {
    console.info("Evolution blocked", {
      hiveId,
      level: hive.level,
      requiredLevel,
      honey: state.currencies.honey,
      cost,
    });
    return state;
  }

  const nextHives = [...state.hives];
  nextHives[hiveIndex] = {
    ...hive,
    evolutionTier: hive.evolutionTier + 1,
    baseYield: hive.baseYield * EVOLUTION_YIELD_MULTIPLIER,
    baseCycleMs: Math.max(500, hive.baseCycleMs * EVOLUTION_CYCLE_MULTIPLIER),
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
