import { create } from "zustand";
import type { GameState } from "./types";
import {
  applyAddHiveToSwarm,
  applyClickPowerUpgrade,
  applyHiveClick,
  applyHiveUpgrade,
  applyPurchaseHive,
} from "@/game/engine/economy";
import { applyEvolution } from "@/game/engine/evolution";
import { saveGameStateSafe } from "@/game/state/save";

type StoreState = {
  hiveClicks: Record<string, number>;
  lastHiveClickId: string | null;
  onHiveClick: (hiveId: string) => void;
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  updateGameState: (updater: (state: GameState) => GameState) => void;
  upgradeHive: (hiveId: string) => void;
  evolveHive: (hiveId: string) => void;
  upgradeClickPower: () => void;
  addHiveToSwarm: (hiveId: string) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  purchaseHive: () => void;
  hiveWorldPositions: Record<string, [number, number, number]>;
  setHiveWorldPositions: (positions: Record<string, [number, number, number]>) => void;
  setAutoUpgradeEnabled: (value: boolean) => void;
  debug: {
    overlay: boolean;
    beesStats: boolean;
    beesMarkers: boolean;
  };
  setDebugFlag: (key: "overlay" | "beesStats" | "beesMarkers", value: boolean) => void;
};

export const useGameStore = create<StoreState>((set) => ({
  hiveClicks: {},
  lastHiveClickId: null,
  onHiveClick: (hiveId) =>
    set((state) => {
      const nextGameState = state.gameState
        ? applyHiveClick(state.gameState, hiveId)
        : state.gameState;
      return {
        hiveClicks: {
          ...state.hiveClicks,
          [hiveId]: (state.hiveClicks[hiveId] ?? 0) + 1,
        },
        lastHiveClickId: hiveId,
        gameState: nextGameState,
      };
    }),
  gameState: null,
  setGameState: (gameState) => set({ gameState }),
  updateGameState: (updater) =>
    set((state) =>
      state.gameState ? { gameState: updater(state.gameState) } : state
    ),
  upgradeHive: (hiveId) =>
    set((state) => {
      if (!state.gameState) return state;
      const nextState = applyHiveUpgrade(state.gameState, hiveId);
      if (nextState !== state.gameState) {
        void saveGameStateSafe(nextState);
      }
      return { gameState: nextState };
    }),
  evolveHive: (hiveId) =>
    set((state) => {
      if (!state.gameState) return state;
      const nextState = applyEvolution(state.gameState, hiveId);
      if (nextState !== state.gameState) {
        void saveGameStateSafe(nextState);
      }
      return { gameState: nextState };
    }),
  upgradeClickPower: () =>
    set((state) => {
      if (!state.gameState) return state;
      const nextState = applyClickPowerUpgrade(state.gameState);
      if (nextState !== state.gameState) {
        void saveGameStateSafe(nextState);
      }
      return { gameState: nextState };
    }),
  addHiveToSwarm: (hiveId) =>
    set((state) => {
      if (!state.gameState) return state;
      const nextState = applyAddHiveToSwarm(state.gameState, hiveId);
      if (nextState !== state.gameState) {
        void saveGameStateSafe(nextState);
      }
      return { gameState: nextState };
    }),
  purchaseHive: () =>
    set((state) => {
      if (!state.gameState) return state;
      const nextState = applyPurchaseHive(state.gameState);
      if (nextState !== state.gameState) {
        void saveGameStateSafe(nextState);
      }
      return { gameState: nextState };
    }),
  setMusicVolume: (value) =>
    set((state) => {
      if (!state.gameState) return state;
      const nextState: GameState = {
        ...state.gameState,
        settings: {
          ...state.gameState.settings,
          audio: {
            ...state.gameState.settings.audio,
            musicVolume: Math.max(0, Math.min(1, value)),
          },
        },
      };
      void saveGameStateSafe(nextState);
      return { gameState: nextState };
    }),
  setSfxVolume: (value) =>
    set((state) => {
      if (!state.gameState) return state;
      const nextState: GameState = {
        ...state.gameState,
        settings: {
          ...state.gameState.settings,
          audio: {
            ...state.gameState.settings.audio,
            sfxVolume: Math.max(0, Math.min(1, value)),
          },
        },
      };
      void saveGameStateSafe(nextState);
      return { gameState: nextState };
    }),
  hiveWorldPositions: {},
  setHiveWorldPositions: (positions) => set({ hiveWorldPositions: positions }),
  setAutoUpgradeEnabled: (value) =>
    set((state) => {
      if (!state.gameState) return state;
      if (value) {
        const unlocked = state.gameState.hives.some(
          (hive) => hive.evolutionTier >= 1
        );
        if (!unlocked) {
          return state;
        }
      }
      const nextState: GameState = {
        ...state.gameState,
        settings: {
          ...state.gameState.settings,
          automation: {
            ...state.gameState.settings.automation,
            autoUpgradeEnabled: value,
          },
        },
      };
      void saveGameStateSafe(nextState);
      return { gameState: nextState };
    }),
  debug: {
    overlay: true,
    beesStats: false,
    beesMarkers: false,
  },
  setDebugFlag: (key, value) =>
    set((state) => ({
      debug: {
        ...state.debug,
        [key]: value,
      },
    })),
}));
