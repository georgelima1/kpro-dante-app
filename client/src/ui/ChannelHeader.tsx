import React, { useEffect, useMemo, useRef, useState } from "react";
import ChannelStrip from "./ChannelStrip";
import { useDevice } from "../state/DeviceContext";
import FlagDot from "./FlagDot";

export default function ChannelHeader() {
  const { status, setStatus, deviceId, ch, setCh } = useDevice();

  // ✅ Peak Hold (igual dashboard) – por canal selecionado
  const [peakHoldDb, setPeakHoldDb] = useState<number>(-80);
  const peakHoldRef = useRef<number>(-80);
  const lastPeakAtRef = useRef<number>(Date.now());


  const channelsCount = status?.channelsCount ?? status?.channels?.length ?? 1;
  const channel = status?.channels?.find((c) => c.ch === ch);

  // WS de VU por canal (selecionado)
  const wsUrl = useMemo(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/ws?deviceId=${encodeURIComponent(deviceId)}&ch=${ch}`;
  }, [deviceId, ch]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);

        if (data?.t === "vu" && Number(data?.ch) === ch) {
          const rms = Number(data.rmsDb ?? -80);
          const peak = Number(data.peakDb ?? rms);

          // ✅ Peak hold sobe instantâneo se houver pico maior
          setPeakHoldDb((prev) => {
            const next = peak > prev ? peak : prev;
            peakHoldRef.current = next;
            return next;
          });
          lastPeakAtRef.current = Date.now();


          // ✅ Peak hold local (reseta/decai depois se quiser)
          // setPeakHoldDb((prev) => (peak > prev ? peak : prev));

          // ✅ Atualiza status central (meters + flags)
          setStatus((s) => {
            if (!s) return s;
            return {
              ...s,
              channels: s.channels.map((cc) =>
                cc.ch !== ch
                  ? cc
                  : {
                    ...cc,
                    meters: { rmsDb: rms, peakDb: peak },
                    flags: {
                      ...cc.flags,
                      clip: !!data.clip,
                      limit: !!data.limit,
                      protect: !!data.protect,
                      reason: data.reason ?? cc.flags?.reason
                    }
                  }
              )
            };
          });
        }
      } catch { }
    };

    return () => ws.close();
  }, [wsUrl, ch, setStatus]);

  useEffect(() => {
    const TICK_MS = 50;
    const DROP_DB_PER_SEC = 10; // ajuste: 6..14 dB/s fica bem "pro"
    const HOLD_MS = 450;        // tempo que segura antes de começar a cair

    const t = setInterval(() => {
      const now = Date.now();
      if (now - lastPeakAtRef.current < HOLD_MS) return;

      setPeakHoldDb((prev) => {
        const drop = (DROP_DB_PER_SEC * TICK_MS) / 1000;
        const next = Math.max(-80, prev - drop);
        peakHoldRef.current = next;
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(t);
  }, []);

  // (opcional) reset do peakHold quando troca canal
  useEffect(() => {
    setPeakHoldDb(-80);
    peakHoldRef.current = -80;
    lastPeakAtRef.current = Date.now();
  }, [ch]);


  async function setMute(mute: boolean) {
    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mute })
    });
    const j = await r.json();
    setStatus((s) => {
      if (!s) return s;
      return { ...s, channels: s.channels.map((c) => (c.ch === ch ? { ...c, audio: j.audio } : c)) };
    });
  }

  async function setGainDb(gainDb: number) {
    const r = await fetch(`/api/v1/devices/${deviceId}/ch/${ch}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gainDb })
    });
    const j = await r.json();
    setStatus((s) => {
      if (!s) return s;
      return { ...s, channels: s.channels.map((c) => (c.ch === ch ? { ...c, audio: j.audio } : c)) };
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
    setStatus((s) => {
      if (!s) return s;
      return { ...s, channels: s.channels.map((c) => (c.ch === ch ? { ...c, audio: j.audio } : c)) };
    });
  }

  if (!status || !channel) return null;

  return (
    <section className="bg-smx-panel/95 backdrop-blur border border-smx-line rounded-2xl sticky top-0 z-30">
      {/* Top bar */}
      <div className="px-4 md:px-5 py-3 border-b border-smx-line">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Tabs + Signal */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: channelsCount }).map((_, i) => {
                const n = i + 1;
                const active = n === ch;
                return (
                  <button
                    key={n}
                    onClick={() => setCh(n)}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition ${active
                      ? "bg-smx-red/15 border-smx-red/40 text-smx-text"
                      : "bg-smx-panel2 border-smx-line text-smx-muted hover:border-smx-red/30"
                      }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            <div className="mt-1 text-xs text-smx-muted truncate">
              Signal: <span className="text-smx-text">{channel?.route?.from ?? "—"}</span>
            </div>
          </div>

          {/* Right: Polarity + Mute + Flags (no lugar da legenda) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Protect / Limit como LEDs funcionais */}
            <div className="flex items-center gap-2 mr-1">
              <span className="text-xs">Protect</span>
              <FlagDot
                on={!!channel.flags.protect}
                color="red"
                title={
                  channel.flags.protect
                    ? `Protect: ${channel.flags.reason ?? "—"}`
                    : "Protect: OFF"
                }
              />
              <span className="text-xs">Limit</span>
              <FlagDot
                on={!!channel.flags.limit}
                color="white"
                title={channel.flags.limit ? "Limit: ON" : "Limit: OFF"}
              />
            </div>

            {/* Ø */}
            <button
              onClick={() => togglePolarity()}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center
                transition-all duration-200 active:scale-95 font-semibold
                ${channel.audio.polarity === -1
                  ? "bg-white border-white text-smx-panel shadow-sm"
                  : "bg-smx-panel2 border-smx-line text-white hover:border-white/30"
                }`}
              title="Polarity"
            >
              Ø
            </button>

            {/* M */}
            <button
              onClick={() => setMute(!channel.audio.mute)}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center
                transition-all duration-200 active:scale-95 font-semibold
                ${channel.audio.mute
                  ? "bg-smx-red/25 border-smx-red text-smx-red shadow-md"
                  : "bg-smx-panel2 border-smx-line text-white hover:border-smx-red/40"
                }`}
              title="Mute"
            >
              M
            </button>
          </div>
        </div>
      </div>

      {/* Body: ChannelStrip compacto */}
      <div className="px-2 md:px-3 py-2">
        <ChannelStrip
          ch={channel.ch}
          name={channel.name ?? `CH${channel.ch}`}
          routeFrom={channel.route?.from ?? "—"}
          mute={channel.audio.mute}
          gainDb={channel.audio.gainDb}
          polarity={channel.audio.polarity}
          rmsDb={channel.meters?.rmsDb ?? -80}
          peakDb={channel.meters?.peakDb ?? (channel.meters?.rmsDb ?? -80)}
          peakHoldDb={peakHoldDb}
          limit={!!channel.flags?.limit}
          protect={!!channel.flags?.protect}
          onMute={() => setMute(!channel.audio.mute)}
          onPolarity={() => togglePolarity()}
          onGain={(v) => setGainDb(v)}
          scaleInsetPx={24}
          scaleOffsetPx={-6}
          density="compact"
          showTopButtons={false}   // ✅ Ø + M já estão no header
          showSignal={false}       // ✅ signal já está no header
        />
      </div>
    </section>
  );
}
