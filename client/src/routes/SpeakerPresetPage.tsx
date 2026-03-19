import React from "react";
import { useDevice } from "../state/DeviceContext";

export default function SpeakerPresetPage() {
  const { ch } = useDevice();

  return (
    <div className="max-w-6xl space-y-6">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line">
          <div className="text-base font-semibold">Speaker Preset</div>
          <div className="text-sm md:text-xs text-smx-muted">
            CH {ch} • Crossover, EQ, limiter and output processing
          </div>
        </div>

        <div className="p-6 text-sm text-smx-muted">
          Selecione um item do submenu em Speaker Preset.
        </div>
      </section>
    </div>
  );
}