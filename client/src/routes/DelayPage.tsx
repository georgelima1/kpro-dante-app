import React, { useMemo, useState } from "react";
import { useDevice } from "../state/DeviceContext";

type Unit = "samples" | "ms" | "feet" | "meter";

const SPEED_OF_SOUND_MS = 343; // m/s
const MS_PER_SECOND = 1000;
const FEET_PER_METER = 3.28084;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function DelayPage() {
  const { status, setStatus, deviceId, ch } = useDevice(); // se no seu ctx não tiver, veja nota abaixo
  const channel = status?.channels?.find((c) => c.ch === ch);

  const sr = status?.dsp?.sampleRate ?? 48000;
  const maxMs = status?.dsp?.delayMaxMs ?? 100;

  // max samples baseado no SR + maxMs
  const maxSamples = useMemo(() => Math.round((sr * maxMs) / 1000), [sr, maxMs]);

  const enabled = channel?.delay?.enabled ?? true;
  const valueSamples = channel?.delay?.valueSamples ?? 0;

  const [unit, setUnit] = useState<Unit>("ms");

  // conversões
  const valueMs = useMemo(() => (valueSamples / sr) * 1000, [valueSamples, sr]);
  const valueMeters = useMemo(() => (valueMs / 1000) * SPEED_OF_SOUND_MS, [valueMs]);
  const valueFeet = useMemo(() => valueMeters * FEET_PER_METER, [valueMeters]);

  // slider sempre manda samples pro server
  const sliderValue = useMemo(() => {
    switch (unit) {
      case "samples":
        return valueSamples;
      case "ms":
        return valueMs;
      case "feet":
        return valueFeet;
      case "meter":
        return valueMeters;
    }
  }, [unit, valueSamples, valueMs, valueFeet, valueMeters]);

  const sliderMax = useMemo(() => {
    switch (unit) {
      case "samples":
        return maxSamples;
      case "ms":
        return maxMs;
      case "feet":
        return (maxMs / 1000) * SPEED_OF_SOUND_MS * FEET_PER_METER;
      case "meter":
        return (maxMs / 1000) * SPEED_OF_SOUND_MS;
    }
  }, [unit, maxSamples, maxMs]);

  function toSamplesFromUnit(v: number) {
    switch (unit) {
      case "samples":
        return Math.round(v);
      case "ms":
        return Math.round((v / 1000) * sr);
      case "feet": {
        const meters = v / FEET_PER_METER;
        const ms = (meters / SPEED_OF_SOUND_MS) * 1000;
        return Math.round((ms / 1000) * sr);
      }
      case "meter": {
        const ms = (v / SPEED_OF_SOUND_MS) * 1000;
        return Math.round((ms / 1000) * sr);
      }
    }
  }

  async function setDelayEnabled(next: boolean) {
    if (!deviceId || !ch) return;
    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/delay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next })
    });
    const j = await r.json();

    setStatus((s) => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map((c) => (c.ch === ch ? { ...c, delay: j.delay } : c))
      };
    });
  }

  async function setDelaySamples(samples: number) {
    if (!deviceId || !ch) return;
    const clamped = clamp(samples, 0, maxSamples);

    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/delay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valueSamples: clamped })
    });
    const j = await r.json();

    setStatus((s) => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map((c) => (c.ch === ch ? { ...c, delay: j.delay } : c))
      };
    });
  }

  if (!status || !channel) return null;

  // visual disabled (cinza) + sem clique
  const disabledWrap =
    !enabled
      ? "opacity-45 grayscale pointer-events-none select-none"
      : "opacity-100";

  const tabBase =
    "flex-1 py-3 text-sm font-semibold rounded-2xl transition border";
  const tabActive =
    "bg-smx-red/20 border-smx-red/40 text-smx-text";
  const tabIdle =
    "bg-smx-panel2 border-smx-line text-smx-muted hover:border-smx-red/30";

  return (
    <div className="max-w-6xl space-y-6">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        {/* header */}
        <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">Delay</div>
            <div className="text-xs text-smx-muted">
              SR {sr} Hz • Max {maxMs} ms
            </div>
          </div>

          {/* switch */}
          <button
            onClick={() => setDelayEnabled(!enabled)}
            className={`relative w-14 h-8 rounded-full border transition
              ${enabled ? "bg-smx-red/30 border-smx-red/50" : "bg-smx-panel2 border-smx-line"}
            `}
            aria-label="Delay On/Off"
            title="Delay On/Off"
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-transform
                ${enabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"}
              `}
            />
          </button>
        </div>

        {/* content (cinza quando OFF) */}
        <div className="p-5 space-y-5">
          <div className={disabledWrap}>
            <div className="text-xs text-smx-muted mb-2">UNIT</div>

            {/* tabs 4 unidades */}
            <div className="flex gap-2 bg-black/10 border border-smx-line rounded-2xl p-2">
              <button
                className={`${tabBase} ${unit === "samples" ? tabActive : tabIdle}`}
                onClick={() => setUnit("samples")}
              >
                Samples
              </button>
              <button
                className={`${tabBase} ${unit === "ms" ? tabActive : tabIdle}`}
                onClick={() => setUnit("ms")}
              >
                Ms
              </button>
              <button
                className={`${tabBase} ${unit === "feet" ? tabActive : tabIdle}`}
                onClick={() => setUnit("feet")}
              >
                Feet
              </button>
              <button
                className={`${tabBase} ${unit === "meter" ? tabActive : tabIdle}`}
                onClick={() => setUnit("meter")}
              >
                Meter
              </button>
            </div>

            {/* slider card */}
            <div className="mt-4 bg-black/10 border border-smx-line rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  Delay{" "}
                  <span className="text-smx-muted font-normal">
                    [{unit === "samples" ? "samples" : unit}]
                  </span>
                </div>
                <div className="text-lg font-semibold">
                  {unit === "samples" ? valueSamples : sliderValue.toFixed(2)}{" "}
                  <span className="text-smx-muted text-sm font-normal">
                    {unit === "samples" ? "" : unit}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <input
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={unit === "samples" ? 1 : unit === "ms" ? 0.01 : 0.01}
                  value={sliderValue}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    const samples = toSamplesFromUnit(raw);
                    setDelaySamples(samples);
                  }}
                  className="w-full smx-range smx-range-fill smx-range-red"
                  style={{
                    ["--fill" as any]: `${(sliderValue / sliderMax) * 100}%`
                  }}
                />

                <div className="mt-2 flex justify-between text-xs text-smx-muted">
                  <span>0</span>
                  <span>{unit === "samples" ? maxSamples : Math.round(sliderMax)}</span>
                </div>
              </div>
            </div>

            {/* equivalências */}
            <div className="text-sm text-smx-muted space-y-2 mt-4">
              <div>
                Delay equals{" "}
                <span className="text-smx-text font-semibold">{valueSamples}</span> samples
              </div>
              <div>
                Delay equals{" "}
                <span className="text-smx-text font-semibold">{valueMs.toFixed(2)}</span> ms
              </div>
              <div>
                Delay equals{" "}
                <span className="text-smx-text font-semibold">{valueFeet.toFixed(2)}</span> feet (aprox.)
              </div>
              <div>
                Delay equals{" "}
                <span className="text-smx-text font-semibold">{valueMeters.toFixed(2)}</span> meter (aprox.)
              </div>
            </div>
          </div>

          {/* dica quando OFF */}
          {!enabled && (
            <div className="text-xs text-smx-muted">
              Delay está desativado (OFF). Ative o switch para editar.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}