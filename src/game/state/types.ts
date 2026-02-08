export type GameState = {
  version: number;
  meta: {
    createdAt: number;
    lastSeenAt: number;
    lastTickAt: number;
  };
  currencies: {
    honey: number;
    wax: number;
    royalJelly: number;
    researchPoints: number;
  };
  hives: Array<{
    id: string;
    level: number;
    evolutionTier: number;
    cycleProgressMs: number;
    baseYield: number;
    baseCycleMs: number;
    swarmEnabled?: boolean;
    assignedBiomeId?: string;
  }>;
  upgrades: {
    globalMultipliers: Record<string, number>;
    automationLevels: Record<string, number>;
    click: {
      powerPct: number;
    };
  };
  settings: {
    audio: {
      musicVolume: number;
      sfxVolume: number;
    };
    automation: {
      autoUpgradeEnabled: boolean;
    };
  };
  flags: {
    hasBackedUpKey: boolean;
  };
};
