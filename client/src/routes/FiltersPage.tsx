import React, { useEffect, useMemo, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import FilterIcon from "../ui/FilterIcon";
import Select from "../ui/Select";
import { FilterType } from "../types/filters";
import FrequencyResponseChart from "../ui/FrequencyResponseChart";
import { API_BASE, WS_BASE } from "../config/endpoints";

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

const FILTER_TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "hpf", label: "High Pass" },
  { value: "lpf", label: "Low Pass" },
  { value: "parametric", label: "Parametric" },
  { value: "low_shelf", label: "Low Shelf" },
  { value: "high_shelf", label: "High Shelf" },
  { value: "tilt_shelf", label: "Tilt Shelf" },
  { value: "all_pass", label: "All Pass" },
  { value: "band_pass", label: "Band Pass" },
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
  return ["parametric", "low_shelf", "high_shelf", "tilt_shelf"].includes(type);
}

function isQUsed(type: FilterType) {
  return ["parametric", "low_shelf", "high_shelf", "tilt_shelf", "all_pass", "band_pass", "notch"].includes(type);
}

function isCrossoverUsed(type: FilterType) {
  return type === "hpf" || type === "lpf";
}

function freqToSlider(freq: number) {
  const min = Math.log10(20);
  const max = Math.log10(20000);
  return (Math.log10(freq) - min) / (max - min);
}

function sliderToFreq(v: number) {
  const min = Math.log10(20);
  const max = Math.log10(20000);
  return Math.pow(10, min + v * (max - min));
}

export default function EqPage() {
  const { status, setStatus, deviceId, ch } = useDevice();
  const channel = status?.channels?.find((c) => c.ch === ch);

  const [filters, setFilters] = useState<ChannelFilter[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!deviceId || !ch) return;

    fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/filters`)
      .then((r) => r.json())
      .then((j) => {
        let arr = (j.filters ?? []) as ChannelFilter[];

        arr = arr.map((f, idx) => {
          if (idx === 0) {
            return {
              ...f,
              type: "hpf" as FilterType,
              crossoverFamily: f.crossoverFamily ?? "butterworth",
              slope: f.slope ?? 12
            };
          }

          if (idx === arr.length - 1) {
            return {
              ...f,
              type: "lpf" as FilterType,
              crossoverFamily: f.crossoverFamily ?? "butterworth",
              slope: f.slope ?? 12
            };
          }

          return f;
        });

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

  const dragCommitRef = useState<{ id: number | null; patch: Partial<ChannelFilter> }>({
    id: null,
    patch: {}
  })[0];

  async function updateFilter(filterId: number, patch: Partial<ChannelFilter>) {
    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/filters/${filterId}`, {
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
    const isFirst = f.id === filters[0]?.id;
    const isLast = f.id === filters[filters.length - 1]?.id;

    const displayType = isFirst ? "hpf" : isLast ? "lpf" : f.type;

    return (
      <div className="text-[11px] text-smx-muted leading-tight mt-1 space-y-[2px]">
        <div className="truncate">{labelOfType(displayType)}</div>
        <div>{Math.round(f.freqHz)} Hz</div>
        {isQUsed(displayType) && <div>{f.q.toFixed(1)} Q</div>}
        {isGainUsed(displayType) && <div>{f.gainDb.toFixed(1)} dB</div>}
        {isCrossoverUsed(displayType) && (
          <div className="truncate">{labelOfCrossover(f.crossoverFamily, f.slope)}</div>
        )}
      </div>
    );
  }

  if (!status || !channel || !selectedFilter) {
    return <div className="text-sm text-smx-muted">Carregando filtros...</div>;
  }

  const selectedCrossoverValue = `${selectedFilter.crossoverFamily ?? "butterworth"}:${selectedFilter.slope ?? 12}`;

  const firstFilterId = filters[0]?.id;
  const lastFilterId = filters[filters.length - 1]?.id;

  const isFirstBand = selectedFilter.id === firstFilterId;
  const isLastBand = selectedFilter.id === lastFilterId;
  const isFixedCrossoverBand = isFirstBand || isLastBand;

  return (
    <div className="w-full max-w-none space-y-6">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">Filters</div>
            <div className="text-sm md:text-xs text-smx-muted">
              CH {ch} • DSP filters and crossovers
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5" >
          <div style={{ userSelect: "none", WebkitUserSelect: "none" }}
            onPointerUp={() => {
              if (dragCommitRef.id != null) {
                updateFilter(dragCommitRef.id, dragCommitRef.patch);
                dragCommitRef.id = null;
                dragCommitRef.patch = {};
              }
            }}
          >
            <FrequencyResponseChart
              filters={filters}
              selectedId={selectedId}
              onSelectFilter={(id) => setSelectedId(id)}
              onDragFilter={(id, patch) => {
                dragCommitRef.id = id;
                dragCommitRef.patch = { ...dragCommitRef.patch, ...patch };
                updateLocal(id, patch);
              }}
            />
          </div>

          {/* Navegação dos filtros */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map((f) => {
                const active = f.id === selectedId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`flex-none aspect-square w-[90px] min-w-[90px] rounded-xl border p-2 text-left transition flex flex-col`}
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
                  <div className="text-sm md:text-xs text-smx-muted mb-2">BAND {selectedFilter.id}</div>

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
                  <div className="flex flex-col py-4 md:flex-row md:flex-wrap gap-3 w-full md:w-auto md:items-end">

                    {!isFixedCrossoverBand && (
                      <div className="w-full md:w-[300px]">
                        <Select
                          label="Filter Type"
                          value={selectedFilter.type}
                          options={FILTER_TYPE_OPTIONS.map(o => ({
                            value: o.value,
                            label: o.label,
                            icon: <FilterIcon type={o.value} className="w-4 h-4 text-smx-muted shrink-0" />
                          }))}
                          onChange={(type) => {
                            const patch: Partial<ChannelFilter> = { type };

                            if (isCrossoverUsed(type)) {
                              patch.crossoverFamily = selectedFilter.crossoverFamily ?? "butterworth";
                              patch.slope = selectedFilter.slope ?? 12;
                            }

                            updateLocal(selectedFilter.id, patch);
                            updateFilter(selectedFilter.id, patch);
                          }}
                        />
                      </div>
                    )}

                    {(isCrossoverUsed(selectedFilter.type) || isFixedCrossoverBand) && (
                      <div className="w-full md:w-[300px]">
                        <Select
                          label={
                            isFirstBand
                              ? "High Pass Filter"
                              : isLastBand
                                ? "Low Pass Filter"
                                : "Crossover"
                          }
                          value={selectedCrossoverValue}
                          options={CROSSOVER_OPTIONS.map(o => ({
                            value: `${o.family}:${o.slope}`,
                            label: o.label
                          }))}
                          onChange={(value) => {
                            const [family, slopeStr] = value.split(":");

                            const slope = Number(slopeStr) as ChannelFilter["slope"];
                            const crossoverFamily = family as CrossoverFamily;

                            updateLocal(selectedFilter.id, { crossoverFamily, slope });

                            updateFilter(selectedFilter.id, {
                              crossoverFamily,
                              slope,
                              ...(isFirstBand ? { type: "hpf" as FilterType } : {}),
                              ...(isLastBand ? { type: "lpf" as FilterType } : {})
                            });
                          }}
                        />
                      </div>
                    )}

                  </div>
                  {/* Gain */}
                  <ParamRow
                    label="Gain"
                    unit="dB"
                    min={-24}
                    max={24}
                    step={0.1}
                    value={selectedFilter.gainDb}
                    disabled={!isGainUsed(selectedFilter.type)}
                    onChange={(v) => {
                      const next = clamp(v, -18, 18);
                      updateLocal(selectedFilter.id, { gainDb: next });
                    }}
                    onCommit={(v) =>
                      updateFilter(selectedFilter.id, { gainDb: clamp(v,-24, 24) })
                    }
                  />

                  {/* Frequency */}
                  <ParamRow
                    label="Frequency"
                    unit="Hz"
                    min={0}
                    max={1}
                    step={0.001}
                    value={freqToSlider(selectedFilter.freqHz)}
                    onChange={(v) => {
                      const freq = sliderToFreq(v);
                      updateLocal(selectedFilter.id, { freqHz: clamp(freq, 20, 20000) });
                    }}
                    onCommit={(v) => {
                      const freq = sliderToFreq(v);
                      updateFilter(selectedFilter.id, { freqHz: clamp(freq, 20, 20000) });
                    }}
                    displayValue={selectedFilter.freqHz}
                  />

                  {/* Q */}
                  <ParamRow
                    label="Q"
                    unit=""
                    min={0.1}
                    max={10}
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
      ? "BT"
      : family === "linkwitz_riley"
        ? "LR"
        : "BS";

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
  displayValue,
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
  displayValue?: number;
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

  const arrowBtn =
    "w-10 h-10 rounded-2xl border bg-smx-panel2 border-smx-line hover:border-smx-red/40 " +
    "transition active:scale-95 grid place-items-center text-white";

  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-2 text-sm md:text-xs text-smx-muted">
        <span>
          {label} {unit && <span>[{unit}]</span>}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => nudge(-step)}
            className={arrowBtn}
            type="button"
          >
            ▼
          </button>

          <span className="text-smx-text font-semibold min-w-[50px] text-center">
            {displayValue !== undefined ? Math.round(displayValue) : draft.toFixed(1)}
          </span>

          <button
            onClick={() => nudge(+step)}
            className={arrowBtn}
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