import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDevice } from "../state/DeviceContext";

type Unit = "samples" | "ms" | "feet" | "meter";

const SPEED_OF_SOUND_MS = 343; // m/s
const FEET_PER_METER = 3.28084;

const API = (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:8787";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function DelayPage() {
  const { status, setStatus, deviceId, ch } = useDevice();
  const channel = status?.channels?.find((c) => c.ch === ch);

  const sr = status?.dsp?.sampleRate ?? 48000;
  const maxMs = status?.dsp?.delayMaxMs ?? 100;

  const maxSamples = useMemo(() => Math.round((sr * maxMs) / 1000), [sr, maxMs]);

  const enabled = channel?.delay?.enabled ?? true;
  const serverSamples = channel?.delay?.valueSamples ?? 0;

  const [unit, setUnit] = useState<Unit>("ms");

  const [draftSamples, setDraftSamples] = useState<number>(serverSamples);

  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setDraftSamples(serverSamples);
  }, [serverSamples, ch, deviceId]);

  // ---- conversões sempre a partir do draft ----
  const draftMs = useMemo(() => (draftSamples / sr) * 1000, [draftSamples, sr]);
  const draftMeters = useMemo(() => (draftMs / 1000) * SPEED_OF_SOUND_MS, [draftMs]);
  const draftFeet = useMemo(() => draftMeters * FEET_PER_METER, [draftMeters]);

  // sliderValue exibido depende da unidade
  const sliderValue = useMemo(() => {
    switch (unit) {
      case "samples":
        return draftSamples;
      case "ms":
        return draftMs;
      case "feet":
        return draftFeet;
      case "meter":
        return draftMeters;
    }
  }, [unit, draftSamples, draftMs, draftFeet, draftMeters]);

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

  const sliderStep = useMemo(() => {
    switch (unit) {
      case "samples":
        return 1;
      case "ms":
        return 0.01;
      case "feet":
        return 0.01;
      case "meter":
        return 0.01;
    }
  }, [unit]);

  // ✅ passos “pro” pros botões (você pode ajustar)
  const buttonStep = useMemo(() => {
    switch (unit) {
      case "samples":
        return 1; // 1 sample
      case "ms":
        return 0.10; // 0.1 ms
      case "feet":
        return 0.10; // 0.1 ft
      case "meter":
        return 0.01; // 1 cm
    }
  }, [unit]);

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

    const r = await fetch(`${API}/api/v1/devices/${deviceId}/ch/${ch}/delay`, {
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

  async function commitDelaySamples(samples: number) {
    if (!deviceId || !ch) return;
    const clamped = clamp(samples, 0, maxSamples);

    const r = await fetch(`${API}/api/v1/devices/${deviceId}/ch/${ch}/delay`, {
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

  // ✅ botões up/down: ajusta local e já “commit” no server (1 clique = 1 POST)
  function nudge(delta: number) {
    const nextValueUnit = clamp(sliderValue + delta, 0, sliderMax);
    const nextSamples = clamp(toSamplesFromUnit(nextValueUnit), 0, maxSamples);

    setDraftSamples(nextSamples);
    commitDelaySamples(nextSamples);
  }

  if (!status || !channel) return null;

  const disabledWrap =
    !enabled ? "opacity-45 grayscale pointer-events-none select-none" : "opacity-100";

  const tabBase = "flex-1 py-3 text-sm font-semibold rounded-2xl transition border";
  const tabActive = "bg-smx-red/20 border-smx-red/40 text-smx-text";
  const tabIdle = "bg-smx-panel2 border-smx-line text-smx-muted hover:border-smx-red/30";

  const fillPct = sliderMax > 0 ? (sliderValue / sliderMax) * 100 : 0;

  // label unidade
  const unitLabel = unit === "samples" ? "" : unit;

  // botões estilo Pascal (quadradinhos)
  const arrowBtn =
    "w-11 h-11 rounded-2xl border bg-smx-panel2 border-smx-line hover:border-smx-red/40 " +
    "transition active:scale-95 grid place-items-center text-white";

  return (
    <div className="max-w-8xl space-y-8">
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
            className={`relative w-14 h-8 rounded-full border transition ${enabled ? "bg-smx-red/30 border-smx-red/50" : "bg-smx-panel2 border-smx-line"
              }`}
            aria-label="Delay On/Off"
            title="Delay On/Off"
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-transform ${enabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"
                }`}
            />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className={disabledWrap}>
            <div className="bg-black/10 border border-smx-line rounded-2xl p-2">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] uppercase tracking-wide text-smx-muted">
                  Unit
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  className={`${tabBase} ${unit === "samples" ? tabActive : tabIdle}`}
                  onClick={() => setUnit("samples")}
                  type="button"
                >
                  Samples
                </button>
                <button
                  className={`${tabBase} ${unit === "ms" ? tabActive : tabIdle}`}
                  onClick={() => setUnit("ms")}
                  type="button"
                >
                  Ms
                </button>
                <button
                  className={`${tabBase} ${unit === "feet" ? tabActive : tabIdle}`}
                  onClick={() => setUnit("feet")}
                  type="button"
                >
                  Feet
                </button>
                <button
                  className={`${tabBase} ${unit === "meter" ? tabActive : tabIdle}`}
                  onClick={() => setUnit("meter")}
                  type="button"
                >
                  Meter
                </button>
              </div>
            </div>

            {/* slider card */}
            <div className="mt-4 bg-black/10 border border-smx-line rounded-2xl py-2 px-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  Delay{" "}
                  <span className="text-smx-muted font-normal">
                    [{unit === "samples" ? "samples" : unit}]
                  </span>
                </div>

                {/* ✅ botões up/down + valor (como você pediu) */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={arrowBtn}
                    onClick={() => nudge(+buttonStep)}
                    title={`Increase (+${buttonStep} ${unit})`}
                    aria-label="Increase delay"
                  >
                    {/* seta pra cima */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 5l7 7-1.4 1.4L12 8.8 6.4 13.4 5 12l7-7z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>

                  <div className="text-lg font-semibold min-w-[80px] text-right">
                    {unit === "samples" ? draftSamples : sliderValue.toFixed(2)}{" "}
                    <span className="text-smx-muted text-sm font-normal">{unitLabel}</span>
                  </div>

                  <button
                    type="button"
                    className={arrowBtn}
                    onClick={() => nudge(-buttonStep)}
                    title={`Decrease (-${buttonStep} ${unit})`}
                    aria-label="Decrease delay"
                  >
                    {/* seta pra baixo */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 19l-7-7 1.4-1.4L12 15.2l5.6-4.6L19 12l-7 7z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <input
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={sliderStep}
                  value={sliderValue}
                  onPointerDown={() => {
                    draggingRef.current = true;
                  }}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const nextSamples = clamp(toSamplesFromUnit(v), 0, maxSamples);
                    setDraftSamples(nextSamples);
                  }}
                  onPointerUp={() => {
                    draggingRef.current = false;
                    commitDelaySamples(draftSamples);
                  }}
                  className="w-full smx-range smx-range-fill smx-range-red"
                  style={{
                    ["--fill" as any]: `${fillPct}%`
                  }}
                />

                <div className="flex justify-between text-xs text-smx-muted">
                  <span>0</span>
                  <span>{unit === "samples" ? maxSamples : Math.round(sliderMax)}</span>
                </div>
              </div>
            </div>

            {/* equivalências */}
            <div className="text-sm text-smx-muted space-y-2 mt-4">
              <div>
                Delay equals <span className="text-smx-text font-semibold">{draftSamples}</span>{" "}
                samples
              </div>
              <div>
                Delay equals <span className="text-smx-text font-semibold">{draftMs.toFixed(2)}</span>{" "}
                ms
              </div>
              <div>
                Delay equals{" "}
                <span className="text-smx-text font-semibold">{draftFeet.toFixed(2)}</span> feet
                (aprox.)
              </div>
              <div>
                Delay equals{" "}
                <span className="text-smx-text font-semibold">{draftMeters.toFixed(2)}</span> meter
                (aprox.)
              </div>
            </div>
          </div>

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