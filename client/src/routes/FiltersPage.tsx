import React, { useEffect, useMemo, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import FilterIcon from "../ui/FilterIcon";
import Select from "../ui/Select";
import { FilterType } from "../types/filters";

type CrossoverFamily = "butterworth" | "linkwitz_riley" | "bessel";

type ChannelFilter = {
  id: number;
  enabled: boolean;
  type: FilterType;
  freqHz: number;
  q: number;
  gainDb: number;
  slope?: 6 | 12 | 18 | 24 | 30 | 36 | 42 | 48;
  crossoverFamily?: CrossoverFamily;
};

const API = (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:8787";

const FILTER_TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "hpf", label: "High Pass" },
  { value: "lpf", label: "Low Pass" },
  { value: "parametric", label: "Parametric" },
  { value: "lowShelf", label: "Low Shelf" },
  { value: "highShelf", label: "High Shelf" },
  { value: "tiltShelf", label: "Tilt Shelf" },
  { value: "allPass", label: "All Pass" },
  { value: "bandPass", label: "Band Pass" },
  { value: "notch", label: "Notch" }
];

const CROSSOVER_OPTIONS: {
  family: CrossoverFamily;
  slope: ChannelFilter["slope"];
  label: string;
}[] = [
    { family: "butterworth", slope: 6, label: "Butterworth 6 dB/Oct" },
    { family: "butterworth", slope: 12, label: "Butterworth 12 dB/Oct" },
    { family: "butterworth", slope: 18, label: "Butterworth 18 dB/Oct" },
    { family: "butterworth", slope: 24, label: "Butterworth 24 dB/Oct" },
    { family: "butterworth", slope: 30, label: "Butterworth 30 dB/Oct" },
    { family: "butterworth", slope: 36, label: "Butterworth 36 dB/Oct" },
    { family: "butterworth", slope: 42, label: "Butterworth 42 dB/Oct" },
    { family: "butterworth", slope: 48, label: "Butterworth 48 dB/Oct" },

    { family: "linkwitz_riley", slope: 12, label: "Linkwitz-Riley 12 dB/Oct" },
    { family: "linkwitz_riley", slope: 24, label: "Linkwitz-Riley 24 dB/Oct" },
    { family: "linkwitz_riley", slope: 36, label: "Linkwitz-Riley 36 dB/Oct" },
    { family: "linkwitz_riley", slope: 48, label: "Linkwitz-Riley 48 dB/Oct" },

    { family: "bessel", slope: 6, label: "Bessel 6 dB/Oct" },
    { family: "bessel", slope: 12, label: "Bessel 12 dB/Oct" },
    { family: "bessel", slope: 18, label: "Bessel 18 dB/Oct" },
    { family: "bessel", slope: 24, label: "Bessel 24 dB/Oct" },
    { family: "bessel", slope: 30, label: "Bessel 30 dB/Oct" },
    { family: "bessel", slope: 36, label: "Bessel 36 dB/Oct" },
    { family: "bessel", slope: 42, label: "Bessel 42 dB/Oct" },
    { family: "bessel", slope: 48, label: "Bessel 48 dB/Oct" }
  ];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isGainUsed(type: FilterType) {
  return ["parametric", "lowShelf", "highShelf", "tiltShelf"].includes(type);
}

function isQUsed(type: FilterType) {
  return ["parametric", "lowShelf", "highShelf", "tiltShelf", "allPass", "bandPass", "notch"].includes(type);
}

function isCrossoverUsed(type: FilterType) {
  return type === "hpf" || type === "lpf";
}

export default function EqPage() {
  const { status, setStatus, deviceId, ch } = useDevice();
  const channel = status?.channels?.find((c) => c.ch === ch);

  const [filters, setFilters] = useState<ChannelFilter[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!deviceId || !ch) return;

    fetch(`${API}/api/v1/devices/${deviceId}/ch/${ch}/filters`)
      .then((r) => r.json())
      .then((j) => {
        const arr = (j.filters ?? []) as ChannelFilter[];
        setFilters(arr);
        setSelectedId((prev) => prev ?? arr[0]?.id ?? null);
      });
  }, [deviceId, ch]);

  const selectedFilter = useMemo(
    () => filters.find((f) => f.id === selectedId) ?? null,
    [filters, selectedId]
  );

  const disabledWrap =
  !selectedFilter?.enabled
    ? "opacity-45 grayscale pointer-events-none select-none"
    : "opacity-100";

  async function updateFilter(filterId: number, patch: Partial<ChannelFilter>) {
    const r = await fetch(`${API}/api/v1/devices/${deviceId}/ch/${ch}/filters/${filterId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });

    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text}`);
    const j = JSON.parse(text);

    setFilters((prev) => prev.map((f) => (f.id === filterId ? j.filter : f)));

    setStatus((s) => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map((c: any) =>
          c.ch === ch
            ? {
              ...c,
              filters: (c.filters ?? filters).map((f: ChannelFilter) =>
                f.id === filterId ? j.filter : f
              )
            }
            : c
        )
      };
    });
  }

  function updateLocal(filterId: number, patch: Partial<ChannelFilter>) {
    setFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, ...patch } : f))
    );
  }

  function renderSummary(f: ChannelFilter) {
    return (
      <div className="text-[11px] text-smx-muted mt-1">
        <div>{labelOfType(f.type)}</div>
        <div>{Math.round(f.freqHz)} Hz</div>
        {isQUsed(f.type) && <div>{f.q.toFixed(1)} Q</div>}
        {isGainUsed(f.type) && <div>{f.gainDb.toFixed(1)} dB</div>}
        {isCrossoverUsed(f.type) && (
          <div>{labelOfCrossover(f.crossoverFamily, f.slope)}</div>
        )}
      </div>
    );
  }

  if (!status || !channel || !selectedFilter) {
    return <div className="text-sm text-smx-muted">Carregando filtros...</div>;
  }

  const selectedCrossoverValue = `${selectedFilter.crossoverFamily ?? "butterworth"}:${selectedFilter.slope ?? 12}`;

  return (
    <div className="max-w-6xl space-y-6">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">Filters</div>
            <div className="text-xs text-smx-muted">
              CH {ch} • DSP filters and crossovers
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Placeholder do gráfico */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-4">
            <div className="h-52 rounded-xl border border-smx-line bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]">
              <div className="h-full w-full flex items-center justify-center text-sm text-smx-muted">
                Frequency response chart (Etapa 3)
              </div>
            </div>
          </div>

          {/* Navegação dos filtros */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-3">
            <div className="flex gap-2 overflow-x-auto">
              {filters.map((f) => {
                const active = f.id === selectedId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`w-[102px] rounded-xl border px-3 py-2 text-left transition ${active
                      ? "bg-smx-red/15 border-smx-red/40"
                      : "bg-smx-panel2 border-smx-line hover:border-smx-red/30"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{f.id}</div>
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${f.enabled ? "bg-smx-red" : "bg-smx-line"
                          }`}
                      />
                    </div>
                    {renderSummary(f)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor do filtro */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-5 space-y-5">
            {/* Header do filtro */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-smx-muted mb-2">BAND {selectedFilter.id}</div>

                  {/* switch */}
                  <button
                    onClick={() => updateFilter(selectedFilter.id, { enabled: !selectedFilter.enabled })}
                    className={`relative w-12 h-6 rounded-full border transition ${selectedFilter.enabled
                        ? "bg-smx-red/30 border-smx-red/50"
                        : "bg-smx-panel2 border-smx-line"
                      }`}
                    aria-label="On/Off"
                    title="On/Off"
                  >
                    <span
                      className={`absolute top-[0.07rem] left-[0.05rem] w-5 h-5 rounded-full transition-transform ${selectedFilter.enabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"
                        }`}
                    />
                  </button>
                </div>

                {/* ✅ tudo abaixo fica cinza e desabilitado quando OFF */}
                <div className={disabledWrap}>
                  <div className="flex flex-col md:flex-row md:flex-wrap gap-3 w-full md:w-auto md:items-end">
                    <div className="w-full md:w-[300px]">
                      <Select
                        label="Filter Type"
                        value={selectedFilter.type}
                        options={FILTER_TYPE_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                          icon: (
                            <FilterIcon
                              type={o.value}
                              className="w-4 h-4 text-smx-muted shrink-0"
                            />
                          )
                        }))}
                        onChange={(type) => {
                          const patch: Partial<ChannelFilter> = { type };

                          if (isCrossoverUsed(type)) {
                            patch.crossoverFamily =
                              selectedFilter.crossoverFamily ?? "butterworth";
                            patch.slope = selectedFilter.slope ?? 12;
                          }

                          updateLocal(selectedFilter.id, patch);
                          updateFilter(selectedFilter.id, patch);
                        }}
                      />
                    </div>

                    {isCrossoverUsed(selectedFilter.type) && (
                      <div className="w-full md:w-[300px]">
                        <Select
                          label="Crossover"
                          value={selectedCrossoverValue}
                          options={CROSSOVER_OPTIONS.map((o) => ({
                            value: `${o.family}:${o.slope}`,
                            label: o.label
                          }))}
                          onChange={(value) => {
                            const [family, slopeStr] = value.split(":");

                            const slope = Number(slopeStr) as ChannelFilter["slope"];
                            const crossoverFamily = family as CrossoverFamily;

                            updateLocal(selectedFilter.id, { crossoverFamily, slope });
                            updateFilter(selectedFilter.id, { crossoverFamily, slope });
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Gain */}
                  <ParamRow
                    label="Gain"
                    unit="dB"
                    min={-18}
                    max={18}
                    step={0.1}
                    value={selectedFilter.gainDb}
                    disabled={!isGainUsed(selectedFilter.type)}
                    onChange={(v) => {
                      const next = clamp(v, -18, 18);
                      updateLocal(selectedFilter.id, { gainDb: next });
                    }}
                    onCommit={(v) =>
                      updateFilter(selectedFilter.id, { gainDb: clamp(v, -18, 18) })
                    }
                  />

                  {/* Frequency */}
                  <ParamRow
                    label="Frequency"
                    unit="Hz"
                    min={20}
                    max={20000}
                    step={1}
                    value={selectedFilter.freqHz}
                    onChange={(v) => {
                      const next = clamp(v, 20, 20000);
                      updateLocal(selectedFilter.id, { freqHz: next });
                    }}
                    onCommit={(v) =>
                      updateFilter(selectedFilter.id, { freqHz: clamp(v, 20, 20000) })
                    }
                  />

                  {/* Q */}
                  <ParamRow
                    label="Q"
                    unit=""
                    min={0.1}
                    max={20}
                    step={0.1}
                    value={selectedFilter.q}
                    disabled={!isQUsed(selectedFilter.type)}
                    onChange={(v) => {
                      const next = clamp(v, 0.1, 20);
                      updateLocal(selectedFilter.id, { q: next });
                    }}
                    onCommit={(v) =>
                      updateFilter(selectedFilter.id, { q: clamp(v, 0.1, 20) })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function labelOfType(type: FilterType) {
  return FILTER_TYPE_OPTIONS.find((x) => x.value === type)?.label ?? type;
}

function labelOfCrossover(
  family?: CrossoverFamily,
  slope?: ChannelFilter["slope"]
) {
  if (!family || !slope) return "—";

  const familyLabel =
    family === "butterworth"
      ? "Butterworth"
      : family === "linkwitz_riley"
        ? "Linkwitz-Riley"
        : "Bessel";

  return `${familyLabel} ${slope} dB/Oct`;
}

function ParamRow({
  label,
  unit,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
  onCommit
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const draggingRef = useState({ current: false })[0];

  useEffect(() => {
    if (!draggingRef.current) setDraft(value);
  }, [value, draggingRef]);

  function nudge(delta: number) {
    const next = clamp(draft + delta, min, max);
    setDraft(next);
    onChange(next);
    onCommit(next);
  }

  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-2 text-xs text-smx-muted">
        <span>
          {label} {unit && <span>[{unit}]</span>}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => nudge(-step)}
            className="w-7 h-7 rounded-lg border border-smx-line bg-smx-panel2 hover:border-smx-red/30 transition"
            type="button"
          >
            ▼
          </button>

          <span className="text-smx-text font-semibold min-w-[80px] text-center">
            {label === "Frequency" ? Math.round(draft) : draft.toFixed(1)} {unit}
          </span>

          <button
            onClick={() => nudge(+step)}
            className="w-7 h-7 rounded-lg border border-smx-line bg-smx-panel2 hover:border-smx-red/30 transition"
            type="button"
          >
            ▲
          </button>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onChange={(e) => {
          const next = Number(e.target.value);
          setDraft(next);
          onChange(next);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
          onCommit(draft);
        }}
        className="w-full smx-range smx-range-fill smx-range-red"
        style={{
          ["--fill" as any]: `${((draft - min) / (max - min)) * 100}%`
        }}
      />
    </div>
  );
}