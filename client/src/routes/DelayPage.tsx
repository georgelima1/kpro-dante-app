import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChannelHeader from "../ui/ChannelHeader";

type DelayUnit = "samples" | "ms" | "feet" | "meter";

type DelayState = {
  enabled: boolean;
  valueSamples: number; // fonte de verdade
};

const SR = 48000;            // sample rate (ajuste quando vier do device)
const SPEED_M_S = 343;       // velocidade do som (m/s)
const MAX_MS = 100;          // igual ao print
const MAX_SAMPLES = Math.round((SR * MAX_MS) / 1000);

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function samplesToMs(samples: number) {
  return (samples / SR) * 1000;
}
function msToSamples(ms: number) {
  return Math.round((ms / 1000) * SR);
}
function samplesToMeters(samples: number) {
  const sec = samples / SR;
  return sec * SPEED_M_S;
}
function metersToSamples(m: number) {
  const sec = m / SPEED_M_S;
  return Math.round(sec * SR);
}
function metersToFeet(m: number) {
  return m * 3.28084;
}
function feetToMeters(ft: number) {
  return ft / 3.28084;
}

function formatDec(n: number, dec: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function DelayPage() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const ch = Number(sp.get("ch") ?? "1");

  if (!id) return <div className="text-sm text-smx-muted">Device não informado.</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <DelayPanel deviceId={id} ch={ch} />
    </div>
  );
}

function DelayPanel({ deviceId, ch }: { deviceId: string; ch: number }) {
  const [unit, setUnit] = useState<DelayUnit>("ms");
  const [state, setState] = useState<DelayState>({ enabled: true, valueSamples: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // carrega config do canal
  useEffect(() => {
    let ok = true;
    setLoading(true);
    fetch(`/api/v1/devices/${deviceId}/ch/${ch}/delay`)
      .then((r) => r.json())
      .then((j) => {
        if (!ok) return;
        setState({
          enabled: !!j.enabled,
          valueSamples: clamp(Number(j.valueSamples ?? 0), 0, MAX_SAMPLES)
        });
      })
      .catch(() => {})
      .finally(() => ok && setLoading(false));
    return () => {
      ok = false;
    };
  }, [deviceId, ch]);

  const ms = useMemo(() => samplesToMs(state.valueSamples), [state.valueSamples]);
  const meters = useMemo(() => samplesToMeters(state.valueSamples), [state.valueSamples]);
  const feet = useMemo(() => metersToFeet(meters), [meters]);

  const sliderValue = useMemo(() => {
    switch (unit) {
      case "samples":
        return state.valueSamples;
      case "ms":
        return ms;
      case "meter":
        return meters;
      case "feet":
        return feet;
    }
  }, [unit, state.valueSamples, ms, meters, feet]);

  const sliderMax = useMemo(() => {
    switch (unit) {
      case "samples":
        return MAX_SAMPLES;
      case "ms":
        return MAX_MS;
      case "meter":
        return samplesToMeters(MAX_SAMPLES);
      case "feet":
        return metersToFeet(samplesToMeters(MAX_SAMPLES));
    }
  }, [unit]);

  function setFromSlider(v: number) {
    let nextSamples = 0;
    if (unit === "samples") nextSamples = Math.round(v);
    if (unit === "ms") nextSamples = msToSamples(v);
    if (unit === "meter") nextSamples = metersToSamples(v);
    if (unit === "feet") nextSamples = metersToSamples(feetToMeters(v));

    nextSamples = clamp(nextSamples, 0, MAX_SAMPLES);
    setState((s) => ({ ...s, valueSamples: nextSamples }));
  }

  async function save(patch: Partial<DelayState>) {
    setSaving(true);
    try {
      const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/delay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const j = await r.json();
      setState({
        enabled: !!j.enabled,
        valueSamples: clamp(Number(j.valueSamples ?? 0), 0, MAX_SAMPLES)
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-smx-muted">Carregando delay...</div>;
  }

  return (
    <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
      {/* header da seção */}
      <div className="px-6 py-4 border-b border-smx-line flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Delay</span>
          <span className="text-xs text-smx-muted">CH {ch}</span>
        </div>

        {/* toggle enable */}
        <button
          onClick={() => save({ enabled: !state.enabled })}
          className={`relative w-12 h-7 rounded-full border transition ${
            state.enabled ? "bg-smx-red/25 border-smx-red/40" : "bg-smx-panel2 border-smx-line"
          } ${saving ? "opacity-70 pointer-events-none" : ""}`}
          aria-label="Ativar/Desativar Delay"
          title="Ativar/Desativar Delay"
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white/90 transition-transform ${
              state.enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* UNIT */}
        <div>
          <div className="text-xs text-smx-muted font-semibold tracking-wide mb-2">UNIT</div>

          <div className="grid grid-cols-4 bg-smx-panel2 border border-smx-line rounded-xl overflow-hidden">
            <UnitTab label="Samples" active={unit === "samples"} onClick={() => setUnit("samples")} />
            <UnitTab label="Ms" active={unit === "ms"} onClick={() => setUnit("ms")} />
            <UnitTab label="Feet" active={unit === "feet"} onClick={() => setUnit("feet")} />
            <UnitTab label="Meter" active={unit === "meter"} onClick={() => setUnit("meter")} />
          </div>
        </div>

        {/* slider card */}
        <div className="bg-black/10 border border-smx-line rounded-2xl p-5">
          <div className="flex items-center justify-between text-sm font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-smx-text">Delay</span>
              <span className="text-xs text-smx-muted">
                [{unit === "samples" ? "samples" : unit}]
              </span>
            </div>

            <div className="text-smx-text">
              {unit === "samples" ? (
                <>
                  {Math.round(sliderValue)} <span className="text-xs text-smx-muted">samples</span>
                </>
              ) : unit === "ms" ? (
                <>
                  {formatDec(sliderValue, 2)} <span className="text-xs text-smx-muted">ms</span>
                </>
              ) : unit === "feet" ? (
                <>
                  {formatDec(sliderValue, 2)} <span className="text-xs text-smx-muted">ft</span>
                </>
              ) : (
                <>
                  {formatDec(sliderValue, 3)} <span className="text-xs text-smx-muted">m</span>
                </>
              )}
            </div>
          </div>

          <div className={`mt-4 ${!state.enabled ? "opacity-50 pointer-events-none" : ""}`}>
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={unit === "samples" ? 1 : 0.01}
              value={sliderValue}
              onChange={(e) => setFromSlider(Number(e.target.value))}
              onMouseUp={() => save({ valueSamples: state.valueSamples })}
              onTouchEnd={() => save({ valueSamples: state.valueSamples })}
              className="w-full smx-range smx-range-fill smx-range-red"
              style={{
                ["--fill" as any]: `${(sliderValue / sliderMax) * 100}%`
              }}
            />

            {/* marks 0-25-50-75-100 (igual ao print) */}
            <div className="mt-2 flex justify-between text-[11px] text-smx-muted px-1">
              <span>0</span>
              <span>{Math.round(sliderMax * 0.25)}</span>
              <span>{Math.round(sliderMax * 0.5)}</span>
              <span>{Math.round(sliderMax * 0.75)}</span>
              <span>{Math.round(sliderMax)}</span>
            </div>
          </div>
        </div>

        {/* equals */}
        <div className="space-y-2 text-sm">
          <Line label="Delay equals" value={`${Math.round(state.valueSamples)} samples`} />
          <Line label="Delay equals" value={`${formatDec(ms, 2)} ms`} />
          <Line label="Delay equals" value={`${formatDec(feet, 2)} feet`} />
          <Line label="Delay equals" value={`${formatDec(meters, 3)} meter`} />
        </div>
      </div>
    </section>
  );
}

function UnitTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 text-sm font-semibold border-r last:border-r-0 transition ${
        active
          ? "bg-[#0b6bff] text-white"
          : "bg-transparent text-smx-text hover:bg-black/10"
      } border-smx-line`}
    >
      {label}
    </button>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-smx-text">
      <span className="font-semibold">{label}</span> <span className="text-smx-text">{value}</span>
    </div>
  );
}
