import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  dsp: {
    sampleRate: number,
    delayMaxMs: number
  },
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

export function DeviceProvider({
  deviceId,
  children
}: {
  deviceId: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [ch, setCh] = useState<number>(1);

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
  return <DeviceCtx.Provider
    value={{
      deviceId,
      status,
      setStatus,
      ch,
      setCh
    }}
  >{children}</DeviceCtx.Provider>;
}

export function useDevice() {
  const ctx = useContext(DeviceCtx);
  if (!ctx) throw new Error("useDevice must be used inside DeviceProvider");
  return ctx;
}
