import { db } from "./db";
import type { GameState } from "./types";

const SAVE_KEY = "primary";
const SAVE_VERSION = 1;
const DEFAULT_CYCLE_MS = 1000;
let saveChain: Promise<void> = Promise.resolve();
const saveListeners = new Set<(savedAt: number) => void>();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidGameState(state: unknown): state is GameState {
  if (!state || typeof state !== "object") return false;
  const candidate = state as GameState;
  if (!isFiniteNumber(candidate.version) || candidate.version !== SAVE_VERSION) {
    return false;
  }
  if (!candidate.meta || typeof candidate.meta !== "object") return false;
  if (
    !isFiniteNumber(candidate.meta.createdAt) ||
    !isFiniteNumber(candidate.meta.lastSeenAt) ||
    !isFiniteNumber(candidate.meta.lastTickAt)
  ) {
    return false;
  }
  if (!candidate.currencies || typeof candidate.currencies !== "object") return false;
  if (
    !isFiniteNumber(candidate.currencies.honey) ||
    !isFiniteNumber(candidate.currencies.wax) ||
    !isFiniteNumber(candidate.currencies.royalJelly) ||
    !isFiniteNumber(candidate.currencies.researchPoints)
  ) {
    return false;
  }
  if (!Array.isArray(candidate.hives)) return false;
  for (const hive of candidate.hives) {
    if (!hive || typeof hive !== "object") return false;
    if (typeof hive.id !== "string" || hive.id.length === 0) return false;
    if (
      !isFiniteNumber(hive.level) ||
      !isFiniteNumber(hive.evolutionTier) ||
      !isFiniteNumber(hive.cycleProgressMs) ||
      !isFiniteNumber(hive.baseYield) ||
      !isFiniteNumber(hive.baseCycleMs)
    ) {
      return false;
    }
    if (
      hive.swarmEnabled !== undefined &&
      typeof hive.swarmEnabled !== "boolean"
    ) {
      return false;
    }
    if (
      hive.assignedBiomeId !== undefined &&
      typeof hive.assignedBiomeId !== "string"
    ) {
      return false;
    }
  }
  if (!candidate.upgrades || typeof candidate.upgrades !== "object") return false;
  if (
    typeof candidate.upgrades.globalMultipliers !== "object" ||
    candidate.upgrades.globalMultipliers === null
  ) {
    return false;
  }
  if (
    typeof candidate.upgrades.automationLevels !== "object" ||
    candidate.upgrades.automationLevels === null
  ) {
    return false;
  }
  if (!candidate.upgrades.click || typeof candidate.upgrades.click !== "object") {
    return false;
  }
  if (!isFiniteNumber(candidate.upgrades.click.powerPct)) {
    return false;
  }
  if (!candidate.settings || typeof candidate.settings !== "object") return false;
  if (!candidate.settings.audio || typeof candidate.settings.audio !== "object") {
    return false;
  }
  if (
    !isFiniteNumber(candidate.settings.audio.musicVolume) ||
    !isFiniteNumber(candidate.settings.audio.sfxVolume)
  ) {
    return false;
  }
  if (!candidate.flags || typeof candidate.flags !== "object") return false;
  if (typeof candidate.flags.hasBackedUpKey !== "boolean") return false;
  return true;
}

export function createInitialGameState(): GameState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    meta: {
      createdAt: now,
      lastSeenAt: now,
      lastTickAt: now,
    },
    currencies: {
      honey: 0,
      wax: 0,
      royalJelly: 0,
      researchPoints: 0,
    },
    hives: [
      {
        id: "hive-1",
        level: 1,
        evolutionTier: 0,
        cycleProgressMs: 0,
        baseYield: 1,
        baseCycleMs: DEFAULT_CYCLE_MS,
        swarmEnabled: false,
      },
    ],
    upgrades: {
      globalMultipliers: {
        honey: 1,
        wax: 1,
        royalJelly: 1,
        researchPoints: 1,
      },
      automationLevels: {},
      click: {
        powerPct: 0.5,
      },
    },
    settings: {
      audio: {
        musicVolume: 0.6,
        sfxVolume: 0.7,
      },
    },
    flags: {
      hasBackedUpKey: false,
    },
  };
}

export async function loadGameState(): Promise<GameState> {
  const record = await db.saves.get(SAVE_KEY);
  const stored = record?.state as GameState | undefined;
  if (!stored) {
    return createInitialGameState();
  }
  if (!isValidGameState(stored)) {
    console.warn("Invalid save detected. Resetting to defaults.");
    await db.saves.put({
      key: `corrupt-${Date.now()}`,
      state: stored,
      updatedAt: Date.now(),
    });
    return createInitialGameState();
  }
  return stored;
}

async function writeGameState(state: GameState): Promise<GameState> {
  const now = Date.now();
  const nextState: GameState = {
    ...state,
    meta: {
      ...state.meta,
      lastSeenAt: now,
    },
  };

  await db.transaction("rw", db.saves, async () => {
    await db.saves.put({
      key: SAVE_KEY,
      state: nextState,
      updatedAt: now,
    });
  });

  return nextState;
}

export function saveGameStateSafe(state: GameState): Promise<GameState> {
  let result: GameState = state;
  saveChain = saveChain
    .then(async () => {
      result = await writeGameState(state);
      saveListeners.forEach((listener) => listener(result.meta.lastSeenAt));
    })
    .catch((error) => {
      console.error("Failed to write save", error);
    });

  return saveChain.then(() => result);
}

export function subscribeToSaves(listener: (savedAt: number) => void) {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}

export async function resetSave(): Promise<void> {
  await db.saves.clear();
}

export function startAutoSave(
  getState: () => GameState,
  intervalMs = 15000,
  onSaved?: (savedAt: number) => void
) {
  const timer = window.setInterval(() => {
    saveGameStateSafe(getState()).then((nextState) => {
      onSaved?.(nextState.meta.lastSeenAt);
    });
  }, intervalMs);

  return () => window.clearInterval(timer);
}
