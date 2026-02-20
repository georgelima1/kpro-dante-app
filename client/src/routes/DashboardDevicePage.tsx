import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { DeviceProvider, useDevice } from "../state/DeviceContext";
import ChannelStrip from "../ui/ChannelStrip";

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

function DashboardDeviceInner({ deviceId }: { deviceId: string }) {
  const { status, setStatus } = useDevice();

  // ✅ peak-hold por canal (db)
  const [peakHold, setPeakHold] = useState<PeakHoldState>({});

  // ✅ refs p/ “hold real” por canal
  const peakHoldRef = useRef<PeakHoldState>({});
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

            // se pico maior, atualiza hold e reseta o timer (HOLD_MS)
            if (peakDb > cur) {
              lastPeakAtRef.current[chNum] = Date.now();
              return { ...prev, [chNum]: peakDb };
            }

            // caso contrário, não muda (deixa o decaimento cuidar)
            return prev;
          });
        }
      } catch { }
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
          const rmsFloor =
            status?.channels?.find(c => c.ch === chNum)?.meters?.rmsDb ?? DB_FLOOR;

          const next = Math.max(rmsFloor, v - drop);

          out[chNum] = next;
          if (next !== v) changed = true;
        }

        return changed ? out : prev;
      });
    }, TICK_MS);

    return () => clearInterval(t);
  }, []);

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

  return (
    <div className="space-y-8 max-w-8xl">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
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
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white" />
              <span>Limit</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-smx-line">
          {status.channels.map((c) => (
            <ChannelStrip
              key={c.ch}
              ch={c.ch}
              name={c.name ?? `CH${c.ch}`}
              routeFrom={c.route?.from ?? "—"}
              mute={c.audio.mute}
              gainDb={c.audio.gainDb}
              polarity={c.audio.polarity}
              rmsDb={c.meters?.rmsDb ?? DB_FLOOR}
              peakDb={c.meters?.peakDb ?? (c.meters?.rmsDb ?? DB_FLOOR)}
              peakHoldDb={peakHold[c.ch] ?? (c.meters?.peakDb ?? DB_FLOOR)}
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
