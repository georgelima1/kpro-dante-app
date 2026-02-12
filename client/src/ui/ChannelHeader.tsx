import React, { useEffect, useMemo, useRef, useState } from "react";
import DbScale, { pctFromDb } from "./DbScale";
import { useDevice } from "../state/DeviceContext";

const VU_MIN = -48;
const VU_MAX = 3;
const VU_MARKS = [-48, -24, -12, -6, 0, 3];

const GAIN_MIN = -48;
const GAIN_MAX = 0;
const GAIN_MARKS = [-48, -24, -12, -6, -3, 0];

export default function ChannelHeader({
  deviceId,
  ch,
  onSelectCh
}: {
  deviceId: string;
  ch: number;
  onSelectCh: (ch: number) => void;
}) {
  const { status, setStatus } = useDevice();
  const wsRef = useRef<WebSocket | null>(null);
  const [vuDb, setVuDb] = useState<number>(-80);

  const channelsCount = status?.channelsCount ?? 1;
  const channel = status?.channels?.find(c => c.ch === ch);

  // WS de VU por canal
  const wsUrl = useMemo(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/ws?deviceId=${encodeURIComponent(deviceId)}&ch=${ch}`;
  }, [deviceId, ch]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.t === "vu" && data?.ch === ch) {
            setVuDb(Number(data.rmsDb ?? -80));
      
            // ✅ atualiza flags em tempo real (e opcionalmente meters)
            setStatus(s => {
              if (!s) return s;
              return {
                ...s,
                channels: s.channels.map(c =>
                  c.ch !== ch
                    ? c
                    : {
                        ...c,
                        meters: { rmsDb: data.rmsDb, peakDb: data.peakDb },
                        flags: {
                          ...c.flags,
                          clip: !!data.clip,
                          limit: !!data.limit,
                          protect: !!data.protect,
                          reason: data.reason ?? c.flags.reason
                        }
                      }
                )
              };
            });
          }
        } catch {}
      };      
    return () => ws.close();
  }, [wsUrl, ch]);

  async function setMute(mute: boolean) {
    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mute })
    });
    const j = await r.json();
    setStatus(s => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map(c => c.ch === ch ? { ...c, audio: j.audio } : c)
      };
    });
  }

  async function setGainDb(gainDb: number) {
    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gainDb })
    });
    const j = await r.json();
    setStatus(s => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map(c => c.ch === ch ? { ...c, audio: j.audio } : c)
      };
    });
  }

  async function togglePolarity() {
    const next = channel?.audio.polarity === -1 ? 1 : -1;
    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polarity: next })
    });
    const j = await r.json();
    setStatus(s => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map(c => c.ch === ch ? { ...c, audio: j.audio } : c)
      };
    });
  }

  const vuPct = pctFromDb(vuDb, VU_MIN, VU_MAX);

  return (
    <section className="bg-smx-panel border border-smx-line rounded-2xl p-4 md:p-6 sticky top-[56px] z-30">
      {/* Tabs CH */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: channelsCount }).map((_, i) => {
            const n = i + 1;
            const active = n === ch;
            return (
              <button
                key={n}
                onClick={() => onSelectCh(n)}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                  active
                    ? "bg-smx-red/15 border-smx-red/40 text-smx-text"
                    : "bg-smx-panel2 border-smx-line text-smx-muted hover:border-smx-red/30"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div className="text-sm font-semibold">
          {channel?.name ?? `CH${ch}`}
        </div>
      </div>

      {/* VU */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-smx-muted mb-2">
          <span>VU (RMS)</span>
          <span className="text-smx-text">{vuDb.toFixed(1)} dB</span>
        </div>

        <div className="h-4 rounded-full bg-smx-panel2 border border-smx-line overflow-hidden">
          <div
            className="h-full transition-[width] duration-75"
            style={{
              width: `${vuPct}%`,
              background:
                "linear-gradient(90deg, #00ff00 0%, #00ff00 70%, #ffd400 85%, #ff0000 100%)"
            }}
          />
        </div>
        <DbScale marks={VU_MARKS} minDb={VU_MIN} maxDb={VU_MAX} insetPx={4.8}
                offsetPx={11} />
      </div>

      {/* Controles: Polarity / Mute / Gain + flags */}
      <div className="mt-6 grid md:grid-cols-[auto_1fr_auto] gap-4 items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => togglePolarity()}
            className="w-14 h-14 rounded-2xl border bg-smx-panel2 border-smx-line hover:border-smx-red/30 transition font-semibold"
            title="Polarity"
          >
            {channel?.audio.polarity === -1 ? "Ø" : "ϕ"}
          </button>

          <button
            onClick={() => setMute(!(channel?.audio.mute ?? false))}
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-sm font-semibold transition ${
              channel?.audio.mute
                ? "bg-smx-red/20 border-smx-red/40"
                : "bg-smx-panel2 border-smx-line hover:border-smx-red/30"
            }`}
            title="Mute"
          >
            M
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-smx-muted mb-2">
            <span>Gain</span>
            <span className="text-smx-text">{(channel?.audio.gainDb ?? 0).toFixed(1)} dB</span>
          </div>

          <input
            type="range"
            min={GAIN_MIN}
            max={GAIN_MAX}
            step={0.5}
            value={channel?.audio.gainDb ?? 0}
            onChange={(e) => setGainDb(Number(e.target.value))}
            className="w-full accent-smx-red"
          />
          <DbScale marks={GAIN_MARKS} minDb={GAIN_MIN} maxDb={GAIN_MAX} insetPx={4.8}
                offsetPx={11} />
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <Flag label="CLIP" on={!!channel?.flags.clip} color="red" />
          <Flag label="LIMIT" on={!!channel?.flags.limit} color="yellow" />
          <Flag label="PROTECT" on={!!channel?.flags.protect} color="red" />
        </div>
      </div>

      {/* Informações do canal (routing etc) */}
      <div className="mt-4 flex items-center justify-between text-xs text-smx-muted">
        <div>
          Signal: <span className="text-smx-text">{channel?.route?.from ?? "—"}</span>
        </div>
        <div>
          {channel?.flags.protect ? (
            <span className="text-smx-red">PROTECT: {channel.flags.reason ?? "—"}</span>
          ) : (
            <span className="text-smx-muted">OK</span>
          )}
        </div>
      </div>
    </section>
  );
}

function Flag({ label, on, color }: { label: string; on: boolean; color: "red" | "yellow" }) {
  const cls =
    color === "red"
      ? on ? "bg-smx-red/25 border-smx-red/50 text-smx-text" : "bg-smx-panel2 border-smx-line text-smx-muted"
      : on ? "bg-yellow-400/20 border-yellow-400/40 text-smx-text" : "bg-smx-panel2 border-smx-line text-smx-muted";

  return (
    <div className={`px-3 py-2 rounded-xl border font-semibold text-center ${cls}`}>
      {label}
    </div>
  );
}
