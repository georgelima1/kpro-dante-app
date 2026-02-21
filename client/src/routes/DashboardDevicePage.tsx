import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { DeviceProvider, useDevice } from "../state/DeviceContext";
import DbScale, { pctFromDb } from "../ui/DbScale";
import FlagDot from "../ui/FlagDot";

export default function DashboardDevicePage() {
  const { id } = useParams();
  if (!id) return <div className="text-sm text-smx-muted">Device não informado.</div>;

  return (
    <DeviceProvider deviceId={id}>
      <DashboardDeviceInner deviceId={id} />
    </DeviceProvider>
  );
}

type PeakHoldState = Record<number, number>; // ch -> peakHoldDb

const DB_FLOOR = -80; // piso de leitura
const HOLD_MS = 450; // quanto tempo segura antes de começar a cair
const DROP_DB_PER_SEC = 10; // velocidade de queda do hold (dB/s)
const TICK_MS = 50;

// Escalas (iguais ao resto do app)
const VU_MIN = -48;
const VU_MAX = 3;
const VU_MARKS = [-48, -24, -12, -6, 0, 3];

const GAIN_MIN = -48;
const GAIN_MAX = 0;
const GAIN_MARKS = [-48, -24, -12, -6, -3, 0];

function DashboardDeviceInner({ deviceId }: { deviceId: string }) {
  const { status, setStatus } = useDevice();

  // ✅ peak-hold por canal (db)
  const [peakHold, setPeakHold] = useState<PeakHoldState>({});
  const lastPeakAtRef = useRef<Record<number, number>>({}); // ch -> timestamp

  // ✅ WS único recebendo VU de todos os canais
  const wsUrl = useMemo(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/ws?deviceId=${encodeURIComponent(deviceId)}`;
  }, [deviceId]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);

        if (data?.t === "vu" && typeof data?.ch === "number") {
          const chNum = Number(data.ch);
          const rmsDb = Number(data.rmsDb ?? DB_FLOOR);
          const peakDb = Number(data.peakDb ?? rmsDb);

          // ✅ update status: meters + flags em tempo real
          setStatus((s) => {
            if (!s) return s;
            return {
              ...s,
              channels: s.channels.map((c) =>
                c.ch !== chNum
                  ? c
                  : {
                      ...c,
                      meters: { rmsDb, peakDb },
                      flags: {
                        ...c.flags,
                        limit: !!data.limit,
                        protect: !!data.protect,
                        reason: data.reason ?? c.flags?.reason
                      }
                    }
              )
            };
          });

          // ✅ peak-hold: sobe instantâneo somente quando o pico superar o hold atual
          setPeakHold((prev) => {
            const cur = prev[chNum] ?? DB_FLOOR;
            if (peakDb > cur) {
              lastPeakAtRef.current[chNum] = Date.now();
              return { ...prev, [chNum]: peakDb };
            }
            return prev;
          });
        }
      } catch {}
    };

    return () => ws.close();
  }, [wsUrl, setStatus]);

  // ✅ Decaimento suave do peak-hold (por canal, com HOLD_MS)
  useEffect(() => {
    const t = setInterval(() => {
      setPeakHold((prev) => {
        const now = Date.now();
        const out: PeakHoldState = {};
        let changed = false;

        for (const [k, v] of Object.entries(prev)) {
          const chNum = Number(k);
          const last = lastPeakAtRef.current[chNum] ?? 0;

          if (now - last < HOLD_MS) {
            out[chNum] = v;
            continue;
          }

          const drop = (DROP_DB_PER_SEC * TICK_MS) / 1000;

          // 💡 opcional (mais “real”): cai até o RMS atual (não até DB_FLOOR)
          const rmsFloor = status?.channels?.find((c) => c.ch === chNum)?.meters?.rmsDb ?? DB_FLOOR;
          const next = Math.max(rmsFloor, v - drop);

          out[chNum] = next;
          if (next !== v) changed = true;
        }

        return changed ? out : prev;
      });
    }, TICK_MS);

    return () => clearInterval(t);
  }, [status]);

  if (!status) return <div className="text-sm text-smx-muted">Carregando status...</div>;

  async function setChAudio(ch: number, patch: any) {
    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const j = await r.json();
    setStatus((s) => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map((c) => (c.ch === ch ? { ...c, audio: j.audio } : c))
      };
    });
  }

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  async function stepGain(ch: number, delta: number) {
    const cur = status?.channels.find((c) => c.ch === ch)?.audio.gainDb ?? -24;
    const next = clamp(Number((cur + delta).toFixed(1)), GAIN_MIN, GAIN_MAX);
    await setChAudio(ch, { gainDb: next });
  }

  return (
    <div className="max-w-8xl">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        {/* Header compacto */}
        <div className="px-5 py-3 border-b border-smx-line flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Monitor</div>
            <div className="text-xs text-smx-muted">Todos os canais (VU + Gain)</div>
          </div>

          <div className="flex items-center gap-3 text-xs text-smx-muted">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-smx-red/80" />
              <span>Protect</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white" />
              <span>Limit</span>
            </div>
          </div>
        </div>

        {/* Corpo: 2 cards (VU em cima, Gain embaixo) */}
        <div className="p-4 md:p-5 space-y-4">
          {/* ====== VU BANK ====== */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-smx-muted">VU (RMS + Peak/Hold)</div>
            </div>

            <div className="space-y-2">
              {status.channels.map((c) => {
                const rmsDb = c.meters?.rmsDb ?? DB_FLOOR;
                const peakDb = c.meters?.peakDb ?? rmsDb;
                const holdDb = peakHold[c.ch] ?? peakDb;

                const vuPct = pctFromDb(rmsDb, VU_MIN, VU_MAX);
                const peakPct = pctFromDb(peakDb, VU_MIN, VU_MAX);
                const holdPct = pctFromDb(holdDb, VU_MIN, VU_MAX);

                return (
                  <div key={c.ch} className="grid grid-cols-[56px_1fr_auto] gap-3 items-center">
                    {/* Ident + dots */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-xs font-semibold text-smx-text w-8">CH{c.ch}</div>
                      <div className="flex items-center gap-1.5">
                        <FlagDot
                          on={!!c.flags?.protect}
                          color="red"
                          title={c.flags?.protect ? `Protect: ${c.flags?.reason ?? "—"}` : "Protect: OFF"}
                        />
                        <FlagDot
                          on={!!c.flags?.limit}
                          color="white"
                          title={c.flags?.limit ? "Limit: ON" : "Limit: OFF"}
                        />
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="relative h-3 rounded-full bg-smx-panel2 border border-smx-line overflow-hidden">
                      <div
                        className="h-full transition-[width] duration-75"
                        style={{
                          width: `${vuPct}%`,
                          background:
                            "linear-gradient(90deg, #00ff00 0%, #00ff00 70%, #ffd400 85%, #ff0000 100%)"
                        }}
                      />
                      {/* Peak marker */}
                      <div
                        className="absolute top-0 h-full w-[2px] bg-white/70"
                        style={{ left: `calc(${peakPct}% - 1px)` }}
                        title="Peak"
                      />
                      {/* Hold marker */}
                      <div
                        className="absolute top-0 h-full w-[2px] bg-white"
                        style={{ left: `calc(${holdPct}% - 1px)` }}
                        title="Hold"
                      />
                    </div>

                    {/* Numbers */}
                    <div className="text-xs text-smx-muted whitespace-nowrap">
                      <span className="text-smx-text">{rmsDb.toFixed(1)}</span> dB
                      <span className="opacity-40"> • </span>
                      P <span className="text-smx-text">{peakDb.toFixed(1)}</span>
                      <span className="opacity-40"> • </span>
                      H <span className="text-smx-text">{holdDb.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* escala única do VU */}
            <div className="mt-3">
              <DbScale marks={VU_MARKS} minDb={VU_MIN} maxDb={VU_MAX} insetPx={24} offsetPx={-6} />
            </div>
          </div>

          {/* ====== GAIN BANK ====== */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-smx-muted">Gain</div>
            </div>

            <div className="space-y-3">
              {status.channels.map((c) => {
                const g = c.audio?.gainDb ?? -24;
                const fillPct = pctFromDb(g, GAIN_MIN, GAIN_MAX);

                return (
                  <div key={c.ch} className="grid grid-cols-[56px_1fr_auto] gap-3 items-center">
                    <div className="text-xs font-semibold text-smx-text w-14">CH{c.ch}</div>

                    <input
                      type="range"
                      min={GAIN_MIN}
                      max={GAIN_MAX}
                      step={0.5}
                      value={g}
                      onChange={(e) => setChAudio(c.ch, { gainDb: Number(e.target.value) })}
                      className="w-full smx-range smx-range-fill smx-range-red"
                      style={{ ["--fill" as any]: `${fillPct}%` }}
                    />

                    {/* ✅ botões + valor */}
                    <div className="flex items-center gap-2">
                      
                    <button
                        type="button"
                        onClick={() => stepGain(c.ch, -0.1)}
                        className="w-6 h-6 rounded-lg border border-smx-line bg-smx-panel2
                                   flex items-center justify-center text-smx-text
                                   hover:border-smx-red/40 active:scale-95 transition"
                        title="Decrease 0.1 dB"
                      >
                        ▼
                      </button>

                      <div className="text-xs text-smx-muted whitespace-nowrap min-w-[72px] text-center">
                        <span className="text-smx-text font-semibold">{g.toFixed(1)}</span> dB
                      </div>

                      <button
                        type="button"
                        onClick={() => stepGain(c.ch, +0.1)}
                        className="w-6 h-6 rounded-lg border border-smx-line bg-smx-panel2
                                   flex items-center justify-center text-smx-text
                                   hover:border-smx-red/40 active:scale-95 transition"
                        title="Increase 0.1 dB"
                      >
                        ▲
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* escala única do Gain */}
            <div className="mt-3">
              <DbScale marks={GAIN_MARKS} minDb={GAIN_MIN} maxDb={GAIN_MAX} insetPx={24} offsetPx={-6} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}