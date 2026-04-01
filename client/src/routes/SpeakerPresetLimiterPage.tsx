import React, { useEffect, useMemo, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import { API_BASE } from "../config/endpoints";
import SpeakerPresetLocked from "../ui/SpeakerPresetLocked";

type PeakLimiterMode = "auto" | "manual";

const PEAK_RMS_RATIO = 1.4142;

type PeakLimiterState = {
  mode: PeakLimiterMode;
  thresholdVpeak: number;
  attackMs: number;
  holdMs: number;
  releaseMs: number;
  kneeDb: number;
};

type RmsLimiterState = {
  enabled: boolean;
  thresholdVrms: number;
  attackMs: number;
  holdMs: number;
  releaseMs: number;
  kneeDb: number;
};

type SpeakerLimiterState = {
  peak: PeakLimiterState;
  rms: RmsLimiterState;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function fmtNumber(value: number, digits = 1) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function clampPeakByRms(peak: number, rms: number) {
  return Math.max(peak, rms * PEAK_RMS_RATIO);
}

function clampRmsByPeak(rms: number, peak: number) {
  return Math.min(rms, peak / PEAK_RMS_RATIO);
}

const DEFAULT_LIMITER: SpeakerLimiterState = {
  peak: {
    mode: "manual",
    thresholdVpeak: 63.6,
    attackMs: 1.0,
    holdMs: 0.0,
    releaseMs: 10.0,
    kneeDb: 0.0
  },
  rms: {
    enabled: false,
    thresholdVrms: 45.0,
    attackMs: 250.0,
    holdMs: 0.0,
    releaseMs: 400,
    kneeDb: 0.0
  }
};

export default function SpeakerPresetLimiterPage() {
  const { status, deviceId, ch } = useDevice();

  const [data, setData] = useState<SpeakerLimiterState>(DEFAULT_LIMITER);

  const channel = status?.channels?.find((c) => c.ch === ch);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!deviceId || !ch) return;

      try {
        const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/limiter`);
        const j = await r.json();

        if (!alive) return;

        setData({
          peak: {
            ...DEFAULT_LIMITER.peak,
            ...(j.limiter?.peak ?? {})
          },
          rms: {
            ...DEFAULT_LIMITER.rms,
            ...(j.limiter?.rms ?? {})
          }
        });
      } catch {
        if (!alive) return;
        setData(DEFAULT_LIMITER);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [deviceId, ch]);

  if (!status || !channel) return null;

  if (channel.speakerPreset?.locked) {
    return (
      <SpeakerPresetLocked
        title="Preset Locked"
        message="This manufacturer preset is protected. Limiter settings cannot be viewed or edited."
      />
    );
  }

  async function updateLimiter(patch: Partial<SpeakerLimiterState>) {
    if (!deviceId || !ch) return;

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/limiter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });

    const j = await r.json();

    setData({
      peak: {
        ...DEFAULT_LIMITER.peak,
        ...(j.limiter?.peak ?? {})
      },
      rms: {
        ...DEFAULT_LIMITER.rms,
        ...(j.limiter?.rms ?? {})
      }
    });
  }

  function updateLocalPeak(patch: Partial<PeakLimiterState>) {
    setData((prev) => ({
      ...prev,
      peak: {
        ...prev.peak,
        ...patch
      }
    }));
  }

  function updateLocalRms(patch: Partial<RmsLimiterState>) {
    setData((prev) => ({
      ...prev,
      rms: {
        ...prev.rms,
        ...patch
      }
    }));
  }

  function updatePeakThresholdLinked(nextPeak: number) {
    const clampedPeak = clamp(nextPeak, 1, 200);
    const maxRmsAllowed = clampedPeak / PEAK_RMS_RATIO;

    const nextRms = clampRmsByPeak(data.rms.thresholdVrms, clampedPeak);

    setData((prev) => ({
      ...prev,
      peak: {
        ...prev.peak,
        thresholdVpeak: clampedPeak
      },
      rms: {
        ...prev.rms,
        thresholdVrms: nextRms
      }
    }));
  }

  async function commitPeakThresholdLinked(nextPeak: number) {
    const clampedPeak = clamp(nextPeak, 1, 200);
    const nextRms = clampRmsByPeak(data.rms.thresholdVrms, clampedPeak);

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/limiter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peak: {
          ...data.peak,
          thresholdVpeak: clampedPeak
        },
        rms: {
          ...data.rms,
          thresholdVrms: nextRms
        }
      })
    });

    const j = await r.json();

    setData({
      peak: {
        ...DEFAULT_LIMITER.peak,
        ...(j.limiter?.peak ?? {})
      },
      rms: {
        ...DEFAULT_LIMITER.rms,
        ...(j.limiter?.rms ?? {})
      }
    });
  }

  function updateRmsThresholdLinked(nextRms: number) {
    const clampedRms = clamp(nextRms, 1, 150);
    const nextPeak = clampPeakByRms(data.peak.thresholdVpeak, clampedRms);

    setData((prev) => ({
      ...prev,
      rms: {
        ...prev.rms,
        thresholdVrms: clampedRms
      },
      peak: {
        ...prev.peak,
        thresholdVpeak: nextPeak
      }
    }));
  }

  async function commitRmsThresholdLinked(nextRms: number) {
    const clampedRms = clamp(nextRms, 1, 150);
    const nextPeak = clampPeakByRms(data.peak.thresholdVpeak, clampedRms);

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/limiter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rms: {
          ...data.rms,
          thresholdVrms: clampedRms
        },
        peak: {
          ...data.peak,
          thresholdVpeak: nextPeak
        }
      })
    });

    const j = await r.json();

    setData({
      peak: {
        ...DEFAULT_LIMITER.peak,
        ...(j.limiter?.peak ?? {})
      },
      rms: {
        ...DEFAULT_LIMITER.rms,
        ...(j.limiter?.rms ?? {})
      }
    });
  }

  async function commitPeak(patch: Partial<PeakLimiterState>) {
    await updateLimiter({
      peak: {
        ...data.peak,
        ...patch
      }
    });
  }

  async function commitRms(patch: Partial<RmsLimiterState>) {
    await updateLimiter({
      rms: {
        ...data.rms,
        ...patch
      }
    });
  }

  if (!status || !channel) return null;

  return (
    <div className="max-w-7xl space-y-4">
      <LimiterSection
        title="Peak Limiter"
        icon="speed"
        headerRight={
          <div className="flex gap-2">
            <TabButton
              active={data.peak.mode === "auto"}
              label="Auto"
              onClick={() => {
                updateLocalPeak({ mode: "auto" });
                commitPeak({ mode: "auto" });
              }}
            />
            <TabButton
              active={data.peak.mode === "manual"}
              label="Manual"
              onClick={() => {
                updateLocalPeak({ mode: "manual" });
                commitPeak({ mode: "manual" });
              }}
            />
          </div>
        }
      >
        <LimiterSliderRow
          label="Threshold"
          unit="Vpeak"
          min={1}
          max={200}
          step={0.1}
          value={data.peak.thresholdVpeak}
          onChange={updatePeakThresholdLinked}
          onCommit={commitPeakThresholdLinked}
        />

        {data.peak.mode === "manual" && (
          <>
            <LimiterValueRow
              label="Attack Time"
              unit="ms"
              min={0}
              max={100}
              step={0.1}
              value={data.peak.attackMs}
              onChange={(v) => updateLocalPeak({ attackMs: v })}
              onCommit={(v) => commitPeak({ attackMs: v })}
            />

            <LimiterValueRow
              label="Hold Time"
              unit="ms"
              min={0}
              max={1000}
              step={0.1}
              value={data.peak.holdMs}
              onChange={(v) => updateLocalPeak({ holdMs: v })}
              onCommit={(v) => commitPeak({ holdMs: v })}
            />

            <LimiterValueRow
              label="Release Time"
              unit="ms"
              min={1}
              max={1000}
              step={1}
              value={data.peak.releaseMs}
              onChange={(v) => updateLocalPeak({ releaseMs: v })}
              onCommit={(v) => commitPeak({ releaseMs: v })}
            />

            <LimiterValueRow
              label="Knee"
              unit="dB"
              min={0}
              max={24}
              step={0.1}
              value={data.peak.kneeDb}
              onChange={(v) => updateLocalPeak({ kneeDb: v })}
              onCommit={(v) => commitPeak({ kneeDb: v })}
            />
          </>
        )}
      </LimiterSection>

      <LimiterSection
        title="Rms Limiter"
        icon="graphic_eq"
        headerRight={
          <button
            onClick={() => {
              updateLocalRms({ enabled: !data.rms.enabled });
              commitRms({ enabled: !data.rms.enabled });
            }}
            className={`relative w-12 h-6 rounded-full border transition ${data.rms.enabled
              ? "bg-smx-red/30 border-smx-red/50"
              : "bg-smx-panel2 border-smx-line"
              }`}
            aria-label="RMS On/Off"
            title="RMS On/Off"
            type="button"
          >
            <span
              className={`absolute top-[0.07rem] left-[0.05rem] w-5 h-5 rounded-full transition-transform ${data.rms.enabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"
                }`}
            />
          </button>
        }
      >
        <div className={data.rms.enabled ? "space-y-3" : "opacity-45 grayscale pointer-events-none select-none space-y-3"}>
          <LimiterSliderRow
            label="Threshold"
            unit="Vrms"
            min={1}
            max={150}
            step={0.1}
            value={data.rms.thresholdVrms}
            onChange={updateRmsThresholdLinked}
            onCommit={commitRmsThresholdLinked}
          />

          <LimiterValueRow
            label="Attack Time"
            unit="ms"
            min={0}
            max={10000}
            step={0.1}
            value={data.rms.attackMs}
            onChange={(v) => updateLocalRms({ attackMs: v })}
            onCommit={(v) => commitRms({ attackMs: v })}
          />

          <LimiterValueRow
            label="Hold Time"
            unit="ms"
            min={0}
            max={10000}
            step={0.1}
            value={data.rms.holdMs}
            onChange={(v) => updateLocalRms({ holdMs: v })}
            onCommit={(v) => commitRms({ holdMs: v })}
          />

          <LimiterValueRow
            label="Release Time"
            unit="ms"
            min={1}
            max={20000}
            step={1}
            value={data.rms.releaseMs}
            onChange={(v) => updateLocalRms({ releaseMs: v })}
            onCommit={(v) => commitRms({ releaseMs: v })}
          />

          <LimiterValueRow
            label="Knee"
            unit="dB"
            min={0}
            max={24}
            step={0.1}
            value={data.rms.kneeDb}
            onChange={(v) => updateLocalRms({ kneeDb: v })}
            onCommit={(v) => commitRms({ kneeDb: v })}
          />
        </div>
      </LimiterSection>
    </div>
  );
}

function LimiterSection({
  title,
  icon,
  headerRight,
  children
}: {
  title: string;
  icon: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconGlyph name={icon} />
          <div className="text-base font-semibold">{title}</div>
        </div>
        {headerRight}
      </div>

      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

function TabButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 h-10 rounded-xl border text-sm font-semibold transition active:scale-95 ${active
        ? "bg-smx-red/20 border-smx-red/40 text-white"
        : "bg-smx-panel2 border-smx-line text-smx-muted hover:border-smx-red/30"
        }`}
    >
      {label}
    </button>
  );
}

function LimiterSliderRow({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  onCommit
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  const [text, setText] = React.useState(String(value).replace(".", ","));
  const draftRef = React.useRef(value);
  const draggingRef = React.useRef(false);

  React.useEffect(() => {
    if (!draggingRef.current) {
      setDraft(value);
      draftRef.current = value;
      setText(fmtNumber(value, 1));
    }
  }, [value]);

  const fillPct = React.useMemo(
    () => ((draft - min) / (max - min)) * 100,
    [draft, min, max]
  );

  function setLocal(next: number) {
    const clamped = clamp(next, min, max);
    draftRef.current = clamped;
    setDraft(clamped);
    setText(fmtNumber(clamped, 1));
    onChange(clamped);
  }

  function commitNow(next?: number) {
    const finalValue = clamp(next ?? draftRef.current, min, max);
    draftRef.current = finalValue;
    setDraft(finalValue);
    setText(fmtNumber(finalValue, 1));
    onChange(finalValue);
    onCommit(finalValue);
  }

  function nudge(delta: number) {
    const next = clamp(draftRef.current + delta, min, max);
    setLocal(next);
  }

  return (
    <div className="bg-smx-panel2 border border-smx-line rounded-xl p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm md:text-xs text-smx-muted">{label}</div>
          <div className="text-white font-semibold">
            {fmtNumber(draft, 1)} {unit}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowBtn
            onStep={() => nudge(-step)}
            onStepCommitEnd={() => commitNow()}
          >
            ▼
          </ArrowBtn>

          <ManualInput
            value={text}
            onChange={setText}
            onCommit={() => {
              const next = Number(text.replace(",", "."));
              if (!Number.isNaN(next)) {
                commitNow(next);
              } else {
                setText(fmtNumber(draftRef.current, 1));
              }
            }}
          />

          <ArrowBtn
            onStep={() => nudge(step)}
            onStepCommitEnd={() => commitNow()}
          >
            ▲
          </ArrowBtn>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onChange={(e) => {
          const next = Number(e.target.value);
          setLocal(next);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          const next = Number((e.target as HTMLInputElement).value);
          commitNow(next);
        }}
        className="w-full smx-range smx-range-fill smx-range-red"
        style={{
          ["--fill" as any]: `${fillPct}%`
        }}
      />
    </div>
  );
}

function LimiterValueRow({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  onCommit
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  const [text, setText] = React.useState(fmtNumber(value, 1));
  const draftRef = React.useRef(value);

  React.useEffect(() => {
    setDraft(value);
    draftRef.current = value;
    setText(fmtNumber(value, 1));
  }, [value]);

  function setLocal(next: number) {
    const clamped = clamp(next, min, max);
    draftRef.current = clamped;
    setDraft(clamped);
    setText(fmtNumber(clamped, 1));
    onChange(clamped);
  }

  function commitNow(next?: number) {
    const finalValue = clamp(next ?? draftRef.current, min, max);
    draftRef.current = finalValue;
    setDraft(finalValue);
    setText(fmtNumber(finalValue, 1));
    onChange(finalValue);
    onCommit(finalValue);
  }

  function nudge(delta: number) {
    const next = clamp(draftRef.current + delta, min, max);
    setLocal(next);
  }

  return (
    <div className="bg-smx-panel2 border border-smx-line rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm md:text-xs text-smx-muted">{label}</div>
          <div className="text-white font-semibold">
            {fmtNumber(draft, 1)} {unit}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowBtn
            onStep={() => nudge(-step)}
            onStepCommitEnd={() => commitNow()}
          >
            ▼
          </ArrowBtn>

          <ManualInput
            value={text}
            onChange={setText}
            onCommit={() => {
              const next = Number(text.replace(",", "."));
              if (!Number.isNaN(next)) {
                commitNow(next);
              } else {
                setText(fmtNumber(draftRef.current, 1));
              }
            }}
          />

          <ArrowBtn
            onStep={() => nudge(step)}
            onStepCommitEnd={() => commitNow()}
          >
            ▲
          </ArrowBtn>
        </div>
      </div>
    </div>
  );
}

function ArrowBtn({
  children,
  onStep,
  onStepCommitEnd
}: {
  children: React.ReactNode;
  onStep: () => void;
  onStepCommitEnd?: () => void;
}) {
  const timeoutRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const pressingRef = React.useRef(false);

  const clearTimers = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopPress = React.useCallback(() => {
    if (!pressingRef.current) return;
    pressingRef.current = false;
    clearTimers();
    onStepCommitEnd?.();
  }, [clearTimers, onStepCommitEnd]);

  React.useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        pressingRef.current = true;

        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch { }

        clearTimers();

        onStep(); // primeiro passo imediato

        timeoutRef.current = window.setTimeout(() => {
          intervalRef.current = window.setInterval(() => {
            if (pressingRef.current) onStep();
          }, 60);
        }, 250);
      }}
      onPointerUp={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch { }
        stopPress();
      }}
      onPointerCancel={stopPress}
      onPointerLeave={() => {
        // se estiver com pointer capture, continua repetindo normalmente
      }}
      className="w-10 h-10 rounded-2xl border bg-smx-panel border-smx-line hover:border-smx-red/40 transition active:scale-95 grid place-items-center text-white select-none touch-none"
    >
      {children}
    </button>
  );
}

function ManualInput({
  value,
  onChange,
  onCommit
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onCommit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-[64px] h-10 rounded-xl border border-smx-line bg-smx-panel px-3 text-sm text-white text-right outline-none focus:border-smx-red/40"
    />
  );
}

function IconGlyph({ name }: { name: string }) {
  return (
    <span
      className="material-symbols-outlined leading-none text-white"
      style={{
        fontSize: 20,
        fontVariationSettings: `"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24`
      }}
    >
      {name}
    </span>
  );
}