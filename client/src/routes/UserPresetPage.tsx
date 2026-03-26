import React, { useEffect, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import { API_BASE } from "../config/endpoints";

type UserPresetState = {
  loaded: boolean;
  name?: string;
};

export default function UserPresetPage() {
  const { deviceId } = useDevice();
  const [preset, setPreset] = useState<UserPresetState | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!deviceId) return;

      try {
        const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/user-preset`);
        const j = await r.json();
        if (alive) setPreset(j.preset ?? null);
      } catch {
        if (alive) setPreset(null);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [deviceId]);

  async function clearPreset() {
    if (!deviceId) return;

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/user-preset/clear`, {
      method: "POST"
    });
    const j = await r.json();
    setPreset(j.preset ?? null);
  }

  async function exportPreset() {
    if (!deviceId) return;

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/user-preset/export`);
    const blob = await r.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-preset-${deviceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importPreset(file: File) {
    if (!deviceId) return;

    const form = new FormData();
    form.append("file", file);

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/user-preset/import`, {
      method: "POST",
      body: form
    });

    const j = await r.json();
    setPreset(j.preset ?? null);
  }

  const [importing, setImporting] = useState(false);

  function triggerImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setImporting(true);
        await importPreset(file);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }

  if (!preset) {
    return <div className="text-sm text-smx-muted">Carregando user preset...</div>;
  }

  return (
    <div className="max-w-6xl">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line flex items-center gap-3">
          <div className="text-base font-semibold">User Preset</div>
        </div>

        <div className="p-5 space-y-5">
          <div className="text-sm md:text-xs text-smx-muted">
            {preset.loaded ? (
              <>
                <span className="text-smx-text font-semibold">{preset.name}</span>
              </>
            ) : (
              "No Preset Loaded"
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={clearPreset}
              className="h-12 rounded-2xl border border-smx-line bg-smx-panel2 text-white text-sm font-semibold tracking-[0.12em] uppercase hover:border-smx-red/40 transition active:scale-95"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={exportPreset}
              className="h-12 rounded-2xl border border-smx-line bg-smx-panel2 text-white text-sm font-semibold tracking-[0.12em] uppercase hover:border-smx-red/40 transition active:scale-95"
            >
              Export File
            </button>

            <button
              type="button"
              disabled
              className="h-12 rounded-2xl border border-smx-line bg-smx-panel2 text-white/35 text-sm font-semibold tracking-[0.12em] uppercase cursor-not-allowed"
            >
              From Library
            </button>

            <button
              type="button"
              onClick={triggerImport}
              disabled={importing}
              className={`h-12 rounded-2xl border text-sm font-semibold tracking-[0.12em] uppercase transition active:scale-95 ${
                importing
                  ? "border-smx-line bg-smx-panel2 text-white/35 cursor-not-allowed"
                  : "border-smx-red bg-smx-red/20 text-white hover:bg-smx-red/30 hover:border-smx-red/60"
              }`}
            >
              {importing ? "Importing..." : "Import File"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}