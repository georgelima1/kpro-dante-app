import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type ChannelStatus = {
  ch: number;
  name?: string;
  audio: { mute: boolean; gainDb: number; polarity: 1 | -1 };
  meters: { rmsDb: number; peakDb: number };
  delay: { enabled: boolean; valueSamples: number };
  flags: { clip: boolean; limit: boolean; protect: boolean; reason?: string };
  route?: { from: string; to?: string };
};

export type DeviceStatus = {
  deviceId: string;
  fw: string;
  net: { wifi: string; lan: string };
  temps: { heatsink: number; board: number };
  rails: { vbat: number; vbus: number };
  dsp: { sampleRate: number; delayMaxMs: number };
  powerOn: boolean;
  channelsCount: number;
  channels: ChannelStatus[];
};

type Ctx = {
  deviceId: string;

  status: DeviceStatus | null;
  setStatus: React.Dispatch<React.SetStateAction<DeviceStatus | null>>;

  ch: number;
  setCh: (ch: number) => void;
};

const DeviceCtx = createContext<Ctx | undefined>(undefined);

function clampCh(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

export function DeviceProvider({
  deviceId,
  children
}: {
  deviceId: string;
  children: React.ReactNode;
}) {
  const nav = useNavigate();
  const loc = useLocation();

  const [status, setStatus] = useState<DeviceStatus | null>(null);

  // ✅ inicializa lendo ?ch=
  const [ch, _setCh] = useState<number>(() => {
    const sp = new URLSearchParams(loc.search);
    return clampCh(sp.get("ch") ?? 1);
  });

  // ✅ carregar status
  useEffect(() => {
    let alive = true;

    async function load() {
      const r = await fetch(`/api/v1/devices/${deviceId}/status`);
      const j = await r.json();
      if (alive) setStatus(j);
    }

    load();
    const t = setInterval(load, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [deviceId]);

  // ✅ quando URL mudar (back/forward, links etc), sincroniza o ch do state
  useEffect(() => {
    const sp = new URLSearchParams(loc.search);
    const next = clampCh(sp.get("ch") ?? 1);
    _setCh(next);
  }, [loc.search]);

  // ✅ setCh agora atualiza STATE + URL (assim o Shell atualiza)
  function setCh(next: number) {
    const n = clampCh(next);
    _setCh(n);

    const sp = new URLSearchParams(loc.search);
    sp.set("ch", String(n));

    nav(
      { pathname: loc.pathname, search: `?${sp.toString()}` },
      { replace: true } // não polui histórico enquanto você troca de canal
    );
  }

  const value = useMemo(
    () => ({
      deviceId,
      status,
      setStatus,
      ch,
      setCh
    }),
    [deviceId, status, ch]
  );

  return <DeviceCtx.Provider value={value}>{children}</DeviceCtx.Provider>;
}

export function useDevice() {
  const ctx = useContext(DeviceCtx);
  if (!ctx) throw new Error("useDevice must be used inside DeviceProvider");
  return ctx;
}