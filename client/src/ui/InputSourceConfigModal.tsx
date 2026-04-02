import React from "react";
import Select from "./Select";
import type {
  FailoverConfig,
  InputChannelConfig,
  SourceChannel,
  SourceProcessing,
  SourceRef,
  SourceType
} from "../routes/InputPage";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function samplesToMs(samples: number, sampleRate: number) {
  return (samples / sampleRate) * 1000;
}

function msToSamples(ms: number, sampleRate: number) {
  return Math.round((ms / 1000) * sampleRate);
}

export default function InputSourceConfigModal({
  input,
  sampleRate,
  delayMaxMs,
  onClose,
  onSourceRouteChange,
  onSourceProcessingChange,
  onFailoverChange
}: {
  input: InputChannelConfig;
  sampleRate: number;
  delayMaxMs: number;
  onClose: () => void;
  onSourceRouteChange: (
    sourceType: SourceType,
    patch: { selectedChannel?: SourceChannel }
  ) => void;
  onSourceProcessingChange: (
    sourceType: SourceType,
    sourceChannel: SourceChannel,
    patch: Partial<SourceProcessing>
  ) => void;
  onFailoverChange: (patch: Partial<FailoverConfig>) => void;
}) {
  const [draft, setDraft] = React.useState<InputChannelConfig>(input);

  React.useEffect(() => {
    setDraft(input);
  }, [input]);

  const analogProc =
    draft.analog.selectedChannel === 1 ? draft.analog.ch1 : draft.analog.ch2;

  const danteProc =
    draft.dante.selectedChannel === 1 ? draft.dante.ch1 : draft.dante.ch2;

  function updateDraftSourceRoute(
    sourceType: SourceType,
    patch: { selectedChannel?: SourceChannel }
  ) {
    setDraft((prev) => ({
      ...prev,
      [sourceType]: {
        ...prev[sourceType],
        ...patch
      }
    }));
  }

  function updateDraftSourceProcessing(
    sourceType: SourceType,
    sourceChannel: SourceChannel,
    patch: Partial<SourceProcessing>
  ) {
    setDraft((prev) => {
      const bank = prev[sourceType];
      const key = sourceChannel === 1 ? "ch1" : "ch2";

      return {
        ...prev,
        [sourceType]: {
          ...bank,
          [key]: {
            ...bank[key],
            ...patch
          }
        }
      };
    });
  }

  function updateDraftFailover(patch: Partial<FailoverConfig>) {
    setDraft((prev) => ({
      ...prev,
      failover: {
        ...prev.failover,
        ...patch
      }
    }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="w-full md:max-w-[980px] max-h-[88vh] md:max-h-[85vh] overflow-hidden rounded-t-2xl md:rounded-2xl border border-smx-line bg-smx-panel shadow-2xl">
        <div className="px-4 md:px-5 py-3 border-b border-smx-line flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Source</div>
            <div className="text-sm md:text-xs text-smx-muted">IN {input.inputCh}</div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-2xl border border-smx-line bg-smx-panel2 text-white hover:border-smx-red/30 transition shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 md:p-5 overflow-y-auto max-h-[calc(85vh-72px)]">
          <div className="grid grid-cols-1 min-[700px]:grid-cols-3 gap-4">
            <SourceCard
              title="Analog"
              sourceType="analog"
              selectedChannel={draft.analog.selectedChannel}
              proc={analogProc}
              sampleRate={sampleRate}
              delayMaxMs={delayMaxMs}
              onLocalRouteChange={updateDraftSourceRoute}
              onCommitRouteChange={onSourceRouteChange}
              onLocalProcessingChange={updateDraftSourceProcessing}
              onCommitProcessingChange={onSourceProcessingChange}
            />

            <SourceCard
              title="Dante"
              sourceType="dante"
              selectedChannel={draft.dante.selectedChannel}
              proc={danteProc}
              sampleRate={sampleRate}
              delayMaxMs={delayMaxMs}
              onLocalRouteChange={updateDraftSourceRoute}
              onCommitRouteChange={onSourceRouteChange}
              onLocalProcessingChange={updateDraftSourceProcessing}
              onCommitProcessingChange={onSourceProcessingChange}
            />

            <FailoverCard
              failover={draft.failover}
              onLocalChange={updateDraftFailover}
              onCommitChange={onFailoverChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceCard({
  title,
  sourceType,
  selectedChannel,
  proc,
  sampleRate,
  delayMaxMs,
  onLocalRouteChange,
  onCommitRouteChange,
  onLocalProcessingChange,
  onCommitProcessingChange
}: {
  title: string;
  sourceType: SourceType;
  selectedChannel: SourceChannel;
  proc: SourceProcessing;
  sampleRate: number;
  delayMaxMs: number;
  onLocalRouteChange: (
    sourceType: SourceType,
    patch: { selectedChannel?: SourceChannel }
  ) => void;
  onCommitRouteChange: (
    sourceType: SourceType,
    patch: { selectedChannel?: SourceChannel }
  ) => void;
  onLocalProcessingChange: (
    sourceType: SourceType,
    sourceChannel: SourceChannel,
    patch: Partial<SourceProcessing>
  ) => void;
  onCommitProcessingChange: (
    sourceType: SourceType,
    sourceChannel: SourceChannel,
    patch: Partial<SourceProcessing>
  ) => void;
}) {
  const delayMs = samplesToMs(proc.delay.valueSamples, sampleRate);

  return (
    <div className="rounded-2xl border border-smx-line bg-black/10 p-4 space-y-5">
      <Select
        label={title}
        value={String(selectedChannel)}
        options={[
          { value: "1", label: `${title} 1` },
          { value: "2", label: `${title} 2` }
        ]}
        onChange={(value) => {
          const nextChannel = Number(value) as SourceChannel;
          onLocalRouteChange(sourceType, { selectedChannel: nextChannel });
          onCommitRouteChange(sourceType, { selectedChannel: nextChannel });
        }}
      />

      <InputSourceSliderRow
        label="Trim"
        unit="dB"
        min={-24}
        max={24}
        step={0.1}
        value={proc.trimDb}
        onChange={(v) =>
          onLocalProcessingChange(sourceType, selectedChannel, {
            trimDb: v
          })
        }
        onCommit={(v) =>
          onCommitProcessingChange(sourceType, selectedChannel, {
            trimDb: v
          })
        }
      />

      <InputSourceSliderRow
        label="Delay"
        unit="ms"
        min={0}
        max={delayMaxMs}
        step={0.01}
        value={delayMs}
        onChange={(v) =>
          onLocalProcessingChange(sourceType, selectedChannel, {
            delay: {
              ...proc.delay,
              valueSamples: msToSamples(v, sampleRate)
            }
          })
        }
        onCommit={(v) =>
          onCommitProcessingChange(sourceType, selectedChannel, {
            delay: {
              ...proc.delay,
              valueSamples: msToSamples(v, sampleRate)
            }
          })
        }
      />
    </div>
  );
}

function FailoverCard({
  failover,
  onLocalChange,
  onCommitChange
}: {
  failover: FailoverConfig;
  onLocalChange: (patch: Partial<FailoverConfig>) => void;
  onCommitChange: (patch: Partial<FailoverConfig>) => void;
}) {
  const first = failover.order[0];
  const second = failover.order[1];

  return (
    <div className="rounded-2xl border border-green-600/80 bg-black/10 p-4 space-y-5">
      <div className="text-base font-semibold">Failover</div>

      <div className="grid grid-cols-1 gap-3">
        <Select
          label="Priority 1"
          value={encodeRef(first)}
          options={sourceRefOptions()}
          onChange={(value) => {
            const nextFirst = decodeRef(value);
            const currentSecond = second;
            if (currentSecond && encodeRef(currentSecond) === value) return;

            const patch = {
              order: [nextFirst, currentSecond ?? fallbackSecond(nextFirst)] as SourceRef[]
            };

            onLocalChange(patch);
            onCommitChange(patch);
          }}
        />

        <Select
          label="Priority 2"
          value={encodeRef(second)}
          options={sourceRefOptions()}
          onChange={(value) => {
            const nextSecond = decodeRef(value);
            const currentSecond = second;
            if (currentSecond && encodeRef(currentSecond) === value) return;

            const patch = {
              order: [nextSecond, currentSecond ?? fallbackSecond(nextSecond)] as SourceRef[]
            };

            onLocalChange(patch);
            onCommitChange(patch);
          }}
        />
      </div>

      <InputSourceSliderRow
        label="Threshold"
        unit="dBu"
        min={-90}
        max={0}
        step={1}
        value={failover.thresholdDbu}
        onChange={(v) => onLocalChange({ thresholdDbu: clamp(v, -90, 0) })}
        onCommit={(v) => onCommitChange({ thresholdDbu: clamp(v, -90, 0) })}
      />
    </div>
  );
}

function encodeRef(ref?: SourceRef) {
  if (!ref) return "";
  return `${ref.type}:${ref.channel}`;
}

function decodeRef(value: string): SourceRef {
  const [type, channel] = value.split(":");
  return {
    type: type as SourceType,
    channel: Number(channel) as SourceChannel
  };
}

function sourceRefLabel(ref?: SourceRef) {
  if (!ref) return "—";
  return `${ref.type === "analog" ? "Analog" : "Dante"} ${ref.channel}`;
}

function sourceRefOptions() {
  return [
    { value: "analog:1", label: "Analog 1" },
    { value: "analog:2", label: "Analog 2" },
    { value: "dante:1", label: "Dante 1" },
    { value: "dante:2", label: "Dante 2" }
  ];
}

function fallbackSecond(first: SourceRef): SourceRef {
  if (first.type === "analog") {
    return { type: "dante", channel: 1 };
  }
  return { type: "analog", channel: 1 };
}

function fallbackFirst(second: SourceRef): SourceRef {
  if (second.type === "analog") {
    return { type: "dante", channel: 1 };
  }
  return { type: "analog", channel: 1 };
}

function fmtNumber(value: number, digits = 1) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function InputSourceSliderRow({
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
      setText(fmtNumber(value, unit === "dBu" ? 0 : unit === "ms" ? 2 : 1));
    }
  }, [value, unit]);

  const fillPct = React.useMemo(
    () => ((draft - min) / (max - min)) * 100,
    [draft, min, max]
  );

  function setLocal(next: number) {
    const clamped = clamp(next, min, max);
    draftRef.current = clamped;
    setDraft(clamped);
    setText(fmtNumber(clamped, unit === "dBu" ? 0 : unit === "ms" ? 2 : 1));
    onChange(clamped);
  }

  function commitNow(next?: number) {
    const finalValue = clamp(next ?? draftRef.current, min, max);
    draftRef.current = finalValue;
    setDraft(finalValue);
    setText(fmtNumber(finalValue, unit === "dBu" ? 0 : unit === "ms" ? 2 : 1));
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
                setText(fmtNumber(draftRef.current, unit === "dBu" ? 0 : unit === "ms" ? 2 : 1));
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
        onMouseDown={() => {
          draggingRef.current = true;
        }}
        onTouchStart={() => {
          draggingRef.current = true;
        }}
        onChange={(e) => {
          const next = Number(e.target.value);
          setLocal(next);
        }}
        onMouseUp={(e) => {
          draggingRef.current = false;
          const next = Number((e.target as HTMLInputElement).value);
          commitNow(next);
        }}
        onTouchEnd={(e) => {
          draggingRef.current = false;
          const next = Number((e.target as HTMLInputElement).value);
          commitNow(next);
        }}
        onKeyUp={(e) => {
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

        onStep();

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
      className="w-8 h-8 rounded-xl border bg-smx-panel border-smx-line hover:border-smx-red/40 transition active:scale-95 grid place-items-center text-white select-none touch-none"
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
      className="w-[62px] h-8 rounded-xl border border-smx-line bg-smx-panel px-3 text-sm text-white text-right outline-none focus:border-smx-red/40"
    />
  );
}