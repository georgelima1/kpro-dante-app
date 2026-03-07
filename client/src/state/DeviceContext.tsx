import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FilterBand } from "../types/filters";

export type ChannelStatus = {
  ch: number;
  name?: string;
  audio: { mute: boolean; gainDb: number; polarity: 1 | -1 };
  meters: { rmsDb: number; peakDb: number };
  delay: { enabled: boolean; valueSamples: number };
  filters: FilterBand[];
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

  setFilterBand: (
    ch: number,
    bandId: number,
    data: Partial<FilterBand>
  ) => Promise<void>;

  applyFilterBand: (ch: number, bandId: number) => Promise<void>;
  applyAllFilters: (ch: number) => Promise<void>;
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

  const [ch, _setCh] = useState<number>(() => {
    const sp = new URLSearchParams(loc.search);
    return clampCh(sp.get("ch") ?? 1);
  });

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

  useEffect(() => {
    const sp = new URLSearchParams(loc.search);
    const next = clampCh(sp.get("ch") ?? 1);
    _setCh(next);
  }, [loc.search]);

  function setCh(next: number) {
    const n = clampCh(next);
    _setCh(n);

    const sp = new URLSearchParams(loc.search);
    sp.set("ch", String(n));

    nav(
      { pathname: loc.pathname, search: `?${sp.toString()}` },
      { replace: true }
    );
  }

  async function setFilterBand(
    channel: number,
    bandId: number,
    data: Partial<FilterBand>
  ) {
    await fetch(`/api/v1/devices/${deviceId}/ch/${channel}/filter/${bandId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    setStatus((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        channels: prev.channels.map((c) =>
          c.ch !== channel
            ? c
            : {
                ...c,
                filters: (c.filters ?? []).map((f) =>
                  f.id === bandId ? { ...f, ...data } : f
                )
              }
        )
      };
    });
  }

  async function applyFilterBand(channel: number, bandId: number) {
    await fetch(`/api/v1/devices/${deviceId}/ch/${channel}/filter/${bandId}/apply`, {
      method: "POST"
    });
  }

  async function applyAllFilters(channel: number) {
    await fetch(`/api/v1/devices/${deviceId}/ch/${channel}/filters/apply`, {
      method: "POST"
    });
  }

  const value = useMemo(
    () => ({
      deviceId,
      status,
      setStatus,
      ch,
      setCh,
      setFilterBand,
      applyFilterBand,
      applyAllFilters
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