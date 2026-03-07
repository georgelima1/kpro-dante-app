import React, { useMemo } from "react";
import { FilterType } from "../types/filters";

type CrossoverFamily = "butterworth" | "linkwitz_riley" | "bessel";

export type ChannelFilter = {
  id: number;
  enabled: boolean;
  type: FilterType;
  freqHz: number;
  q: number;
  gainDb: number;
  slope?: 6 | 12 | 18 | 24 | 30 | 36 | 42 | 48;
  crossoverFamily?: CrossoverFamily;
};

const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const DB_MIN = -24;
const DB_MAX = 24;

const WIDTH = 1000;
const HEIGHT = 320;
const PAD_L = 42;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 26;

const PLOT_W = WIDTH - PAD_L - PAD_R;
const PLOT_H = HEIGHT - PAD_T - PAD_B;

const GRID_FREQS = [
  20, 30, 40, 50, 60, 80,
  100, 200, 300, 400, 500, 600, 800,
  1000, 2000, 3000, 4000, 5000, 6000, 8000,
  10000, 20000
];

const GRID_DBS = [-24, -18, -12, -6, 0, 6, 12, 18, 24];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function logX(freq: number) {
  const a = Math.log10(FREQ_MIN);
  const b = Math.log10(FREQ_MAX);
  const t = (Math.log10(freq) - a) / (b - a);
  return PAD_L + t * PLOT_W;
}

function dbY(db: number) {
  const t = (db - DB_MIN) / (DB_MAX - DB_MIN);
  return PAD_T + (1 - t) * PLOT_H;
}

function fmtFreq(freq: number) {
  if (freq >= 1000) {
    const k = freq / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return `${Math.round(freq)}`;
}

function slopeOrderFromDbPerOct(slope?: number) {
  if (!slope) return 1;
  return Math.max(1, Math.round(slope / 6));
}

function hpfMagDb(freq: number, fc: number, slope?: number, family?: CrossoverFamily) {
  const order = slopeOrderFromDbPerOct(slope);
  const r = freq / Math.max(fc, 1);

  // aproximação visual
  let n = order;

  if (family === "bessel") n *= 0.9;
  if (family === "linkwitz_riley") n *= 1.15;

  const mag = Math.pow(r, n) / Math.sqrt(1 + Math.pow(r, 2 * n));
  return 20 * Math.log10(Math.max(mag, 1e-6));
}

function lpfMagDb(freq: number, fc: number, slope?: number, family?: CrossoverFamily) {
  const order = slopeOrderFromDbPerOct(slope);
  const r = freq / Math.max(fc, 1);

  let n = order;
  if (family === "bessel") n *= 0.9;
  if (family === "linkwitz_riley") n *= 1.15;

  const mag = 1 / Math.sqrt(1 + Math.pow(r, 2 * n));
  return 20 * Math.log10(Math.max(mag, 1e-6));
}

function gaussianShape(freq: number, fc: number, q: number) {
  const x = Math.log2(freq / Math.max(fc, 1));
  const sigma = 1 / Math.max(q, 0.1);
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

function parametricMagDb(freq: number, fc: number, q: number, gainDb: number) {
  return gainDb * gaussianShape(freq, fc, q);
}

function notchMagDb(freq: number, fc: number, q: number) {
  return -18 * gaussianShape(freq, fc, q);
}

function bandPassMagDb(freq: number, fc: number, q: number) {
  const peak = 12 * gaussianShape(freq, fc, q);
  const skirt = hpfMagDb(freq, fc / Math.max(q, 0.2), 12, "butterworth") +
                lpfMagDb(freq, fc * Math.max(q, 0.2), 12, "butterworth");
  return clamp(peak + skirt, DB_MIN, DB_MAX);
}

function shelfTransition(freq: number, fc: number, q: number) {
  const x = Math.log2(freq / Math.max(fc, 1));
  const k = Math.max(1.2, q * 2.2);
  return 1 / (1 + Math.exp(-k * x));
}

function lowShelfMagDb(freq: number, fc: number, q: number, gainDb: number) {
  const t = shelfTransition(freq, fc, q);
  return gainDb * (1 - t);
}

function highShelfMagDb(freq: number, fc: number, q: number, gainDb: number) {
  const t = shelfTransition(freq, fc, q);
  return gainDb * t;
}

function tiltShelfMagDb(freq: number, fc: number, q: number, gainDb: number) {
  const x = Math.log2(freq / Math.max(fc, 1));
  const k = Math.max(1.2, q * 2.2);
  return gainDb * Math.tanh(x * k * 0.45);
}

function allPassMagDb() {
  return 0;
}

function oneFilterMagDb(filter: ChannelFilter, freq: number) {
  if (!filter.enabled) return 0;

  switch (filter.type) {
    case "hpf":
      return hpfMagDb(freq, filter.freqHz, filter.slope, filter.crossoverFamily);
    case "lpf":
      return lpfMagDb(freq, filter.freqHz, filter.slope, filter.crossoverFamily);
    case "parametric":
      return parametricMagDb(freq, filter.freqHz, filter.q, filter.gainDb);
    case "low_shelf":
      return lowShelfMagDb(freq, filter.freqHz, filter.q, filter.gainDb);
    case "high_shelf":
      return highShelfMagDb(freq, filter.freqHz, filter.q, filter.gainDb);
    case "tilt_shelf":
      return tiltShelfMagDb(freq, filter.freqHz, filter.q, filter.gainDb);
    case "all_pass":
      return allPassMagDb();
    case "band_pass":
      return bandPassMagDb(freq, filter.freqHz, filter.q);
    case "notch":
      return notchMagDb(freq, filter.freqHz, filter.q);
    default:
      return 0;
  }
}

function buildPath(
  fn: (freq: number) => number,
  samples = 320
) {
  let d = "";

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const logMin = Math.log10(FREQ_MIN);
    const logMax = Math.log10(FREQ_MAX);
    const freq = Math.pow(10, logMin + t * (logMax - logMin));

    const x = logX(freq);
    const y = dbY(clamp(fn(freq), DB_MIN, DB_MAX));

    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }

  return d;
}

export default function FrequencyResponseChart({
  filters,
  selectedId
}: {
  filters: ChannelFilter[];
  selectedId?: number | null;
}) {
  const selected = useMemo(
    () => filters.find((f) => f.id === selectedId) ?? null,
    [filters, selectedId]
  );

  const totalPath = useMemo(() => {
    return buildPath((freq) =>
      filters.reduce((sum, f) => sum + oneFilterMagDb(f, freq), 0)
    );
  }, [filters]);

  const selectedPath = useMemo(() => {
    if (!selected) return "";
    return buildPath((freq) => oneFilterMagDb(selected, freq));
  }, [selected]);

  const zeroY = dbY(0);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full">
      {/* bg */}
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />

      {/* vertical grid */}
      {GRID_FREQS.map((f) => {
        const x = logX(f);
        return (
          <g key={`f-${f}`}>
            <line
              x1={x}
              y1={PAD_T}
              x2={x}
              y2={PAD_T + PLOT_H}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={f === 100 || f === 1000 || f === 10000 ? 1.2 : 1}
            />
            <text
              x={x}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize="11"
              fill="rgba(255,255,255,0.45)"
            >
              {fmtFreq(f)}
            </text>
          </g>
        );
      })}

      {/* horizontal grid */}
      {GRID_DBS.map((db) => {
        const y = dbY(db);
        return (
          <g key={`db-${db}`}>
            <line
              x1={PAD_L}
              y1={y}
              x2={PAD_L + PLOT_W}
              y2={y}
              stroke={db === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}
              strokeWidth={db === 0 ? 1.2 : 1}
            />
            <text
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgba(255,255,255,0.45)"
            >
              {db}
            </text>
          </g>
        );
      })}

      {/* selected filter */}
      {selectedPath && (
        <path
          d={selectedPath}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      )}

      {/* total */}
      <path
        d={totalPath}
        fill="none"
        stroke="rgba(220,38,38,0.95)"
        strokeWidth="2.25"
      />

      {/* 0 dB emphasis */}
      <line
        x1={PAD_L}
        y1={zeroY}
        x2={PAD_L + PLOT_W}
        y2={zeroY}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.2"
      />
    </svg>
  );
}