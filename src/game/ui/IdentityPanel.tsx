"use client";

import { useEffect, useState } from "react";
import { exportIdentity, getOrCreateIdentity, importIdentity } from "@/game/state/identity";

export default function IdentityPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateIdentity()
      .then((identity) => setUserId(identity.userId))
      .catch((error) => {
        console.error(error);
        setStatus("Failed to load identity.");
      });
  }, []);

  const handleExport = async () => {
    try {
      const exportString = await exportIdentity();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportString);
        setStatus("Identity copied to clipboard.");
      } else {
        window.prompt("Copy identity export string:", exportString);
        setStatus("Identity ready for copy.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Export failed.");
    }
  };

  const handleImport = async () => {
    const confirmed = window.confirm(
      "Importing will replace your current identity. Continue?"
    );
    if (!confirmed) return;

    const exportString = window.prompt("Paste identity export string:");
    if (!exportString) return;

    try {
      const identity = await importIdentity(exportString);
      setUserId(identity.userId);
      setStatus("Identity imported.");
    } catch (error) {
      console.error(error);
      setStatus("Import failed.");
    }
  };

  return (
    <div className="pointer-events-auto rounded-xl border border-amber-200 bg-white/90 px-4 py-3 text-xs text-amber-950 shadow-sm backdrop-blur">
      <div className="font-semibold uppercase tracking-wide text-amber-700">
        Identity
      </div>
      <div className="mt-2 break-all text-[11px]">
        {userId ? `userId: ${userId}` : "Loading..."}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-amber-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-amber-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="rounded-md border border-amber-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-amber-50"
        >
          Import
        </button>
      </div>
      {status ? <div className="mt-2 text-[11px] text-amber-600">{status}</div> : null}
    </div>
  );
}
