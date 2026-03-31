import React, { useEffect, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import { API_BASE } from "../config/endpoints";

type SpeakerPresetState = {
  loaded: boolean;
  locked: boolean;
  name?: string;
  manufacturer?: string;
};

export default function SpeakerPresetPage() {
  const { deviceId, ch } = useDevice();
  const [preset, setPreset] = useState<SpeakerPresetState | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!deviceId || !ch) return;

      try {
        const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/preset`);
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
  }, [deviceId, ch]);

  async function clearPreset() {
    if (!deviceId || !ch) return;

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/preset/clear`, {
      method: "POST"
    });
    const j = await r.json();
    setPreset(j.preset ?? null);
  }

  if (!preset) {
    return <div className="text-sm text-smx-muted">Carregando speaker preset...</div>;
  }

  return (
    <div className="max-w-6xl">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line flex items-center gap-3">
          <div className="text-base font-semibold">Speaker Preset</div>
          <div className="text-sm md:text-xs text-smx-muted">
              Output Speaker Preset (Filters, FIR, Driver Alignment, Polarity, Limiter)
            </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="text-sm md:text-xs text-smx-muted">
            {preset.loaded ? (
              <>
                <span className="text-smx-text font-semibold">{preset.name}</span>
                {preset.locked && (
                  <span className="ml-2 text-smx-red font-semibold">• Locked</span>
                )}
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
              className="h-12 rounded-2xl border border-smx-red bg-smx-red/20 text-white text-sm font-semibold tracking-[0.12em] uppercase hover:bg-smx-red/30 hover:border-smx-red/60 transition active:scale-95"
            >
              Import File
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}