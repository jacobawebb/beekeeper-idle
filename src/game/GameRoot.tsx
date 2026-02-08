"use client";

import { useEffect, useRef, useState } from "react";
import Scene from "./render/Scene";
import { getOrCreateIdentity } from "./state/identity";
import {
  loadGameState,
  saveGameStateSafe,
  startAutoSave,
  subscribeToSaves,
} from "./state/save";
import { useGameStore } from "./state/store";
import { applyOfflineProgress } from "./engine/offline";
import { step } from "./engine/step";
import { applyHiveUpgrade } from "./engine/economy";
import Hud from "./ui/Hud";
import Panels from "./ui/Panels";
import DebugOverlay from "./ui/DebugOverlay";
import Menu from "./ui/Menu";
import HiveContextMenu from "./ui/HiveContextMenu";
import { ensureMusicStarted, setMusicVolume } from "./ui/audio";
import type { GameState } from "./state/types";

export default function GameRoot() {
  const gameState = useGameStore((state) => state.gameState);
  const setGameState = useGameStore((state) => state.setGameState);
  const updateGameState = useGameStore((state) => state.updateGameState);
  const autoUpgradeEnabled =
    useGameStore((state) => state.gameState?.settings.automation.autoUpgradeEnabled) ??
    false;
  const debugOverlay = useGameStore((state) => state.debug.overlay);
  const rafId = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastHiddenAtRef = useRef<number | null>(null);
  const ticksThisSecondRef = useRef(0);
  const lastTickSampleRef = useRef<number | null>(null);
  const [debugStats, setDebugStats] = useState({ deltaMs: 0, ticksPerSec: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [nextSaveAt, setNextSaveAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const sessionStartRef = useRef(Date.now());
  const [fps, setFps] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    hiveId: string | null;
  }>({
    open: false,
    x: 0,
    y: 0,
    hiveId: null,
  });

  useEffect(() => {
    getOrCreateIdentity().catch((error) => {
      console.error("Failed to initialize identity", error);
    });
  }, []);

  useEffect(() => {
    loadGameState()
      .then((state) => {
        const now = Date.now();
        const elapsed = now - state.meta.lastSeenAt;
        const result = applyOfflineProgress(state, elapsed);
        if (result.appliedMs > 0) {
          console.info(
            `Applied offline progress for ${Math.round(
              result.appliedMs / 1000
            )}s${result.capped ? " (capped)" : ""}.`
          );
        }
        setLastSavedAt(result.state.meta.lastSeenAt);
        setGameState(result.state);
      })
      .catch((error) => {
        console.error("Failed to load game state", error);
      });
  }, [setGameState]);

  useEffect(() => {
    if (!gameState) return;
    const intervalMs = 15000;
    setNextSaveAt(Date.now() + intervalMs);
    const stop = startAutoSave(
      () => useGameStore.getState().gameState ?? gameState,
      intervalMs,
      (savedAt) => {
        setLastSavedAt(savedAt);
        setNextSaveAt(Date.now() + intervalMs);
      }
    );
    return () => stop();
  }, [gameState]);

  useEffect(() => {
    const unsubscribe = subscribeToSaves((savedAt) => {
      setLastSavedAt(savedAt);
      setNextSaveAt((current) => current ?? Date.now());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastSample = performance.now();
    let frames = 0;
    const loop = (now: number) => {
      frames += 1;
      if (now - lastSample >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastSample)));
        frames = 0;
        lastSample = now;
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastSample = performance.now();
    let frames = 0;
    const loop = (now: number) => {
      frames += 1;
      if (now - lastSample >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastSample)));
        frames = 0;
        lastSample = now;
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!gameState) return;
    const volume = gameState.settings.audio.musicVolume;
    setMusicVolume(volume);
  }, [gameState?.settings.audio.musicVolume]);

  useEffect(() => {
    const handleInteract = () => {
      const volume = useGameStore.getState().gameState?.settings.audio.musicVolume ?? 0.6;
      ensureMusicStarted(volume);
      window.removeEventListener("pointerdown", handleInteract);
      window.removeEventListener("keydown", handleInteract);
    };
    window.addEventListener("pointerdown", handleInteract);
    window.addEventListener("keydown", handleInteract);
    return () => {
      window.removeEventListener("pointerdown", handleInteract);
      window.removeEventListener("keydown", handleInteract);
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      event.preventDefault();
      setMenuOpen((open) => !open);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!gameState) return;

    const fixedDtMs = 100;
    const maxFrameDelta = 1000;
    const applyAutoUpgrades = (state: GameState) => {
      if (!autoUpgradeEnabled) return state;
      let nextState = state;
      for (let i = 0; i < nextState.hives.length; i += 1) {
        const hiveId = nextState.hives[i].id;
        const upgraded = applyHiveUpgrade(nextState, hiveId);
        nextState = upgraded;
      }
      return nextState;
    };

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const rawDelta = now - lastTimeRef.current;
      const delta = Math.min(rawDelta, maxFrameDelta);
      lastTimeRef.current = now;

      accumulatorRef.current += delta;
      while (accumulatorRef.current >= fixedDtMs) {
        updateGameState((current) =>
          applyAutoUpgrades(step(current, fixedDtMs))
        );
        accumulatorRef.current -= fixedDtMs;
        ticksThisSecondRef.current += 1;
      }

      if (lastTickSampleRef.current === null) {
        lastTickSampleRef.current = now;
      }
      const sinceSample = now - lastTickSampleRef.current;
      if (sinceSample >= 1000) {
        const ticksPerSec = (ticksThisSecondRef.current / sinceSample) * 1000;
        setDebugStats({ deltaMs: delta, ticksPerSec });
        ticksThisSecondRef.current = 0;
        lastTickSampleRef.current = now;
      }

      rafId.current = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafId.current !== null) return;
      lastTimeRef.current = null;
      accumulatorRef.current = 0;
      ticksThisSecondRef.current = 0;
      lastTickSampleRef.current = null;
      rafId.current = window.requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (rafId.current !== null) {
        window.cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      lastTimeRef.current = null;
      accumulatorRef.current = 0;
      ticksThisSecondRef.current = 0;
      lastTickSampleRef.current = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAtRef.current = Date.now();
        const snapshot = useGameStore.getState().gameState;
        if (snapshot) {
          saveGameStateSafe(snapshot);
        }
        stopLoop();
      } else {
        if (lastHiddenAtRef.current !== null) {
          const elapsed = Date.now() - lastHiddenAtRef.current;
          const { state, appliedMs, capped } = applyOfflineProgress(
            useGameStore.getState().gameState ?? gameState,
            elapsed
          );
          if (appliedMs > 0) {
            console.info(
              `Applied offline progress for ${Math.round(
                appliedMs / 1000
              )}s${capped ? " (capped)" : ""}.`
            );
            setGameState(state);
          }
          lastHiddenAtRef.current = null;
        }
        startLoop();
      }
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);

    const handleBeforeUnload = () => {
      const snapshot = useGameStore.getState().gameState;
      if (snapshot) {
        saveGameStateSafe(snapshot);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stopLoop();
    };
  }, [gameState, updateGameState]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-amber-50">
      <Scene
        onHiveContextMenu={(hiveId, x, y) => {
          setContextMenu({ open: true, hiveId, x, y });
        }}
      />
      <div className="absolute top-4 left-4 z-10 w-[360px] max-w-[90vw]">
        <Hud
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />
      </div>
      <div className="absolute bottom-4 left-1/2 z-10 w-[96vw] -translate-x-1/2">
        <Panels />
      </div>
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        {debugOverlay ? (
          <DebugOverlay
            deltaMs={debugStats.deltaMs}
            ticksPerSec={debugStats.ticksPerSec}
            fps={fps}
            sessionSeconds={Math.floor((nowTs - sessionStartRef.current) / 1000)}
            gameState={gameState}
          />
        ) : null}
      </div>
      {menuOpen ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b0704]/70 px-4 py-6 backdrop-blur-sm">
          <Menu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            lastSavedAt={lastSavedAt}
            nextSaveAt={nextSaveAt}
            nowTs={nowTs}
          />
        </div>
      ) : null}
      <HiveContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        hiveId={contextMenu.hiveId}
        onClose={() =>
          setContextMenu({ open: false, x: 0, y: 0, hiveId: null })
        }
      />
    </div>
  );
}
