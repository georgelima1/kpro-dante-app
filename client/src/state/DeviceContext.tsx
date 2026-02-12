import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ChannelStatus = {
  ch: number;
  name?: string;
  audio: { mute: boolean; gainDb: number; polarity: 1 | -1 };
  meters: { rmsDb: number; peakDb: number };
  flags: { clip: boolean; limit: boolean; protect: boolean; reason?: string };
  route?: { from: string; to?: string };
};

export type DeviceStatus = {
  deviceId: string;
  fw: string;
  net: { wifi: string; lan: string };
  temps: { heatsink: number; board: number };
  rails: { vbat: number; vbus: number };
  powerOn: boolean;
  channelsCount: number;
  channels: ChannelStatus[];
};

type Ctx = {
  status: DeviceStatus | null;
  setStatus: React.Dispatch<React.SetStateAction<DeviceStatus | null>>;
};

const DeviceCtx = createContext<Ctx | null>(null);

export function DeviceProvider({
  deviceId,
  children
}: {
  deviceId: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const r = await fetch(`/api/v1/devices/${deviceId}/status`);
      const j = await r.json();
      if (alive) setStatus(j);
    }
    load();
    const t = setInterval(load, 1000); // refresca status p/ manter flags na UI
    return () => { alive = false; clearInterval(t); };
  }, [deviceId]);

  const value = useMemo(() => ({ status, setStatus }), [status]);
  return <DeviceCtx.Provider value={value}>{children}</DeviceCtx.Provider>;
}

export function useDevice() {
  const ctx = useContext(DeviceCtx);
  if (!ctx) throw new Error("useDevice must be used inside DeviceProvider");
  return ctx;
}
