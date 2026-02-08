"use client";

import { getSharedAudioContext } from "./audio";
import { useGameStore } from "@/game/state/store";

export function playClickSound() {
  const context = getSharedAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }

  const sfxVolume =
    useGameStore.getState().gameState?.settings.audio.sfxVolume ?? 0.7;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 640;
  gain.gain.value = 0.06 * sfxVolume;

  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  gain.gain.setValueAtTime(0.05 * sfxVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  oscillator.start(now);
  oscillator.stop(now + 0.1);
}
