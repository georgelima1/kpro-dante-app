import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";

// -------------------- TYPES --------------------

type ChannelStatus = {
  ch: number;
  name?: string;
  audio: { mute: boolean; gainDb: number; polarity: 1 | -1 };
  meters: { rmsDb: number; peakDb: number };
  delay: { enabled: boolean; valueSamples: number };
  flags: { clip: boolean; limit: boolean; protect: boolean; reason?: string };
  route?: { from: string; to?: string };
};

type DeviceStatus = {
  deviceId: string;
  fw: string;
  net: { wifi: string; lan: string };
  temps: { heatsink: number; board: number };
  rails: { vbat: number; vbus: number };
  powerOn: boolean;
  channelsCount: number;
  dsp: { sampleRate: number; delayMaxMs: number };
  channels: ChannelStatus[];
};

// -------------------- APP --------------------

const app = express();
app.use(cors());
app.use(express.json());

// -------------------- UTILS --------------------

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getCh(dev: DeviceStatus, ch: number) {
  const c = dev.channels.find((x) => x.ch === ch);
  if (!c) throw new Error("Channel not found");
  return c;
}

function maxSamples(dev: DeviceStatus) {
  return Math.round((dev.dsp.sampleRate * dev.dsp.delayMaxMs) / 1000);
}

function jitter(center: number, amp: number) {
  return center + (Math.random() * 2 - 1) * amp;
}

// -------------------- MOCK DEVICES --------------------

const DEVICES: Record<string, DeviceStatus> = {
  "SMX-KPRO-001": makeDevice("SMX-KPRO-001", 2),
  "SMX-KPRO-002": makeDevice("SMX-KPRO-002", 4)
};

function makeDevice(id: string, channelsCount: number): DeviceStatus {
  return {
    deviceId: id,
    fw: "0.1.0",
    net: { wifi: "192.168.4.1", lan: "10.10.1.1" },
    temps: { heatsink: 42.3, board: 38.8 },
    rails: { vbat: 12.6, vbus: 5.1 },
    powerOn: true,

    // 👇 vem do "hardware"
    dsp: {
      sampleRate: 48000,
      delayMaxMs: 100
    },

    channelsCount,

    channels: Array.from({ length: channelsCount }).map((_, i) => {
      const ch = i + 1;
      return {
        ch,
        name: `CH${ch}`,
        audio: { mute: false, gainDb: -24, polarity: 1 },
        meters: { rmsDb: -80, peakDb: -80 },

        // 👇 DELAY POR CANAL
        delay: {
          enabled: true,
          valueSamples: 0
        },

        flags: { clip: false, limit: false, protect: false, reason: "" },
        route: { from: "Input 1", to: `Out ${ch}` }
      };
    })
  };
}

// -------------------- REST --------------------

app.get("/api/v1/devices", (req, res) => {
  const list = Object.values(DEVICES).map((d) => ({
    id: d.deviceId,
    name: d.deviceId,
    model: "K Pro",
    ip: d.net.wifi,
    fw: d.fw,
    status: d.powerOn ? "ONLINE" : "OFF"
  }));
  res.json({ devices: list });
});

// 👇 STATUS (AGORA COM DSP + DELAY)
app.get("/api/v1/devices/:id/status", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });
  res.json(d);
});

// POWER
app.post("/api/v1/devices/:id/power", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });
  d.powerOn = !!req.body?.powerOn;
  res.json({ powerOn: d.powerOn });
});

// AUDIO
app.post("/api/v1/devices/:id/ch/:ch/audio", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const ch = d.channels.find((c) => c.ch === chNum);
  if (!ch) return res.status(404).json({ error: "channel not found" });

  const { mute, gainDb, polarity } = req.body ?? {};
  if (typeof mute === "boolean") ch.audio.mute = mute;
  if (typeof gainDb === "number") ch.audio.gainDb = clamp(gainDb, -48, 0);
  if (polarity === 1 || polarity === -1) ch.audio.polarity = polarity;

  res.json({ audio: ch.audio });
});

// -------------------- DELAY --------------------

// GET DELAY
app.get("/api/v1/devices/:id/ch/:ch/delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  let ch;
  try {
    ch = getCh(d, chNum);
  } catch {
    return res.status(404).json({ error: "channel not found" });
  }

  res.json({
    enabled: ch.delay.enabled,
    valueSamples: ch.delay.valueSamples,
    sampleRate: d.dsp.sampleRate,
    maxMs: d.dsp.delayMaxMs,
    maxSamples: maxSamples(d)
  });
});

// POST DELAY
app.post("/api/v1/devices/:id/ch/:ch/delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  let ch;
  try {
    ch = getCh(d, chNum);
  } catch {
    return res.status(404).json({ error: "channel not found" });
  }

  const maxS = maxSamples(d);

  if (typeof req.body.enabled === "boolean") {
    ch.delay.enabled = req.body.enabled;
  }

  if (typeof req.body.valueSamples === "number") {
    ch.delay.valueSamples = clamp(
      Math.round(req.body.valueSamples),
      0,
      maxS
    );
  }

  res.json({
    enabled: ch.delay.enabled,
    valueSamples: ch.delay.valueSamples,
    sampleRate: d.dsp.sampleRate,
    maxMs: d.dsp.delayMaxMs,
    maxSamples: maxS
  });
});

// -------------------- WS --------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "", "http://localhost");
  const deviceId = url.searchParams.get("deviceId") ?? "";
  const chParam = url.searchParams.get("ch");
  const d = DEVICES[deviceId];

  if (!d) {
    ws.close();
    return;
  }

  const chFilter = chParam ? Number(chParam) : null;

  const timer = setInterval(() => {
    const channelsToSend = chFilter
      ? d.channels.filter((c) => c.ch === chFilter)
      : d.channels;

    for (const c of channelsToSend) {
      const base = -28 + c.audio.gainDb / 3;
      const rms = jitter(base, 6);
      const peak = rms + Math.random() * 6;

      const clip = peak > 1.5;
      const limit = peak > -0.5 && peak <= 1.5;
      const protect = !d.powerOn;

      c.meters.rmsDb = rms;
      c.meters.peakDb = peak;
      c.flags.clip = clip;
      c.flags.limit = limit;
      c.flags.protect = protect;
      c.flags.reason = protect ? "POWER OFF" : "";

      ws.send(
        JSON.stringify({
          t: "vu",
          deviceId: d.deviceId,
          ch: c.ch,
          rmsDb: rms,
          peakDb: peak,
          clip,
          limit,
          protect,
          reason: c.flags.reason
        })
      );
    }
  }, 80);

  ws.on("close", () => clearInterval(timer));
});

// --------------------

const PORT = 8787;
server.listen(PORT, () => {
  console.log(`Mock server on http://localhost:${PORT}`);
});