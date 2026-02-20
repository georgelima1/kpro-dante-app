import React, { useEffect, useMemo, useRef, useState } from "react";
import ChannelStrip from "./ChannelStrip";
import { useDevice } from "../state/DeviceContext";

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
    <section className="bg-smx-panel/95 backdrop-blur border border-smx-line rounded-2xl p-4 md:p-6 sticky top-0 z-30">
      {/* Top: Tabs de canal (mantém, porque nessa tela você seleciona CH) */}
      <div className="px-5 py-3 border-b border-smx-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: channelsCount }).map((_, i) => {
            const n = i + 1;
            const active = n === ch;
            return (
              <button
                key={n}
                onClick={() => setCh(n)}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${active
                  ? "bg-smx-red/15 border-smx-red/40 text-smx-text"
                  : "bg-smx-panel2 border-smx-line text-smx-muted hover:border-smx-red/30"
                  }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* legenda flags (igual dashboard) */}
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

      {/* ✅ Aqui entra o layout novo do Dashboard */}
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
        // se quiser mesma "pegada" do dashboard:
        scaleInsetPx={24}
        scaleOffsetPx={-6}
      />
    </section>
  );
}
