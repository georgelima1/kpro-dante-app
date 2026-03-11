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
  filters: ChannelFilter[];
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
  input: InputPageState;
};

type FilterType =
  | "hpf"
  | "lpf"
  | "parametric"
  | "low_shelf"
  | "high_shelf"
  | "tilt_shelf"
  | "all_pass"
  | "band_pass"
  | "notch";

  type CrossoverFamily = "butterworth" | "linkwitz_riley" | "bessel";

  type ChannelFilter = {
    id: number;
    enabled: boolean;
    type: FilterType;
    freqHz: number;
    q: number;
    gainDb: number;
    slope?: 6 | 12 | 18 | 24 | 30 | 36 | 42 | 48;
    crossoverFamily?: CrossoverFamily;
  };

  type InputSourceType = "analog" | "dante";

type InputPriorityItem = {
  source: InputSourceType;
  thresholdDbu: number;
};

type InputChannelConfig = {
  inputCh: number;
  primarySource: InputSourceType;
  backupEnabled: boolean;
  backupSource: InputSourceType;
  thresholdDbu: number;
  priority: InputPriorityItem[];
};

type InputRouteCell = {
  inputCh: number;
  outputCh: number;
  gainDb: number;
  mute: boolean;
};

type InputPageState = {
  inputs: InputChannelConfig[];
  matrix: InputRouteCell[];
};

// -------------------- APP --------------------

const app = express();
app.use(cors());
app.use(express.json());

// -------------------- UTILS --------------------

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function clampFreq(v: number) {
  return clamp(v, 20, 20000);
}

function clampQ(v: number) {
  return clamp(v, 0.1, 10);
}

function clampGain(v: number) {
  return clamp(v, -24, 24);
}

function findFilter(ch: ChannelStatus, filterId: number) {
  return ch.filters.find((f) => f.id === filterId);
}

function jitter(center: number, amp: number) {
  return center + (Math.random() * 2 - 1) * amp;
}

function clampInputThreshold(v: number) {
  return clamp(v, -90, 0);
}

function clampMatrixGain(v: number) {
  return clamp(v, -120, 0);
}

function makeInputState(channelsCount: number): InputPageState {
  return {
    inputs: Array.from({ length: channelsCount }).map((_, i) => ({
      inputCh: i + 1,
      primarySource: i % 2 === 0 ? "analog" : "dante",
      backupEnabled: i % 2 === 0,
      backupSource: i % 2 === 0 ? "dante" : "analog",
      thresholdDbu: -60,
      priority: [
        { source: i % 2 === 0 ? "analog" : "dante", thresholdDbu: -60 },
        { source: i % 2 === 0 ? "dante" : "analog", thresholdDbu: -60 }
      ]
    })),
    matrix: Array.from({ length: channelsCount }).flatMap((_, inIdx) =>
      Array.from({ length: channelsCount }).map((__, outIdx) => ({
        inputCh: inIdx + 1,
        outputCh: outIdx + 1,
        gainDb: inIdx === outIdx ? 0 : -120,
        mute: false
      }))
    )
  };
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
        filters: makeDefaultFilters(),

        // 👇 DELAY POR CANAL
        delay: {
          enabled: true,
          valueSamples: 0
        },

        flags: { clip: false, limit: false, protect: false, reason: "" },
        route: { from: "Input 1", to: `Out ${ch}` }
      };
    }),
    input: makeInputState(channelsCount)
  };
}

function makeDefaultFilters(): ChannelFilter[] {
  return [
    {
      id: 1,
      enabled: true,
      type: "hpf",
      freqHz: 32,
      q: 0.7,
      gainDb: 0,
      slope: 24,
      crossoverFamily: "butterworth"
    },
    {
      id: 2,
      enabled: true,
      type: "tilt_shelf",
      freqHz: 63,
      q: 0.7,
      gainDb: -7.8
    },
    {
      id: 3,
      enabled: true,
      type: "parametric",
      freqHz: 125,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 4,
      enabled: true,
      type: "parametric",
      freqHz: 250,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 5,
      enabled: true,
      type: "parametric",
      freqHz: 500,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 6,
      enabled: true,
      type: "parametric",
      freqHz: 1000,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 7,
      enabled: true,
      type: "parametric",
      freqHz: 2000,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 8,
      enabled: true,
      type: "parametric",
      freqHz: 4000,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 9,
      enabled: true,
      type: "parametric",
      freqHz: 8000,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 10,
      enabled: true,
      type: "parametric",
      freqHz: 16000,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 11,
      enabled: true,
      type: "lpf",
      freqHz: 20000,
      q: 0.7,
      gainDb: 0,
      slope: 6,
      crossoverFamily: "butterworth"
    }
  ];
}

function makeInputStatus(channelsCount: number): string {
  return "teste";
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
app.post("/api/v1/devices/:id/ch/:ch/delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const ch = d.channels.find(c => c.ch === chNum);
  if (!ch) return res.status(404).json({ error: "channel not found" });

  const { enabled, valueSamples } = req.body ?? {};

  if (typeof enabled === "boolean") ch.delay.enabled = enabled;

  if (typeof valueSamples === "number") {
    // clamp pelo DSP
    const maxSamples = Math.round((d.dsp.sampleRate * d.dsp.delayMaxMs) / 1000);
    ch.delay.valueSamples = clamp(Math.round(valueSamples), 0, maxSamples);
  }

  res.json({ delay: ch.delay });
});

// opcional (mas útil): ler delay do canal
app.get("/api/v1/devices/:id/ch/:ch/delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const ch = d.channels.find(c => c.ch === chNum);
  if (!ch) return res.status(404).json({ error: "channel not found" });

  res.json({ delay: ch.delay });
});

// -------------------- FILTER --------------------

app.get("/api/v1/devices/:id/ch/:ch/filters", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  res.json({
    filters: channel.filters
  });
});

app.post("/api/v1/devices/:id/ch/:ch/filters/:filterId", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const filterId = Number(req.params.filterId);

  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  const filter = findFilter(channel, filterId);
  if (!filter) return res.status(404).json({ error: "filter not found" });

  const body = req.body ?? {};

  if (typeof body.enabled === "boolean") filter.enabled = body.enabled;

  if (typeof body.type === "string") {
    filter.type = body.type as FilterType;

    if (filter.type === "hpf" || filter.type === "lpf") {
      if (!filter.slope) filter.slope = 12;
      if (!filter.crossoverFamily) filter.crossoverFamily = "butterworth";
    } else {
      delete filter.slope;
      delete filter.crossoverFamily;
    }
  }

  if (typeof body.freqHz === "number") filter.freqHz = clampFreq(body.freqHz);
  if (typeof body.q === "number") filter.q = clampQ(body.q);
  if (typeof body.gainDb === "number") filter.gainDb = clampGain(body.gainDb);

  if (typeof body.slope === "number") {
    const allowed = [6, 12, 18, 24, 30, 36, 42, 48];
    if (allowed.includes(body.slope)) {
      filter.slope = body.slope as ChannelFilter["slope"];
    }
  }

  if (typeof body.crossoverFamily === "string") {
    const allowedFamilies = ["butterworth", "linkwitz_riley", "bessel"];
    if (allowedFamilies.includes(body.crossoverFamily)) {
      filter.crossoverFamily = body.crossoverFamily as CrossoverFamily;
    }
  }

  res.json({
    filter
  });
});

// -------------------- INPUT --------------------

// GET INPUT PAGE DATA
app.get("/api/v1/devices/:id/input", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  res.json(d.input);
});

// UPDATE INPUT SOURCE / BACKUP
app.post("/api/v1/devices/:id/input/:inputCh/source", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  const { primarySource, backupEnabled, backupSource, thresholdDbu } = req.body ?? {};

  if (primarySource === "analog" || primarySource === "dante") {
    input.primarySource = primarySource;
  }

  if (typeof backupEnabled === "boolean") {
    input.backupEnabled = backupEnabled;
  }

  if (backupSource === "analog" || backupSource === "dante") {
    input.backupSource = backupSource;
  }

  if (typeof thresholdDbu === "number") {
    input.thresholdDbu = clampInputThreshold(thresholdDbu);
  }

  input.priority = [
    { source: input.primarySource, thresholdDbu: input.thresholdDbu },
    { source: input.backupSource, thresholdDbu: input.thresholdDbu }
  ];

  res.json({ input });
});

// UPDATE MATRIX CELL
app.post("/api/v1/devices/:id/input/:inputCh/output/:outputCh", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const outputCh = Number(req.params.outputCh);

  const cell = d.input.matrix.find(
    (x) => x.inputCh === inputCh && x.outputCh === outputCh
  );
  if (!cell) return res.status(404).json({ error: "matrix cell not found" });

  const { gainDb, mute } = req.body ?? {};

  if (typeof gainDb === "number") {
    cell.gainDb = clampMatrixGain(gainDb);
  }

  if (typeof mute === "boolean") {
    cell.mute = mute;
  }

  res.json({ cell });
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

      const limit = peak > -0.5 && peak <= 1.5;
      const protect = !d.powerOn;

      c.meters.rmsDb = rms;
      c.meters.peakDb = peak;
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
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Mock server on http://0.0.0.0:${PORT}`);
});