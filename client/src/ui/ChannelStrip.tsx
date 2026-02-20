import React from "react";
import DbScale, { pctFromDb } from "../ui/DbScale";

const VU_MIN = -48;
const VU_MAX = 3;
const VU_MARKS = [-48, -24, -12, -6, 0, 3];

const GAIN_MIN = -48;
const GAIN_MAX = 0;
const GAIN_MARKS = [-48, -24, -12, -6, -3, 0];

export default function ChannelStrip(props: {
    ch: number;
    name: string;
    routeFrom: string;

    mute: boolean;
    gainDb: number;
    polarity: 1 | -1;

    rmsDb: number;
    peakDb: number;
    peakHoldDb: number;

    limit: boolean;
    protect: boolean;

    onMute: () => void;
    onPolarity: () => void;
    onGain: (v: number) => void;

    // opcional: ajustar escalas quando usado no header vs dashboard
    scaleInsetPx?: number;
    scaleOffsetPx?: number;
}) {
    const insetPx = props.scaleInsetPx ?? 24;
    const offsetPx = props.scaleOffsetPx ?? -6;

    const vuPct = pctFromDb(props.rmsDb, VU_MIN, VU_MAX);
    const peakPct = pctFromDb(props.peakDb, VU_MIN, VU_MAX);
    const holdPct = pctFromDb(props.peakHoldDb, VU_MIN, VU_MAX);

    return (
        <div className="px-5 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
                {/* HEADER DO CANAL */}
                <div className="flex flex-wrap items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-3">
                        <div className="leading-tight">
                            <div className="font-semibold">{props.name}</div>
                            <div className="text-xs text-smx-muted">
                                Signal: <span className="text-smx-text">{props.routeFrom}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Polaridade */}
                        <button
                            onClick={props.onPolarity}
                            className={`w-10 h-10 rounded-2xl border flex items-center justify-center 
                transition-all duration-200 active:scale-95 font-semibold
                ${props.polarity === -1
                                    ? "bg-white border-white text-smx-panel shadow-sm"
                                    : "bg-smx-panel2 border-smx-line text-white hover:border-white/30"
                                }`}
                            title="Polaridade"
                        >
                            Ø
                        </button>

                        {/* Mute */}
                        <button
                            onClick={props.onMute}
                            className={`w-10 h-10 rounded-2xl border flex items-center justify-center 
                transition-all duration-200 active:scale-95 font-semibold
                ${props.mute
                                    ? "bg-smx-red/25 border-smx-red text-smx-red shadow-md"
                                    : "bg-smx-panel2 border-smx-line text-white hover:border-smx-red/40"
                                }`}
                            title="Mute"
                        >
                            M
                        </button>
                    </div>
                </div>

                {/* VU + GAIN */}
                <div className="space-y-4 min-w-0">
                    {/* VU */}
                    <div>
                        <div className="flex items-end justify-between text-xs text-smx-muted mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-smx-muted">RMS</span>
                                <span className="text-smx-text">{props.rmsDb.toFixed(1)} dB</span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    <FlagDot on={props.protect} color="red" />
                                    <FlagDot on={props.limit} color="white" />
                                </div>
                                <div className="text-smx-muted flex items-center gap-2">
                                    <span>
                                        Peak <span className="text-smx-text">{props.peakDb.toFixed(1)} dB</span>
                                    </span>
                                    <span className="opacity-40">•</span>
                                    <span>
                                        Hold <span className="text-smx-text">{props.peakHoldDb.toFixed(1)} dB</span>
                                    </span>
                                </div>

                            </div>
                        </div>

                        <div className="relative h-4 rounded-full bg-smx-panel2 border border-smx-line overflow-hidden">
                            <div
                                className="h-full transition-[width] duration-75"
                                style={{
                                    width: `${vuPct}%`,
                                    background:
                                        "linear-gradient(90deg, #00ff00 0%, #00ff00 70%, #ffd400 85%, #ff0000 100%)"
                                }}
                            />

                            {/* overlay de polaridade invertida */}
                            {props.polarity === -1 && (
                                <>
                                    <div className="absolute inset-0 bg-white/10" />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/90">
                                        Ø
                                    </div>
                                </>
                            )}

                            <div
                                className="absolute top-0 h-full w-[2px] bg-white/70"
                                style={{ left: `calc(${peakPct}% - 1px)` }}
                                title="Peak"
                            />
                            <div
                                className="absolute top-0 h-full w-[2px] bg-white"
                                style={{ left: `calc(${holdPct}% - 1px)` }}
                                title="Peak Hold"
                            />
                        </div>

                        <DbScale marks={VU_MARKS} minDb={VU_MIN} maxDb={VU_MAX} insetPx={insetPx} offsetPx={offsetPx} />
                    </div>

                    {/* GAIN */}
                    <div className="bg-black/10 border border-smx-line rounded-2xl px-4 py-2.5">
                        <div className="flex items-center justify-between text-xs text-smx-muted mb-1">
                            <span>Gain</span>
                            <span className="text-smx-text font-semibold">{props.gainDb.toFixed(1)} dB</span>
                        </div>

                        <input
                            type="range"
                            min={GAIN_MIN}
                            max={GAIN_MAX}
                            step={0.5}
                            value={props.gainDb}
                            onChange={(e) => props.onGain(Number(e.target.value))}
                            className="w-full smx-range smx-range-fill smx-range-red"
                            style={{
                                ["--fill" as any]: `${pctFromDb(props.gainDb, GAIN_MIN, GAIN_MAX)}%`
                            }}
                        />

                        <DbScale marks={GAIN_MARKS} minDb={GAIN_MIN} maxDb={GAIN_MAX} insetPx={insetPx} offsetPx={offsetPx} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function FlagDot({ on, color }: { on: boolean; color: "red" | "white" }) {
    const cls =
        color === "red"
            ? on
                ? "bg-smx-red"
                : "bg-smx-line"
            : on
                ? "bg-white"
                : "bg-smx-line";
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}
