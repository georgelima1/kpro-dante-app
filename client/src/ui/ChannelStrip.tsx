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

  scaleInsetPx?: number;
  scaleOffsetPx?: number;

  // ✅ novas
  density?: "normal" | "compact";
  showTopButtons?: boolean; // Ø + M
  showSignal?: boolean;     // Signal: ...
}) {
  const insetPx = props.scaleInsetPx ?? 24;
  const offsetPx = props.scaleOffsetPx ?? -6;

  const vuPct = pctFromDb(props.rmsDb, VU_MIN, VU_MAX);
  const peakPct = pctFromDb(props.peakDb, VU_MIN, VU_MAX);
  const holdPct = pctFromDb(props.peakHoldDb, VU_MIN, VU_MAX);

  const density = props.density ?? "normal";
  const showTopButtons = props.showTopButtons ?? true;
  const showSignal = props.showSignal ?? true;

  const hasLeft = showTopButtons || showSignal || props.name;

  const wrapPad = density === "compact" ? "px-3 py-3" : "px-5 py-4";
  const gridLeft = density === "compact" ? "lg:grid-cols-[220px_1fr]" : "lg:grid-cols-[320px_1fr]";
  const gap = density === "compact" ? "gap-3" : "gap-4";
  const stackGap = density === "compact" ? "space-y-3" : "space-y-4";
  const vuBarH = density === "compact" ? "h-3.5" : "h-4";
  const gainPad = density === "compact" ? "px-3 py-2" : "px-4 py-2.5";

  function stepGain(delta: number) {
    const next = Math.max(GAIN_MIN, Math.min(GAIN_MAX, props.gainDb + delta));
    props.onGain(Number(next.toFixed(1)));
  }

  return (
    <div className={wrapPad}>
      <div
        className={`grid ${hasLeft ? gridLeft : "grid-cols-1"
          } ${gap} items-start`}
      >
        {/* Right: VU + Gain */}
        <div className={`${stackGap} min-w-0 col-span-full`}>
          {/* VU */}
          <div>
            <div className="flex items-end justify-between text-xs text-smx-muted mb-2">
              <div className="flex items-center gap-2">
                <span className="text-smx-muted">RMS</span>
                <span className="text-smx-text">{props.rmsDb.toFixed(1)} dB</span>
              </div>

              <div className="flex flex-col items-end gap-1">
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

            <div className={`relative ${vuBarH} rounded-full bg-smx-panel2 border border-smx-line overflow-hidden`}>
              <div
                className="h-full transition-[width] duration-75"
                style={{
                  width: `${vuPct}%`,
                  background:
                    "linear-gradient(90deg, #00ff00 0%, #00ff00 70%, #ffd400 85%, #ff0000 100%)"
                }}
              />

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

          {/* Gain */}
          <div className={`bg-black/10 border border-smx-line rounded-2xl ${gainPad}`}>
            <div className="flex items-center justify-between text-xs text-smx-muted mb-1">
              <span>Gain</span>

              <div className="flex items-center gap-2">

                {/* ▼ */}
                <button
                  onClick={() => stepGain(-0.1)}
                  className="w-6 h-6 rounded-lg border border-smx-line bg-smx-panel2
                   flex items-center justify-center text-smx-text
                   hover:border-smx-red/40 active:scale-95 transition"
                  title="Decrease 0.1 dB"
                  type="button"
                >
                  ▼
                </button>

                {/* Valor */}
                <span className="text-smx-text font-semibold min-w-[56px] text-center">
                  {props.gainDb.toFixed(1)} dB
                </span>
                
                {/* ▲ */}
                <button
                  onClick={() => stepGain(+0.1)}
                  className="w-6 h-6 rounded-lg border border-smx-line bg-smx-panel2
                   flex items-center justify-center text-smx-text
                   hover:border-smx-red/40 active:scale-95 transition"
                  title="Increase 0.1 dB"
                  type="button"
                >
                  ▲
                </button>

              </div>
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
