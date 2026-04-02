import React, { useEffect, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import { API_BASE } from "../config/endpoints";
import SpeakerPresetLocked from "../ui/SpeakerPresetLocked";

type SpeakerPresetPolarityState = {
  polarity: 1 | -1;
};

const DEFAULT_POLARITY: SpeakerPresetPolarityState = {
  polarity: 1
};

export default function SpeakerPresetPolarityPage() {
  const { status, deviceId, ch } = useDevice();
  const [data, setData] = useState<SpeakerPresetPolarityState>(DEFAULT_POLARITY);

  const channel = status?.channels?.find((c) => c.ch === ch);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!deviceId || !ch) return;

      try {
        const r = await fetch(
          `${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/polarity`
        );
        const j = await r.json();

        if (!alive) return;

        setData({
          polarity: j.polarity?.polarity === -1 ? -1 : 1
        });
      } catch {
        if (!alive) return;
        setData(DEFAULT_POLARITY);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [deviceId, ch]);

  async function updatePolarity(next: 1 | -1) {
    if (!deviceId || !ch) return;

    const r = await fetch(
      `${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/polarity`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polarity: next })
      }
    );

    const j = await r.json();

    setData({
      polarity: j.polarity?.polarity === -1 ? -1 : 1
    });
  }

  if (!status || !channel) {
    return <div className="text-sm text-smx-muted">Carregando polarity...</div>;
  }

  if (channel.speakerPreset?.locked) {
    return (
      <SpeakerPresetLocked
        title="Preset Locked"
        message="This manufacturer preset is protected. Polarity settings cannot be viewed or edited."
      />
    );
  }

  const channelPolarity = channel.audio?.polarity === -1 ? -1 : 1;
  const effectivePolarity = data.polarity * channelPolarity;

  return (
    <div className="w-full max-w-none space-y-6">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">

            <div className="text-base font-semibold">Speaker Polarity</div>
            <div className="text-sm md:text-xs text-smx-muted">
              CH {ch} • Polarity from speaker(s) channel
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">


          <PolarityToggle
            value={data.polarity}
            onChange={(v) => updatePolarity(v)}
          />
        </div>
      </section>
    </div>
  );
}

function PolarityToggle({
  value,
  onChange
}: {
  value: 1 | -1;
  onChange: (v: 1 | -1) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-smx-line overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`px-5 h-12 text-sm font-semibold tracking-[0.04em] transition ${value === 1
            ? "bg-smx-red/20 border-r border-smx-red/40 text-white"
            : "bg-smx-panel2 border-r border-smx-line text-smx-muted hover:text-smx-text hover:bg-black/20"
          }`}
      >
        Normal
      </button>

      <button
        type="button"
        onClick={() => onChange(-1)}
        className={`px-5 h-12 text-sm font-semibold tracking-[0.04em] transition ${value === -1
            ? "bg-smx-red/20 text-white"
            : "bg-smx-panel2 text-smx-muted hover:text-smx-text hover:bg-black/20"
          }`}
      >
        Inverted
      </button>
    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight = false
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight
          ? "border-smx-red/40 bg-smx-red/10"
          : "border-smx-line bg-smx-panel2"
        }`}
    >
      <div className="text-sm md:text-xs text-smx-muted">{label}</div>
      <div className="mt-1 text-smx-text font-semibold">{value}</div>
    </div>
  );
}

function IconGlyph({ name }: { name: string }) {
  return (
    <span
      className="material-symbols-outlined leading-none text-white"
      style={{
        fontSize: 20,
        fontVariationSettings: `"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24`
      }}
    >
      {name}
    </span>
  );
}