import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";
import multer from "multer";

// -------------------- TYPES --------------------

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

type InputFilter = {
  id: number;
  enabled: boolean;
  type: FilterType;
  freqHz: number;
  q: number;
  gainDb: number;
  slope?: 6 | 12 | 18 | 24 | 30 | 36 | 42 | 48;
  crossoverFamily?: CrossoverFamily;
};

type FirState = {
  enabled: boolean;
  loaded: boolean;
  fileName?: string;
  taps?: number;
};

type ChannelStatus = {
  ch: number;
  name?: string;
  audio: { mute: boolean; gainDb: number; polarity: 1 | -1 };
  meters: { rmsDb: number; peakDb: number };
  delay: { enabled: boolean; valueSamples: number };
  filters: ChannelFilter[];
  speakerFilters: ChannelFilter[];
  speakerFir: FirState;
  flags: { clip: boolean; limit: boolean; protect: boolean; reason?: string };
  route?: { from: string; to?: string };
};

type PhysicalSource = "analog" | "dante";
type InputSourceMode = "analog" | "dante" | "failover";

type SourceProcessing = {
  trimDb: number;
  delay: {
    enabled: boolean;
    valueSamples: number;
  };
};

type FailoverConfig = {
  thresholdDbu: number;
  order: PhysicalSource[];
};

type InputChannelConfig = {
  inputCh: number;
  selectedSource: InputSourceMode;
  mute: boolean;
  analog: SourceProcessing;
  dante: SourceProcessing;
  failover: FailoverConfig;
  inputDelay: {
    enabled: boolean;
    valueSamples: number;
  };
  filters: InputFilter[];
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

// -------------------- APP --------------------

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

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

function clampInputThreshold(v: number) {
  return clamp(v, -90, 0);
}

function clampMatrixGain(v: number) {
  return clamp(v, -120, 0);
}

function jitter(center: number, amp: number) {
  return center + (Math.random() * 2 - 1) * amp;
}

function maxSamples(dev: DeviceStatus) {
  return Math.round((dev.dsp.sampleRate * dev.dsp.delayMaxMs) / 1000);
}

function findFilter(ch: ChannelStatus, filterId: number) {
  return ch.filters.find((f) => f.id === filterId);
}

function findInputFilter(input: InputChannelConfig, filterId: number) {
  return input.filters.find((f) => f.id === filterId);
}

// -------------------- DEFAULT DATA --------------------

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

function makeDefaultInputFilters(): InputFilter[] {
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
      type: "parametric",
      freqHz: 125,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 3,
      enabled: true,
      type: "parametric",
      freqHz: 500,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 4,
      enabled: true,
      type: "parametric",
      freqHz: 2000,
      q: 0.7,
      gainDb: 0
    },
    {
      id: 5,
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

function makeDefaultFir(): FirState {
  return {
    enabled: false,
    loaded: false,
    fileName: "",
    taps: 0
  };
}

function makeDefaultSpeakerFilters(): ChannelFilter[] {
  return makeDefaultFilters();
}

function makeInputState(channelsCount: number): InputPageState {
  return {
    inputs: Array.from({ length: channelsCount }).map((_, i) => ({
      inputCh: i + 1,
      selectedSource: i % 2 === 0 ? "analog" : "failover",
      mute: false,
      analog: {
        trimDb: 0,
        delay: {
          enabled: true,
          valueSamples: 0
        }
      },
      dante: {
        trimDb: -12,
        delay: {
          enabled: true,
          valueSamples: 211 // ~4.40 ms @ 48k
        }
      },
      failover: {
        thresholdDbu: -60,
        order: i % 2 === 0 ? ["analog", "dante"] : ["dante", "analog"]
      },
      inputDelay: {
        enabled: true,
        valueSamples: 0
      },
      filters: makeDefaultInputFilters()
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
        delay: {
          enabled: true,
          valueSamples: 0
        },
        speakerFilters: makeDefaultSpeakerFilters(),
        speakerFir: makeDefaultFir(),
        flags: { clip: false, limit: false, protect: false, reason: "" },
        route: { from: "Input 1", to: `Out ${ch}` }
      };
    }),
    input: makeInputState(channelsCount)
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

app.get("/api/v1/devices/:id/status", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });
  res.json(d);
});

// -------------------- POWER --------------------

app.post("/api/v1/devices/:id/power", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });
  d.powerOn = !!req.body?.powerOn;
  res.json({ powerOn: d.powerOn });
});

// -------------------- OUTPUT AUDIO --------------------

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

// -------------------- OUTPUT DELAY --------------------

app.post("/api/v1/devices/:id/ch/:ch/delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const ch = d.channels.find((c) => c.ch === chNum);
  if (!ch) return res.status(404).json({ error: "channel not found" });

  const { enabled, valueSamples } = req.body ?? {};

  if (typeof enabled === "boolean") ch.delay.enabled = enabled;
  if (typeof valueSamples === "number") {
    ch.delay.valueSamples = clamp(Math.round(valueSamples), 0, maxSamples(d));
  }

  res.json({ delay: ch.delay });
});

app.get("/api/v1/devices/:id/ch/:ch/delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const ch = d.channels.find((c) => c.ch === chNum);
  if (!ch) return res.status(404).json({ error: "channel not found" });

  res.json({ delay: ch.delay });
});

// -------------------- OUTPUT FILTERS --------------------

app.get("/api/v1/devices/:id/ch/:ch/filters", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  res.json({ filters: channel.filters });
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

  res.json({ filter });
});

// -------------------- INPUT PAGE --------------------

app.get("/api/v1/devices/:id/input", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });
  res.json(d.input);
});

// -------------------- INPUT META --------------------

app.post("/api/v1/devices/:id/input/:inputCh/meta", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  const { selectedSource, mute } = req.body ?? {};

  if (selectedSource === "analog" || selectedSource === "dante" || selectedSource === "failover") {
    input.selectedSource = selectedSource;
  }

  if (typeof mute === "boolean") {
    input.mute = mute;
  }

  res.json({ input });
});

// -------------------- INPUT SOURCE PROCESSING --------------------

app.post("/api/v1/devices/:id/input/:inputCh/source/:sourceKey", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const sourceKey = req.params.sourceKey as "analog" | "dante";

  if (sourceKey !== "analog" && sourceKey !== "dante") {
    return res.status(400).json({ error: "invalid sourceKey" });
  }

  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  const body = req.body ?? {};
  const target = input[sourceKey];

  if (typeof body.trimDb === "number") {
    target.trimDb = clamp(body.trimDb, -24, 24);
  }

  if (body.delay && typeof body.delay === "object") {
    if (typeof body.delay.enabled === "boolean") {
      target.delay.enabled = body.delay.enabled;
    }
    if (typeof body.delay.valueSamples === "number") {
      target.delay.valueSamples = clamp(Math.round(body.delay.valueSamples), 0, maxSamples(d));
    }
  }

  res.json({ input });
});

// -------------------- INPUT FAILOVER --------------------

app.post("/api/v1/devices/:id/input/:inputCh/failover", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  const { thresholdDbu, order } = req.body ?? {};

  if (typeof thresholdDbu === "number") {
    input.failover.thresholdDbu = clampInputThreshold(thresholdDbu);
  }

  if (
    Array.isArray(order) &&
    order.length === 2 &&
    order.includes("analog") &&
    order.includes("dante")
  ) {
    input.failover.order = order as PhysicalSource[];
  }

  res.json({ input });
});

// -------------------- INPUT DELAY --------------------

app.get("/api/v1/devices/:id/input/:inputCh/input-delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  res.json({ inputDelay: input.inputDelay });
});

app.post("/api/v1/devices/:id/input/:inputCh/input-delay", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  const { enabled, valueSamples } = req.body ?? {};

  if (typeof enabled === "boolean") {
    input.inputDelay.enabled = enabled;
  }

  if (typeof valueSamples === "number") {
    input.inputDelay.valueSamples = clamp(Math.round(valueSamples), 0, maxSamples(d));
  }

  res.json({ input });
});

// -------------------- INPUT FILTERS --------------------

app.get("/api/v1/devices/:id/input/:inputCh/filters", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  res.json({ filters: input.filters });
});

app.post("/api/v1/devices/:id/input/:inputCh/filters/:filterId", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const inputCh = Number(req.params.inputCh);
  const filterId = Number(req.params.filterId);

  const input = d.input.inputs.find((x) => x.inputCh === inputCh);
  if (!input) return res.status(404).json({ error: "input channel not found" });

  const filter = findInputFilter(input, filterId);
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
      filter.slope = body.slope as InputFilter["slope"];
    }
  }

  if (typeof body.crossoverFamily === "string") {
    const allowedFamilies = ["butterworth", "linkwitz_riley", "bessel"];
    if (allowedFamilies.includes(body.crossoverFamily)) {
      filter.crossoverFamily = body.crossoverFamily as CrossoverFamily;
    }
  }

  res.json({ filter });
});

// -------------------- INPUT MATRIX --------------------

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

// -------------- SPEAKER FILTERS --------------

// -------------- SPEAKER FILTERS --------------

app.get("/api/v1/devices/:id/ch/:ch/speaker/filters", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  res.json({
    filters: channel.speakerFilters
  });
});

app.post("/api/v1/devices/:id/ch/:ch/speaker/filters/:filterId", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const filterId = Number(req.params.filterId);

  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  const filter = channel.speakerFilters.find((f) => f.id === filterId);
  if (!filter) return res.status(404).json({ error: "filter not found" });

  const body = req.body ?? {};

  if (typeof body.enabled === "boolean") filter.enabled = body.enabled;

  if (typeof body.type === "string") {
    filter.type = body.type;

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

  res.json({ filter });
});

// -------------------- FIR --------------------

app.get("/api/v1/devices/:id/ch/:ch/fir", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  res.json({
    speakerFir: channel.speakerFir ?? makeDefaultFir()
  });
});

app.post("/api/v1/devices/:id/ch/:ch/fir", (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  if (!channel.speakerFir) {
    channel.speakerFir = makeDefaultFir();
  }

  const body = req.body ?? {};

  if (typeof body.enabled === "boolean") {
    channel.speakerFir.enabled = body.enabled;
  }

  if (typeof body.loaded === "boolean") {
    channel.speakerFir.loaded = body.loaded;
  }

  if (typeof body.fileName === "string") {
    channel.speakerFir.fileName = body.fileName;
  }

  if (typeof body.taps === "number") {
    channel.speakerFir.taps = Math.max(0, Math.round(body.taps));
  }

  res.json({ speakerFir: channel.speakerFir });
});

app.post("/api/v1/devices/:id/ch/:ch/fir/upload", upload.single("file"), (req, res) => {
  const d = DEVICES[req.params.id];
  if (!d) return res.status(404).json({ error: "device not found" });

  const chNum = Number(req.params.ch);
  const channel = d.channels.find((c) => c.ch === chNum);
  if (!channel) return res.status(404).json({ error: "channel not found" });

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "file not provided" });
  }

  const text = file.buffer.toString("utf-8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return res.status(400).json({ error: "empty file" });
  }

  if (lines.length > 512) {
    return res.status(400).json({ error: "maximum 512 coefficients" });
  }

  channel.speakerFir.loaded = true;
  channel.speakerFir.fileName = file.originalname;
  channel.speakerFir.taps = lines.length;

  res.json({ speakerFir: channel.speakerFir });
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