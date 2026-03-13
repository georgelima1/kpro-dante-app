import React, { useEffect, useMemo, useState } from "react";

type Unit = "samples" | "ms" | "feet" | "meter";

const SPEED_OF_SOUND_MS = 343;
const FEET_PER_METER = 3.28084;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function InputDelayEditor({
  delay,
  sampleRate,
  delayMaxMs,
  onChange
}: {
  delay: { enabled: boolean; valueSamples: number };
  sampleRate: number;
  delayMaxMs: number;
  onChange: (patch: Partial<{ enabled: boolean; valueSamples: number }>) => void;
}) {
  const [unit, setUnit] = useState<Unit>("ms");
  const [draft, setDraft] = useState(delay.valueSamples);

  useEffect(() => {
    setDraft(delay.valueSamples);
  }, [delay.valueSamples]);

  const maxSamples = useMemo(
    () => Math.round((sampleRate * delayMaxMs) / 1000),
    [sampleRate, delayMaxMs]
  );

  const valueSamples = draft;
  const valueMs = useMemo(() => (valueSamples / sampleRate) * 1000, [valueSamples, sampleRate]);
  const valueMeters = useMemo(() => (valueMs / 1000) * SPEED_OF_SOUND_MS, [valueMs]);
  const valueFeet = useMemo(() => valueMeters * FEET_PER_METER, [valueMeters]);

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
        return delayMaxMs;
      case "feet":
        return (delayMaxMs / 1000) * SPEED_OF_SOUND_MS * FEET_PER_METER;
      case "meter":
        return (delayMaxMs / 1000) * SPEED_OF_SOUND_MS;
    }
  }, [unit, maxSamples, delayMaxMs]);

  function toSamplesFromUnit(v: number) {
    switch (unit) {
      case "samples":
        return Math.round(v);
      case "ms":
        return Math.round((v / 1000) * sampleRate);
      case "feet": {
        const meters = v / FEET_PER_METER;
        const ms = (meters / SPEED_OF_SOUND_MS) * 1000;
        return Math.round((ms / 1000) * sampleRate);
      }
      case "meter": {
        const ms = (v / SPEED_OF_SOUND_MS) * 1000;
        return Math.round((ms / 1000) * sampleRate);
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">Delay</div>
          <div className="text-sm md:text-xs text-smx-muted">
            SR {sampleRate} Hz • Max {delayMaxMs} ms
          </div>
        </div>

        <button
          onClick={() => onChange({ enabled: !delay.enabled })}
          className={`relative w-12 h-6 rounded-full border transition ${
            delay.enabled
              ? "bg-smx-red/30 border-smx-red/50"
              : "bg-smx-panel border-smx-line"
          }`}
          type="button"
        >
          <span
            className={`absolute top-[0.07rem] left-[0.05rem] w-5 h-5 rounded-full transition-transform ${
              delay.enabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"
            }`}
          />
        </button>
      </div>

      <div className={!delay.enabled ? "opacity-45 grayscale pointer-events-none" : ""}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["samples", "ms", "feet", "meter"] as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`py-3 rounded-xl border text-sm font-semibold transition ${
                unit === u
                  ? "bg-smx-red/15 border-smx-red/40 text-smx-text"
                  : "bg-smx-panel border-smx-line text-smx-muted hover:border-smx-red/30"
              }`}
            >
              {u === "samples" ? "Samples" : u === "ms" ? "Ms" : u === "feet" ? "Feet" : "Meter"}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3 text-sm md:text-xs text-smx-muted">
            <span>Delay [{unit}]</span>
            <span className="text-smx-text font-semibold">
              {unit === "samples" ? valueSamples : sliderValue.toFixed(2)} {unit === "samples" ? "" : unit}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={sliderMax}
            step={unit === "samples" ? 1 : 0.01}
            value={sliderValue}
            onChange={(e) => {
              const nextSamples = clamp(toSamplesFromUnit(Number(e.target.value)), 0, maxSamples);
              setDraft(nextSamples);
            }}
            onMouseUp={() => onChange({ valueSamples: draft })}
            onTouchEnd={() => onChange({ valueSamples: draft })}
            className="w-full smx-range smx-range-fill smx-range-red"
            style={{
              ["--fill" as any]: `${(sliderValue / sliderMax) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}