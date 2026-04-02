import React, { useEffect, useMemo, useState, useRef } from "react";
import FilterIcon from "./FilterIcon";
import Select from "./Select";
import FrequencyResponseChart from "./FrequencyResponseChart";
import type { FilterType, CrossoverFamily, FilterItem, FiltersEditorProps } from "@/types/filters";

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
    slope: FilterItem["slope"];
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

export default function InputFiltersEditor({
    title,
    subtitle,
    filters,
    selectedId,
    onSelectedIdChange,
    onLocalChange,
    onCommitChange,
    showHeader = true,
    embedded,
    chartHeightClassName = "h-[260px] md:h-[320px] lg:h-[380px]",
    chartClassName = ""
}: FiltersEditorProps) {
    const selectedFilter = useMemo(
        () => filters.find((f) => f.id === selectedId) ?? null,
        [filters, selectedId]
    );

    const dragCommitRef = useRef<{ id: number | null; patch: Partial<FilterItem> }>({
        id: null,
        patch: {}
    });

    if (!selectedFilter) {
        return <div className="text-sm text-smx-muted">Carregando filters...</div>;
    }

    const disabledWrap =
        !selectedFilter.enabled
            ? "opacity-45 grayscale pointer-events-none select-none"
            : "opacity-100";

    const firstFilterId = filters[0]?.id;
    const lastFilterId = filters[filters.length - 1]?.id;

    const isFirstBand = selectedFilter.id === firstFilterId;
    const isLastBand = selectedFilter.id === lastFilterId;
    const isFixedCrossoverBand = isFirstBand || isLastBand;

    const selectedCrossoverValue = `${selectedFilter.crossoverFamily ?? "butterworth"}:${selectedFilter.slope ?? 12}`;

    return (
        <div className="w-full max-w-none space-y-6">
            <section
                className={
                    embedded
                        ? "bg-transparent border-0 rounded-none overflow-hidden"
                        : "bg-smx-panel border border-smx-line rounded-2xl overflow-hidden"
                }
            >
                {showHeader && (
                    <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {title && <div className="text-base font-semibold">{title}</div>}
                            {subtitle && <div className="text-sm md:text-xs text-smx-muted">{subtitle}</div>}
                        </div>
                    </div>
                )}

                <div
                    className={`w-full ${chartHeightClassName} border-b border-smx-line bg-black/10 overflow-hidden ${chartClassName}`}
                    style={{ userSelect: "none", WebkitUserSelect: "none" }}
                    onPointerUp={() => {
                        if (dragCommitRef.current.id != null) {
                            onCommitChange(dragCommitRef.current.id, dragCommitRef.current.patch);
                            dragCommitRef.current = { id: null, patch: {} };
                        }
                    }}
                >
                    <div className="w-full h-full px-0 md:px-2">
                        <FrequencyResponseChart
                            filters={filters}
                            selectedId={selectedId}
                            onSelectFilter={(id) => onSelectedIdChange(id)}
                            onDragFilter={(id, patch) => {
                                dragCommitRef.current = {
                                    id,
                                    patch: { ...dragCommitRef.current.patch, ...patch }
                                };
                                onLocalChange(id, patch);
                            }}
                            onQAdjust={(id, nextQ) => {
                                dragCommitRef.current = {
                                    id,
                                    patch: { ...dragCommitRef.current.patch, q: nextQ }
                                };
                                onLocalChange(id, { q: nextQ });
                            }}
                        />
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    <div className="bg-black/10 border border-smx-line rounded-2xl p-3">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {filters.map((f) => {
                                const active = f.id === selectedId;
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => onSelectedIdChange(f.id)}
                                        className={`flex-none aspect-square w-[90px] min-w-[90px] rounded-xl border p-2 text-left transition flex flex-col ${active
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
                                        {renderSummary(f, filters)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-black/10 border border-smx-line rounded-2xl p-5 space-y-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 w-full">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm md:text-xs text-smx-muted mb-2">
                                        BAND {selectedFilter.id}
                                    </div>

                                    <button
                                        onClick={() =>
                                            onCommitChange(selectedFilter.id, { enabled: !selectedFilter.enabled })
                                        }
                                        className={`relative w-12 h-6 rounded-full border transition ${selectedFilter.enabled
                                            ? "bg-smx-red/30 border-smx-red/50"
                                            : "bg-smx-panel2 border-smx-line"
                                            }`}
                                        aria-label="On/Off"
                                        title="On/Off"
                                    >
                                        <span
                                            className={`absolute top-[0.07rem] left-[0.05rem] w-5 h-5 rounded-full transition-transform ${selectedFilter.enabled
                                                ? "translate-x-6 bg-white"
                                                : "translate-x-0 bg-white/80"
                                                }`}
                                        />
                                    </button>
                                </div>

                                <div className={disabledWrap}>
                                    <div className="flex flex-col py-4 md:flex-row md:flex-wrap gap-3 w-full md:w-auto md:items-end">
                                        {!isFixedCrossoverBand && (
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
                                                        const patch: Partial<FilterItem> = { type };

                                                        if (isCrossoverUsed(type)) {
                                                            patch.crossoverFamily =
                                                                selectedFilter.crossoverFamily ?? "butterworth";
                                                            patch.slope = selectedFilter.slope ?? 12;
                                                        }

                                                        onLocalChange(selectedFilter.id, patch);
                                                        onCommitChange(selectedFilter.id, patch);
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
                                                    options={CROSSOVER_OPTIONS.map((o) => ({
                                                        value: `${o.family}:${o.slope}`,
                                                        label: o.label
                                                    }))}
                                                    onChange={(value) => {
                                                        const [family, slopeStr] = value.split(":");
                                                        const slope = Number(slopeStr) as FilterItem["slope"];
                                                        const crossoverFamily = family as CrossoverFamily;

                                                        onLocalChange(selectedFilter.id, { crossoverFamily, slope });
                                                        onCommitChange(selectedFilter.id, {
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
                                            onLocalChange(selectedFilter.id, { gainDb: next });
                                        }}
                                        onCommit={(v) =>
                                            onCommitChange(selectedFilter.id, { gainDb: clamp(v, -24, 24) })
                                        }
                                    />

                                    <ParamRow
                                        label="Frequency"
                                        unit="Hz"
                                        min={0}
                                        max={1}
                                        step={0.001}
                                        value={freqToSlider(selectedFilter.freqHz)}
                                        onChange={(v) => {
                                            const freq = sliderToFreq(v);
                                            onLocalChange(selectedFilter.id, {
                                                freqHz: clamp(freq, 20, 20000)
                                            });
                                        }}
                                        onCommit={(v) => {
                                            const freq = sliderToFreq(v);
                                            onCommitChange(selectedFilter.id, {
                                                freqHz: clamp(freq, 20, 20000)
                                            });
                                        }}
                                        displayValue={selectedFilter.freqHz}
                                    />

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
                                            onLocalChange(selectedFilter.id, { q: next });
                                        }}
                                        onCommit={(v) =>
                                            onCommitChange(selectedFilter.id, { q: clamp(v, 0.1, 20) })
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

function renderSummary(f: FilterItem, filters: FilterItem[]) {
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

function labelOfType(type: FilterType) {
    return FILTER_TYPE_OPTIONS.find((x) => x.value === type)?.label ?? type;
}

function labelOfCrossover(
    family?: CrossoverFamily,
    slope?: FilterItem["slope"]
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