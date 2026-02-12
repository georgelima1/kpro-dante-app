import React from "react";
import DbScale, { pctFromDb } from "../ui/DbScale";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const VU_MIN = -48;
const VU_MAX = 3;
const VU_MARKS = [-48, -24, -12, -6, 0, 3];

const GAIN_MIN = -48;
const GAIN_MAX = 0;
const GAIN_MARKS = [-48, -24, -12, -6, -3, 0];

type Status = {
  deviceId: string;
  fw: string;
  temps: { heatsink: number; board: number };
  rails: { vbat: number; vbus: number };
  audio: { mute: boolean; gainDb: number; preset: string };
  protections: { clip: boolean; limit: boolean; protect: boolean; reason: string };
  net: { wifi: string; lan: string };
  powerOn: boolean;
};

type VuMsg = {
  t: "vu";
  zone: string;
  ch: { rms: number; peak: number }[];
  clip: boolean;
  limit: boolean;
};

export default function DashboardPage() {
  const { id } = useParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [vu, setVu] = useState<VuMsg | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${proto}://${location.host}/ws?deviceId=${encodeURIComponent(id ?? "")}`;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/devices/${id}/status`).then(r => r.json()).then(setStatus);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.t === "vu") setVu(data);
      } catch { }
    };

    ws.onclose = () => { /* reconectar depois (V1) */ };

    return () => ws.close();
  }, [id, wsUrl]);

  async function setMute(mute: boolean) {
    if (!id) return;
    const r = await fetch(`/api/v1/devices/${id}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mute })
    });
    const j = await r.json();
    setStatus(s => (s ? { ...s, audio: j.audio } : s));
  }

  async function setGainDb(gainDb: number) {
    if (!id) return;
    const r = await fetch(`/api/v1/devices/${id}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gainDb })
    });
    const j = await r.json();
    setStatus(s => (s ? { ...s, audio: j.audio } : s));
  }

  async function setPower(powerOn: boolean) {
    if (!id) return;
    const r = await fetch(`/api/v1/devices/${id}/power`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ powerOn })
    });
    const j = await r.json();
    setStatus(s => (s ? { ...s, powerOn: j.powerOn } : s));
  }

  if (!status) {
    return <div className="text-sm text-smx-muted">Carregando status...</div>;
  }

  const vuDb = vu?.ch?.[0]?.rms ?? -80;
  const vuPct = pctFromDb(vuDb, VU_MIN, VU_MAX);

  return (
    <div className="max-w-5xl space-y-6">
      {/* STATUS CARD */}
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
            <div className="mt-2 text-sm">WiFi: <span className="text-smx-muted">{status.net.wifi}</span></div>
            <div className="text-sm">LAN: <span className="text-smx-muted">{status.net.lan}</span></div>
          </div>

          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Temperaturas</div>
            <div className="mt-2 text-sm">Heatsink: <span className="text-smx-muted">{status.temps.heatsink.toFixed(1)}°C</span></div>
            <div className="text-sm">Board: <span className="text-smx-muted">{status.temps.board.toFixed(1)}°C</span></div>
          </div>

          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Rails</div>
            <div className="mt-2 text-sm">VBAT: <span className="text-smx-muted">{status.rails.vbat.toFixed(1)}V</span></div>
            <div className="text-sm">VBUS: <span className="text-smx-muted">{status.rails.vbus.toFixed(1)}V</span></div>
          </div>
        </div>
      </section>

      {/* ZONE CARD (VU + CONTROLES) */}
      <section className="bg-smx-panel border border-smx-line rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Zone A</div>
          <div className="text-xs text-smx-muted">
            {status.protections.protect ? `PROTECT: ${status.protections.reason || "—"}` : "OK"}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs text-smx-muted mb-2">VU (RMS)</div>
          <div className="h-4 rounded-full bg-smx-panel2 border border-smx-line overflow-hidden">
            <div
              className="h-full transition-[width] duration-75"
              style={{
                width: `${vuPct}%`,
                background:
                  "linear-gradient(90deg, #03ff07 0%, #00ff00 75%, #ffd400 85%, #ff0000 100%)"
              }}
            />
          </div>


          <div className="mt-2 text-xs text-smx-muted flex justify-between">
            <span>-∞ dB</span>
            <span>{vuDb.toFixed(1)} dB</span>
            <span>0 dB</span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setMute(!status.audio.mute)}
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-sm font-semibold ${status.audio.mute
                ? "bg-smx-red/20 border-smx-red/40"
                : "bg-smx-panel2 border-smx-line hover:border-smx-red/30"
                }`}
              title="Mute"
            >
              M
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-smx-muted mb-2">
                <span>Gain</span>
                <span className="text-smx-text">{status.audio.gainDb.toFixed(1)} dB</span>
              </div>
              <input
                type="range"
                min={GAIN_MIN}
                max={GAIN_MAX}
                step={0.1}
                value={status.audio.gainDb}
                onChange={(e) => setGainDb(Number(e.target.value))}
                className="w-full accent-smx-red"
              />

              <DbScale
                marks={GAIN_MARKS}
                minDb={GAIN_MIN}
                maxDb={GAIN_MAX}
                insetPx={4.8}
                offsetPx={11}
              />

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
