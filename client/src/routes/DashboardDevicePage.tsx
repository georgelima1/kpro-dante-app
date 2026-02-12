import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { DeviceProvider, useDevice } from "../state/DeviceContext";
import DbScale, { pctFromDb } from "../ui/DbScale";
import Tooltip from "../ui/Tooltip";

const VU_MIN = -80;
const VU_MAX = 0;
const VU_MARKS = [-80, -70, -60, -50, -40, -24, -12, -6, -3, 0];

const GAIN_MIN = -48;
const GAIN_MAX = 0;
const GAIN_MARKS = [-48, -24, -12, -6, -3, 0];

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

function DashboardDeviceInner({ deviceId }: { deviceId: string }) {
  const { status, setStatus } = useDevice();
  const wsRef = useRef<WebSocket | null>(null);

  // ✅ peak-hold por canal (db)
  const [peakHold, setPeakHold] = useState<PeakHoldState>({});

  // ✅ WS único recebendo VU de todos os canais
  const wsUrl = useMemo(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/ws?deviceId=${encodeURIComponent(deviceId)}`;
  }, [deviceId]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.t === "vu" && typeof data?.ch === "number") {
          const chNum = Number(data.ch);
          const rmsDb = Number(data.rmsDb ?? -80);
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
                      reason: data.reason ?? c.flags.reason
                    }
                  }
              )
            };
          });

          // ✅ peak hold: segura o maior pico
          setPeakHold((prev) => {
            const cur = prev[chNum];
            const next = cur == null ? peakDb : Math.max(cur, peakDb);
            return { ...prev, [chNum]: next };
          });
        }
      } catch { }
    };

    return () => ws.close();
  }, [wsUrl, setStatus]);

  // ✅ Decaimento do peak-hold (suave)
  useEffect(() => {
    const t = setInterval(() => {
      setPeakHold((prev) => {
        const out: PeakHoldState = { ...prev };
        for (const k of Object.keys(out)) {
          const chNum = Number(k);
          // cai ~0.7 dB por tick (ajuste a gosto)
          out[chNum] = out[chNum] - 0.7;
          // limite mínimo
          if (out[chNum] < VU_MIN) out[chNum] = VU_MIN;
        }
        return out;
      });
    }, 120);
    return () => clearInterval(t);
  }, []);

  if (!status) return <div className="text-sm text-smx-muted">Carregando status...</div>;

  async function setPower(powerOn: boolean) {
    const r = await fetch(`/api/v1/devices/${deviceId}/power`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ powerOn })
    });
    const j = await r.json();
    setStatus((s) => (s ? { ...s, powerOn: j.powerOn } : s));
  }

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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HEADER GERAL do device (igual primeira versão) */}
      <section className="bg-smx-panel border border-smx-line rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-smx-muted">Status</div>
            <div className="text-xl font-semibold mt-1">{status.deviceId}</div>
            <div className="text-xs text-smx-muted mt-1">FW {status.fw}</div>
          </div>

          <button
            onClick={() => setPower(!status.powerOn)}
            className={`px-4 py-2 rounded-xl border transition ${status.powerOn
              ? "bg-smx-red/20 border-smx-red/40"
              : "bg-smx-panel2 border-smx-line hover:border-smx-red/30"
              }`}
          >
            <span className="font-medium">{status.powerOn ? "POWER ON" : "POWER OFF"}</span>
          </button>
        </div>

        <div className="mt-5 grid sm:grid-cols-3 gap-4">
          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Rede</div>
            <div className="mt-2 text-sm">
              WiFi: <span className="text-smx-muted">{status.net.wifi}</span>
            </div>
            <div className="text-sm">
              LAN: <span className="text-smx-muted">{status.net.lan}</span>
            </div>
          </div>

          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Temperaturas</div>
            <div className="mt-2 text-sm">
              Heatsink:{" "}
              <span className="text-smx-muted">{status.temps.heatsink.toFixed(1)}°C</span>
            </div>
            <div className="text-sm">
              Board: <span className="text-smx-muted">{status.temps.board.toFixed(1)}°C</span>
            </div>
          </div>

          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Rails</div>
            <div className="mt-2 text-sm">
              VBAT: <span className="text-smx-muted">{status.rails.vbat.toFixed(1)}V</span>
            </div>
            <div className="text-sm">
              VBUS: <span className="text-smx-muted">{status.rails.vbus.toFixed(1)}V</span>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ MONITORAMENTO: todos os canais em linhas compactas */}
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        {/* header */}
        <div className="px-5 py-3 border-b border-smx-line flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Monitor</div>
            <div className="text-xs text-smx-muted">Todos os canais (VU + controles)</div>
          </div>

          <div className="flex items-center gap-3 text-xs text-smx-muted">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-smx-red/80" />
              <span>Protect</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white/80" />
              <span>Limit</span>
            </div>
          </div>

        </div>

        <div className="divide-y divide-smx-line">
          {status.channels.map((c) => (
            <ChannelRow
              key={c.ch}
              ch={c.ch}
              name={c.name ?? `CH${c.ch}`}
              routeFrom={c.route?.from ?? "—"}
              mute={c.audio.mute}
              gainDb={c.audio.gainDb}
              polarity={c.audio.polarity}
              rmsDb={c.meters?.rmsDb ?? -80}
              peakDb={c.meters?.peakDb ?? (c.meters?.rmsDb ?? -80)}
              peakHoldDb={peakHold[c.ch] ?? (c.meters?.peakDb ?? -80)}
              limit={!!c.flags?.limit}
              protect={!!c.flags?.protect}
              onMute={() => setChAudio(c.ch, { mute: !c.audio.mute })}
              onPolarity={() => setChAudio(c.ch, { polarity: c.audio.polarity === -1 ? 1 : -1 })}
              onGain={(v) => setChAudio(c.ch, { gainDb: v })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ChannelRow(props: {
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
}) {
  const vuPct = pctFromDb(props.rmsDb, VU_MIN, VU_MAX);
  const peakPct = pctFromDb(props.peakDb, VU_MIN, VU_MAX);
  const holdPct = pctFromDb(props.peakHoldDb, VU_MIN, VU_MAX);

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Badge + Infos */}
        {/* HEADER DO CANAL */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* Lado esquerdo */}
          <div className="flex items-center gap-3">
            <div className="leading-tight">
              <div className="font-semibold">{props.name}</div>
              <div className="text-xs text-smx-muted">
                Signal: <span className="text-smx-text">{props.routeFrom}</span>
              </div>
            </div>
          </div>

          {/* Lado direito (Ø + M) */}
          <div className="flex items-center gap-3">

            <button
              onClick={props.onPolarity}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center 
          transition-all duration-200 active:scale-95 font-semibold
          ${props.polarity === -1
                  ? "bg-white border-white text-smx-panel shadow-sm"
                  : "bg-smx-panel2 border-smx-line text-white hover:border-white/30"
                }`}
            >
              Ø
            </button>

            <button
              onClick={props.onMute}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center 
    transition-all duration-200 active:scale-95 font-semibold
    ${props.mute
                  ? "bg-smx-red/25 border-smx-red text-smx-red shadow-md"
                  : "bg-smx-panel2 border-smx-line text-white hover:border-smx-red/40"
                }`}
            >
              M
            </button>

          </div>
        </div>


        {/* Centro: VU (em cima) + Gain (embaixo) */}
        <div className="space-y-4">
          {/* ===== VU ===== */}
          <div>
            <div className="flex items-end justify-between text-xs text-smx-muted mb-2">
              <div className="flex items-center gap-2">
                <span className="text-smx-muted">RMS</span>
                <span className="text-smx-text">{props.rmsDb.toFixed(1)} dB</span>
              </div>

              <div className="flex flex-col items-end gap-1">
                {/* bolinhas acima do Peak */}
                <div className="flex items-center gap-2">
                  <FlagDot on={props.protect} color="red" />
                  <FlagDot on={props.limit} color="white" />
                </div>
                <div className="text-smx-muted">
                  Peak <span className="text-smx-text">{props.peakDb.toFixed(1)} dB</span>
                </div>
              </div>
            </div>

            <div className="relative h-4 rounded-full bg-smx-panel2 border border-smx-line overflow-hidden">
              {/* barra RMS */}
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

              {/* marcador Peak */}
              <div
                className="absolute top-0 h-full w-[2px] bg-white/70"
                style={{ left: `calc(${peakPct}% - 1px)` }}
                title="Peak"
              />

              {/* marcador Peak Hold */}
              <div
                className="absolute top-0 h-full w-[2px] bg-white"
                style={{ left: `calc(${holdPct}% - 1px)` }}
                title="Peak Hold"
              />
            </div>

            <DbScale marks={VU_MARKS} minDb={VU_MIN} maxDb={VU_MAX} insetPx={12} offsetPx={-2} />
          </div>

          {/* ===== GAIN (grande) ===== */}
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
                // ✅ preenche até a posição do valor (track "pro")
                ["--fill" as any]: `${pctFromDb(props.gainDb, GAIN_MIN, GAIN_MAX)}%`
              }}
            />

            <DbScale marks={GAIN_MARKS} minDb={GAIN_MIN} maxDb={GAIN_MAX} insetPx={12} offsetPx={-2} />
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
