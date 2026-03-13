import React, { useMemo, useState } from "react";
import type { CrossoverFamily, InputFilter } from "../routes/InputPage";
import FrequencyResponseChart from "./FrequencyResponseChart";
import FilterIcon from "./FilterIcon";
import Select from "./Select";

const FILTER_TYPE_OPTIONS = [
  { value: "hpf", label: "High Pass" },
  { value: "lpf", label: "Low Pass" },
  { value: "parametric", label: "Parametric" },
  { value: "low_shelf", label: "Low Shelf" },
  { value: "high_shelf", label: "High Shelf" },
  { value: "tilt_shelf", label: "Tilt Shelf" },
  { value: "all_pass", label: "All Pass" },
  { value: "band_pass", label: "Band Pass" },
  { value: "notch", label: "Notch" }
] as const;

const CROSSOVER_OPTIONS = [
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
] as const;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isGainUsed(type: string) {
  return ["parametric", "low_shelf", "high_shelf", "tilt_shelf"].includes(type);
}

function isQUsed(type: string) {
  return ["parametric", "low_shelf", "high_shelf", "tilt_shelf", "all_pass", "band_pass", "notch"].includes(type);
}

function isCrossoverUsed(type: string) {
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

export default function InputFiltersEditor({
  filters,
  onFilterChange
}: {
  filters: InputFilter[];
  onFilterChange: (filterId: number, patch: Partial<InputFilter>) => void;
}) {
  const [selectedId, setSelectedId] = useState<number>(filters[0]?.id ?? 1);

  const selectedFilter = useMemo(
    () => filters.find((f) => f.id === selectedId) ?? null,
    [filters, selectedId]
  );

  const firstFilterId = filters[0]?.id;
  const lastFilterId = filters[filters.length - 1]?.id;
  const isFirstBand = selectedFilter?.id === firstFilterId;
  const isLastBand = selectedFilter?.id === lastFilterId;
  const isFixedCrossoverBand = !!(isFirstBand || isLastBand);

  const selectedCrossoverValue = `${selectedFilter?.crossoverFamily ?? "butterworth"}:${selectedFilter?.slope ?? 12}`;

  if (!selectedFilter) return null;

  return (
    <div className="space-y-5">
      <div className="w-full h-[240px] sm:h-[280px] md:h-[320px] border border-smx-line rounded-2xl bg-black/10 overflow-hidden">
        <FrequencyResponseChart
          filters={filters as any}
          selectedId={selectedId}
          onSelectFilter={(id) => setSelectedId(id)}
          onDragFilter={(id, patch) => onFilterChange(id, patch)}
          onQAdjust={(id, nextQ) => onFilterChange(id, { q: nextQ })}
        />
      </div>

      <div className="bg-black/10 border border-smx-line rounded-2xl p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => {
            const active = f.id === selectedId;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`flex-none aspect-square w-[90px] min-w-[90px] rounded-xl border p-2 text-left transition flex flex-col ${
                  active
                    ? "bg-smx-red/15 border-smx-red/40"
                    : "bg-smx-panel2 border-smx-line hover:border-smx-red/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{f.id}</div>
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      f.enabled ? "bg-smx-red" : "bg-smx-line"
                    }`}
                  />
                </div>
                <div className="text-[11px] text-smx-muted leading-tight mt-1 space-y-[2px]">
                  <div className="truncate">{f.type}</div>
                  <div>{Math.round(f.freqHz)} Hz</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-black/10 border border-smx-line rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="text-sm md:text-xs text-smx-muted">BAND {selectedFilter.id}</div>

          <button
            onClick={() =>
              onFilterChange(selectedFilter.id, { enabled: !selectedFilter.enabled })
            }
            className={`relative w-12 h-6 rounded-full border transition ${
              selectedFilter.enabled
                ? "bg-smx-red/30 border-smx-red/50"
                : "bg-smx-panel2 border-smx-line"
            }`}
            type="button"
          >
            <span
              className={`absolute top-[0.07rem] left-[0.05rem] w-5 h-5 rounded-full transition-transform ${
                selectedFilter.enabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"
              }`}
            />
          </button>
        </div>

        <div className={!selectedFilter.enabled ? "opacity-45 grayscale pointer-events-none" : ""}>
          <div className="flex flex-col py-2 md:flex-row md:flex-wrap gap-3 w-full md:w-auto md:items-end">
            {!isFixedCrossoverBand && (
              <div className="w-full md:w-[300px]">
                <Select
                  label="Filter Type"
                  value={selectedFilter.type}
                  options={FILTER_TYPE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                    icon: <FilterIcon type={o.value as any} className="w-4 h-4 text-smx-muted shrink-0" />
                  }))}
                  onChange={(type) => onFilterChange(selectedFilter.id, { type: type as any })}
                />
              </div>
            )}

            {(isCrossoverUsed(selectedFilter.type) || isFixedCrossoverBand) && (
              <div className="w-full md:w-[300px]">
                <Select
                  label={isFirstBand ? "High Pass Filter" : isLastBand ? "Low Pass Filter" : "Crossover"}
                  value={selectedCrossoverValue}
                  options={CROSSOVER_OPTIONS.map((o) => ({
                    value: `${o.family}:${o.slope}`,
                    label: o.label
                  }))}
                  onChange={(value) => {
                    const [family, slopeStr] = value.split(":");
                    onFilterChange(selectedFilter.id, {
                      crossoverFamily: family as CrossoverFamily,
                      slope: Number(slopeStr) as any
                    });
                  }}
                />
              </div>
            )}
          </div>

          <SimpleParamRow
            label="Gain"
            unit="dB"
            min={-24}
            max={24}
            step={0.1}
            value={selectedFilter.gainDb}
            disabled={!isGainUsed(selectedFilter.type)}
            onChange={(v) => onFilterChange(selectedFilter.id, { gainDb: clamp(v, -24, 24) })}
          />

          <SimpleParamRow
            label="Frequency"
            unit="Hz"
            min={0}
            max={1}
            step={0.001}
            value={freqToSlider(selectedFilter.freqHz)}
            displayValue={selectedFilter.freqHz}
            onChange={(v) =>
              onFilterChange(selectedFilter.id, { freqHz: clamp(sliderToFreq(v), 20, 20000) })
            }
          />

          <SimpleParamRow
            label="Q"
            unit=""
            min={0.1}
            max={10}
            step={0.1}
            value={selectedFilter.q}
            disabled={!isQUsed(selectedFilter.type)}
            onChange={(v) => onFilterChange(selectedFilter.id, { q: clamp(v, 0.1, 10) })}
          />
        </div>
      </div>
    </div>
  );
}

function SimpleParamRow({
  label,
  unit,
  min,
  max,
  step,
  value,
  disabled,
  displayValue,
  onChange
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
}) {
  const shown = displayValue ?? value;

  return (
    <div className={disabled ? "opacity-40 pointer-events-none mt-4" : "mt-4"}>
      <div className="flex items-center justify-between mb-2 text-sm md:text-xs text-smx-muted">
        <span>
          {label} {unit && <span>[{unit}]</span>}
        </span>
        <span className="text-smx-text font-semibold">
          {label === "Frequency" ? Math.round(shown) : shown.toFixed(1)} {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full smx-range smx-range-fill smx-range-red"
        style={{
          ["--fill" as any]: `${((value - min) / (max - min)) * 100}%`
        }}
      />
    </div>
  );
}