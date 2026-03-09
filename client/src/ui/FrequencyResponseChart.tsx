import React, { useMemo, useRef, useState } from "react";
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
const PAD_L = 44;
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

const FILTER_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#84cc16"
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function logX(freq: number) {
  const a = Math.log10(FREQ_MIN);
  const b = Math.log10(FREQ_MAX);
  const t = (Math.log10(freq) - a) / (b - a);
  return PAD_L + t * PLOT_W;
}

function xToFreq(x: number) {
  const t = clamp((x - PAD_L) / PLOT_W, 0, 1);
  const a = Math.log10(FREQ_MIN);
  const b = Math.log10(FREQ_MAX);
  return Math.pow(10, a + t * (b - a));
}

function dbY(db: number) {
  const t = (db - DB_MIN) / (DB_MAX - DB_MIN);
  return PAD_T + (1 - t) * PLOT_H;
}

function yToDb(y: number) {
  const t = clamp((y - PAD_T) / PLOT_H, 0, 1);
  return DB_MAX - t * (DB_MAX - DB_MIN);
}

function fmtFreq(freq: number) {
  if (freq >= 1000) {
    const k = freq / 1000;
    return k >= 10 ? `${Math.round(k)} k` : `${k.toFixed(1)} k`;
  }
  return `${Math.round(freq)} `;
}

function slopeOrderFromDbPerOct(slope?: number) {
  if (!slope) return 1;
  return Math.max(1, Math.round(slope / 6));
}

function hpfMagDb(freq: number, fc: number, slope?: number, family?: CrossoverFamily) {
  const r = freq / Math.max(fc, 1);

  // Butterworth: slope em 6 dB/Oct por ordem
  if (family === "butterworth" || !family) {
    const order = Math.max(1, Math.round((slope ?? 12) / 6));
    const mag = Math.pow(r, order) / Math.sqrt(1 + Math.pow(r, 2 * order));
    return 20 * Math.log10(Math.max(mag, 1e-8));
  }

  // Linkwitz-Riley: slope em 12 dB/Oct por ordem
  if (family === "linkwitz_riley") {
    const order = Math.max(1, Math.round((slope ?? 24) / 12));
    const mag = Math.pow(r, 2 * order) / (1 + Math.pow(r, 2 * order));
    return 20 * Math.log10(Math.max(mag, 1e-8));
  }

  // Bessel (aproximação visual): banda passante em 0 dB, joelho mais suave
  const order = Math.max(1, Math.round((slope ?? 12) / 6));
  const shape = order * 0.85;
  const mag = Math.pow(r, shape) / Math.sqrt(1 + Math.pow(r, 2 * shape));
  return 20 * Math.log10(Math.max(mag, 1e-8));
}

function lpfMagDb(freq: number, fc: number, slope?: number, family?: CrossoverFamily) {
  const r = freq / Math.max(fc, 1);

  // Butterworth: slope em 6 dB/Oct por ordem
  if (family === "butterworth" || !family) {
    const order = Math.max(1, Math.round((slope ?? 12) / 6));
    const mag = 1 / Math.sqrt(1 + Math.pow(r, 2 * order));
    return 20 * Math.log10(Math.max(mag, 1e-8));
  }

  // Linkwitz-Riley: slope em 12 dB/Oct por ordem
  if (family === "linkwitz_riley") {
    const order = Math.max(1, Math.round((slope ?? 24) / 12));
    const mag = 1 / (1 + Math.pow(r, 2 * order));
    return 20 * Math.log10(Math.max(mag, 1e-8));
  }

  // Bessel (aproximação visual): banda passante em 0 dB, joelho mais suave
  const order = Math.max(1, Math.round((slope ?? 12) / 6));
  const shape = order * 0.85;
  const mag = 1 / Math.sqrt(1 + Math.pow(r, 2 * shape));
  return 20 * Math.log10(Math.max(mag, 1e-8));
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
  return -24 * gaussianShape(freq, fc, q);
}

function bandPassMagDb(freq: number, fc: number, q: number) {
  const g = gaussianShape(freq, fc, q);
  return clamp(-24 + g * 24, DB_MIN, DB_MAX);
}

function shelfTransition(freq: number, fc: number, q: number) {
  const x = Math.log2(freq / Math.max(fc, 1));
  const k = Math.max(1.1, q * 2.4);
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
  const k = Math.max(1.1, q * 2.2);
  return gainDb * Math.tanh(x * k * 0.42);
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

function buildPath(fn: (freq: number) => number, samples = 360) {
  let d = "";
  let started = false;

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const logMin = Math.log10(FREQ_MIN);
    const logMax = Math.log10(FREQ_MAX);
    const freq = Math.pow(10, logMin + t * (logMax - logMin));

    const valueDb = fn(freq);

    // ✅ não desenha fora da área visível
    if (valueDb < DB_MIN || valueDb > DB_MAX) {
      started = false;
      continue;
    }

    const x = logX(freq);
    const y = dbY(valueDb);

    if (!started) {
      d += `M ${x} ${y}`;
      started = true;
    } else {
      d += ` L ${x} ${y}`;
    }
  }

  return d;
}

function buildFilledPath(fn: (freq: number) => number, samples = 360) {
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

  // fecha o shape na linha inferior do gráfico
  const xEnd = logX(FREQ_MAX);
  const xStart = logX(FREQ_MIN);
  const yBottom = dbY(DB_MIN);

  d += ` L ${xEnd} ${yBottom}`;
  d += ` L ${xStart} ${yBottom}`;
  d += " Z";

  return d;
}

function filterColor(id: number) {
  return FILTER_COLORS[(id - 1) % FILTER_COLORS.length];
}

function handleY(filter: ChannelFilter) {
  if (filter.type === "hpf" || filter.type === "lpf" || filter.type === "all_pass" || filter.type === "band_pass" || filter.type === "notch") {
    return dbY(0);
  }
  return dbY(filter.gainDb);
}

export default function FrequencyResponseChart({
  filters,
  selectedId,
  onSelectFilter,
  onDragFilter,
  onQAdjust
}: {
  filters: ChannelFilter[];
  selectedId?: number | null;
  onSelectFilter?: (id: number) => void;
  onDragFilter?: (id: number, patch: Partial<ChannelFilter>) => void;
  onQAdjust?: (id: number, nextQ: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef<number | null>(null);
  const [qModeHandleId, setQModeHandleId] = useState<number | null>(null);
  const qStartRef = useRef<{ y: number; q: number; id: number } | null>(null);
  const movedRef = useRef(false);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragRef = useRef<{
    id: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [hover, setHover] = useState<{ x: number; y: number; freq: number; db: number } | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<number | null>(null);

  const selected = useMemo(
    () => filters.find((f) => f.id === selectedId) ?? null,
    [filters, selectedId]
  );
  const activeFilters = useMemo(() => filters.filter((f) => f.enabled), [filters]);

  const totalPath = useMemo(() => {
    return buildPath((freq) =>
      activeFilters.reduce((sum, f) => sum + oneFilterMagDb(f, freq), 0)
    );
  }, [activeFilters]);

  const totalFillPath = useMemo(() => {
    return buildFilledPath((freq) =>
      activeFilters.reduce((sum, f) => sum + oneFilterMagDb(f, freq), 0)
    );
  }, [activeFilters]);

  const individualPaths = useMemo(() => {
    return activeFilters.map((f) => ({
      id: f.id,
      color: filterColor(f.id),
      d: buildPath((freq) => oneFilterMagDb(f, freq))
    }));
  }, [activeFilters]);

  const selectedPath = useMemo(() => {
    if (!selected || !selected.enabled) return "";
    return buildPath((freq) => oneFilterMagDb(selected, freq));
  }, [selected]);

  function svgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const y = ((clientY - rect.top) / rect.height) * HEIGHT;
    return { x, y };
  }

  function onPointerMove(clientX: number, clientY: number) {
    const p = svgPoint(clientX, clientY);
    if (!p) return;

    // ✅ ativa o drag só depois de passar do limiar
    if (pendingDragRef.current && draggingRef.current == null && !qStartRef.current) {
      const dx = p.x - pendingDragRef.current.startX;
      const dy = p.y - pendingDragRef.current.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 8) {
        draggingRef.current = pendingDragRef.current.id;
        movedRef.current = true;
        pendingDragRef.current = null;
      }
    }

    if (pointerDownRef.current) {
      const dx = p.x - pointerDownRef.current.x;
      const dy = p.y - pointerDownRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 6) {
        movedRef.current = true;
      }
    }

    const freq = xToFreq(p.x);
    const db = yToDb(p.y);

    setHover({
      x: clamp(p.x, PAD_L, PAD_L + PLOT_W),
      y: clamp(p.y, PAD_T, PAD_T + PLOT_H),
      freq,
      db
    });

    if (qStartRef.current && onQAdjust) {
      const { y: startY, q: startQ, id } = qStartRef.current;
      const filter = filters.find((f) => f.id === id);

      if (filter && filterUsesQ(filter.type)) {
        const dy = startY - p.y; // subir aumenta Q
        const nextQ = clamp(startQ + dy * 0.02, 0.1, 10);
        onQAdjust(id, nextQ);
        return;
      }
    }

    if (draggingRef.current != null && onDragFilter) {
      const filter = filters.find((f) => f.id === draggingRef.current);
      if (!filter) return;

      const nextFreq = clamp(freq, FREQ_MIN, FREQ_MAX);

      if (
        filter.type === "hpf" ||
        filter.type === "lpf" ||
        filter.type === "all_pass" ||
        filter.type === "band_pass" ||
        filter.type === "notch"
      ) {
        onDragFilter(filter.id, { freqHz: nextFreq });
      } else {
        const nextGain = clamp(db, DB_MIN, DB_MAX);
        onDragFilter(filter.id, { freqHz: nextFreq, gainDb: nextGain });
      }
    }
  }

  function filterUsesQ(type: FilterType) {
    return [
      "parametric",
      "low_shelf",
      "high_shelf",
      "tilt_shelf",
      "all_pass",
      "band_pass",
      "notch"
    ].includes(type);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-full select-none touch-none"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        cursor: draggingRef.current != null ? "grabbing" : hoveredHandleId != null ? "grab" : "default"
      }}
      onPointerMove={(e) => onPointerMove(e.clientX, e.clientY)}
      onPointerLeave={() => {
        setHover(null);
        setHoveredHandleId(null);
      }}
      onPointerUp={() => {
        draggingRef.current = null;
        qStartRef.current = null;
        pendingDragRef.current = null;
        pointerDownRef.current = null;
      }}
      onClick={(e) => {
        // fecha o modo Q só se clicar fora de um handle
        const target = e.target as Element | null;
        if (target?.tagName !== "circle") {
          setQModeHandleId(null);
        }
      }}
    >
      <rect
        x="0"
        y="0"
        width={WIDTH}
        height={HEIGHT}
        fill="transparent"
        pointerEvents="none"
      />

      {GRID_FREQS.map((f) => {
        const x = logX(f);
        return (
          <g key={`f-${f}`} pointerEvents="none">
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

      {GRID_DBS.map((db) => {
        const y = dbY(db);
        return (
          <g key={`db-${db}`} pointerEvents="none">
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

      {/* all active filters */}
      {individualPaths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeOpacity={selectedId === p.id ? 0.9 : 0.45}
          strokeWidth={selectedId === p.id ? 2.25 : 1.2}
          pointerEvents="none"
        />
      ))}

      {/* selected dashed emphasis */}
      {selectedPath && (
        <path
          d={selectedPath}
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.2"
          strokeDasharray="5 4"
          pointerEvents="none"
        />
      )}

      {/* total fill */}
      <path
        d={totalFillPath}
        fill="rgba(239,68,68,0.2)"
        pointerEvents="none"
      />

      {/* total */}
      <path
        d={totalPath}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="2.4"
        pointerEvents="none"
      />

      {activeFilters.map((f) => {
        const cx = logX(f.freqHz);
        const cy = handleY(f);
        const selectedHandle = f.id === selectedId;

        return (
          <g key={`h-${f.id}`}>
            {/* hit area */}
            <circle
              cx={cx}
              cy={cy}
              r={20}
              fill="rgba(255,255,255,0.001)"
              pointerEvents="all"
              onPointerEnter={() => setHoveredHandleId(f.id)}
              onPointerLeave={() => {
                if (draggingRef.current == null) {
                  setTimeout(() => {
                    if (draggingRef.current == null) setHoveredHandleId(null);
                  }, 0);
                }
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const filter = filters.find((x) => x.id === f.id);
                if (!filter) return;

                onSelectFilter?.(f.id);
                setHoveredHandleId(f.id);

                const p = svgPoint(e.clientX, e.clientY);
                if (!p) return;

                pointerDownRef.current = { x: p.x, y: p.y };
                movedRef.current = false;

                if (qModeHandleId === f.id && filterUsesQ(filter.type)) {
                  qStartRef.current = {
                    id: f.id,
                    y: p.y,
                    q: filter.q
                  };
                  draggingRef.current = null;
                  pendingDragRef.current = null;
                } else {
                  // ✅ ainda não começa a arrastar; só marca como gesto pendente
                  pendingDragRef.current = {
                    id: f.id,
                    startX: p.x,
                    startY: p.y
                  };
                  draggingRef.current = null;
                  qStartRef.current = null;
                }

                try {
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                } catch { }
              }}
              onPointerUp={(e) => {
                try {
                  (e.currentTarget as Element).releasePointerCapture(e.pointerId);
                } catch { }
                draggingRef.current = null;
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (movedRef.current) {
                  movedRef.current = false;
                  return;
                }

                const filter = filters.find((x) => x.id === f.id);
                if (!filter || !filterUsesQ(filter.type)) return;

                setQModeHandleId((prev) => (prev === f.id ? null : f.id));
              }}
            />

            {/* visible handle */}
            {/* visible handle */}
            <circle
              cx={cx}
              cy={cy}
              r={selectedHandle ? 12 : 10}
              fill={filterColor(f.id)}
              stroke={selectedHandle ? "white" : "rgba(255,255,255,0.35)"}
              strokeWidth={selectedHandle ? 2 : 1}
              pointerEvents="none"
            />

            <text
              x={cx}
              y={cy + (selectedHandle ? 3.2 : 2.8)}
              textAnchor="middle"
              fontSize={selectedHandle ? "10" : "9"}
              fontWeight="700"
              fill="white"
              pointerEvents="none"
            >
              {f.id}
            </text>

            {qModeHandleId === f.id && filterUsesQ(f.type) && (
              <g pointerEvents="none">
                {/* seta esquerda */}
                <line
                  x1={cx - 42}
                  y1={cy}
                  x2={cx - 12}
                  y2={cy}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${cx - 42} ${cy} L ${cx - 30} ${cy - 6} M ${cx - 42} ${cy} L ${cx - 30} ${cy + 6}`}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* seta direita */}
                <line
                  x1={cx + 12}
                  y1={cy}
                  x2={cx + 42}
                  y2={cy}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${cx + 42} ${cy} L ${cx + 30} ${cy - 6} M ${cx + 42} ${cy} L ${cx + 30} ${cy + 6}`}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            )}
          </g>
        );
      })}

      {/* hover cursor */}
      {hover && (
        <g pointerEvents="none">
          <line
            x1={hover.x}
            y1={PAD_T}
            x2={hover.x}
            y2={PAD_T + PLOT_H}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1={PAD_L}
            y1={hover.y}
            x2={PAD_L + PLOT_W}
            y2={hover.y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          <g transform={`translate(${Math.min(hover.x + 10, WIDTH - 120)}, ${Math.max(hover.y - 34, 20)})`}>
            <rect
              width="50"
              height="28"
              rx="8"
              fill="rgba(0,0,0,0.72)"
              stroke="rgba(255,255,255,0.12)"
            />
            <text x="8" y="12" fontSize="11" fill="rgba(255,255,255,0.85)">
              {fmtFreq(hover.freq)}hz
            </text>
            <text x="8" y="23" fontSize="11" fill="rgba(255,255,255,0.85)">
              {hover.db.toFixed(1)} dB
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}