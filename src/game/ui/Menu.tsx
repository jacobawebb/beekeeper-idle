"use client";

import { useState } from "react";
import { exportIdentity, importIdentity } from "@/game/state/identity";
import { createInitialGameState, resetSave } from "@/game/state/save";
import { useGameStore } from "@/game/state/store";

type MenuProps = {
  open: boolean;
  onClose: () => void;
  lastSavedAt: number | null;
  nextSaveAt: number | null;
  nowTs: number;
};

export default function Menu({
  open,
  onClose,
  lastSavedAt,
  nextSaveAt,
  nowTs,
}: MenuProps) {
  const setGameState = useGameStore((state) => state.setGameState);
  const musicVolume =
    useGameStore((state) => state.gameState?.settings.audio.musicVolume) ?? 0.6;
  const sfxVolume =
    useGameStore((state) => state.gameState?.settings.audio.sfxVolume) ?? 0.7;
  const setMusicVolume = useGameStore((state) => state.setMusicVolume);
  const setSfxVolume = useGameStore((state) => state.setSfxVolume);
  const debug = useGameStore((state) => state.debug);
  const setDebugFlag = useGameStore((state) => state.setDebugFlag);
  const [status, setStatus] = useState<string | null>(null);
  const [exportValue, setExportValue] = useState("");
  const [importValue, setImportValue] = useState("");

  const nextInMs = nextSaveAt ? Math.max(0, nextSaveAt - nowTs) : null;
  const nextInSec =
    nextInMs !== null ? Math.ceil(nextInMs / 1000) : null;
  const lastSavedLabel = lastSavedAt
    ? `Saved ${Math.max(0, Math.round((nowTs - lastSavedAt) / 1000))}s ago`
    : "Not saved yet";

  if (!open) return null;

  const handleExport = async () => {
    try {
      const exportString = await exportIdentity();
      setExportValue(exportString);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportString);
        setStatus("Identity copied to clipboard.");
      } else {
        setStatus("Identity ready to copy.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Export failed.");
    }
  };

  const handleImport = async () => {
    if (!importValue.trim()) {
      setStatus("Paste an identity export string first.");
      return;
    }
    const confirmed = window.confirm(
      "Importing will replace your current identity. Continue?"
    );
    if (!confirmed) return;

    try {
      await importIdentity(importValue.trim());
      setStatus("Identity imported successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Import failed. Invalid or corrupted key.");
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "This will reset your save. Identity is unchanged. Continue?"
    );
    if (!confirmed) return;
    try {
      await resetSave();
      setGameState(createInitialGameState());
      setStatus("Save reset.");
    } catch (error) {
      console.error(error);
      setStatus("Reset failed.");
    }
  };

  return (
    <div className="pointer-events-auto w-[min(92vw,720px)] rounded-3xl border border-[#5a3a22] bg-[#24160d] px-6 py-6 text-[#f3e4c8] shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d7b98a]">
          Game Menu
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-[#5a3a22] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f0d8b0] transition hover:bg-[#3b2415]"
        >
          Close
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4 text-xs text-[#e1c79b]">
        <div className="rounded-xl border border-[#5a3a22] bg-[#2c1b10] px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b98a]">
            Audio
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span>Music</span>
              <span>{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(musicVolume * 100)}
              onChange={(event) =>
                setMusicVolume(Number(event.target.value) / 100)
              }
              className="w-full accent-[#c28b4b]"
            />
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span>SFX</span>
              <span>{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(sfxVolume * 100)}
              onChange={(event) =>
                setSfxVolume(Number(event.target.value) / 100)
              }
              className="w-full accent-[#c28b4b]"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-[#5a3a22] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f0d8b0] transition hover:bg-[#3b2415]"
          >
            Export Identity
          </button>
          <textarea
            value={exportValue}
            readOnly
            placeholder="Exported key appears here."
            className="h-16 w-full resize-none rounded-md border border-[#5a3a22] bg-[#1b120b] px-2 py-2 text-[11px] text-[#f3e4c8]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <textarea
            value={importValue}
            onChange={(event) => setImportValue(event.target.value)}
            placeholder="Paste identity export string to import."
            className="h-16 w-full resize-none rounded-md border border-[#5a3a22] bg-[#1b120b] px-2 py-2 text-[11px] text-[#f3e4c8]"
          />
          <button
            type="button"
            onClick={handleImport}
            className="rounded-md border border-[#5a3a22] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f0d8b0] transition hover:bg-[#3b2415]"
          >
            Import Identity
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-[#5a3a22] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f0d8b0] transition hover:bg-[#3b2415]"
          >
            Reset Save
          </button>
        </div>

        <div className="rounded-xl border border-[#5a3a22] bg-[#2c1b10] px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b98a]">
            Save Status
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#e1c79b]">
            <div>{lastSavedLabel}</div>
            <div>
              Next save {nextInSec !== null ? `in ${nextInSec}s` : "pending"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#5a3a22] bg-[#2c1b10] px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b98a]">
            Debug
          </div>
          <div className="mt-3 grid gap-2 text-[11px]">
            <label className="flex items-center justify-between gap-3">
              <span>Overlay</span>
              <input
                type="checkbox"
                checked={debug.overlay}
                onChange={(event) => setDebugFlag("overlay", event.target.checked)}
                className="h-4 w-4 accent-[#c28b4b]"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Bee Stats Log</span>
              <input
                type="checkbox"
                checked={debug.beesStats}
                onChange={(event) => setDebugFlag("beesStats", event.target.checked)}
                className="h-4 w-4 accent-[#c28b4b]"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Bee Markers</span>
              <input
                type="checkbox"
                checked={debug.beesMarkers}
                onChange={(event) => setDebugFlag("beesMarkers", event.target.checked)}
                className="h-4 w-4 accent-[#c28b4b]"
              />
            </label>
          </div>
        </div>

        {status ? (
          <div className="rounded-md border border-[#5a3a22] bg-[#2c1b10] px-2 py-2 text-[11px] text-[#e1c79b]">
            {status}
          </div>
        ) : null}
      </div>
    </div>
  );
}
