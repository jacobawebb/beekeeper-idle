import type { GameState } from "@/game/state/types";

export type Biome = {
  id: string;
  name: string;
  description: string;
  productionMultiplier: number;
};

export type AutomationRule = {
  id: string;
  label: string;
  level: number;
  apply: (state: GameState) => GameState;
};

export type EngineExtensionPoints = {
  biomes: Biome[];
  automationRules: AutomationRule[];
};
