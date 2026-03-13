import React from "react";
import type {
  FailoverConfig,
  InputChannelConfig,
  PhysicalSource,
  SourceProcessing
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
  onSourceProcessingChange,
  onFailoverChange
}: {
  input: InputChannelConfig;
  sampleRate: number;
  delayMaxMs: number;
  onClose: () => void;
  onSourceProcessingChange: (
    sourceKey: "analog" | "dante",
    patch: Partial<SourceProcessing>
  ) => void;
  onFailoverChange: (patch: Partial<FailoverConfig>) => void;
}) {
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
            className="w-10 h-10 rounded-2xl border border-smx-line bg-smx-panel2 text-white hover:border-smx-red/30 transition shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 md:p-5 overflow-y-auto max-h-[calc(85vh-72px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <SourceCard
              title="Analog"
              sourceKey="analog"
              proc={input.analog}
              sampleRate={sampleRate}
              delayMaxMs={delayMaxMs}
              onChange={onSourceProcessingChange}
            />

            <SourceCard
              title="Dante"
              sourceKey="dante"
              proc={input.dante}
              sampleRate={sampleRate}
              delayMaxMs={delayMaxMs}
              onChange={onSourceProcessingChange}
            />

            <FailoverCard
              failover={input.failover}
              onChange={onFailoverChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceCard({
  title,
  sourceKey,
  proc,
  sampleRate,
  delayMaxMs,
  onChange
}: {
  title: string;
  sourceKey: "analog" | "dante";
  proc: SourceProcessing;
  sampleRate: number;
  delayMaxMs: number;
  onChange: (sourceKey: "analog" | "dante", patch: Partial<SourceProcessing>) => void;
}) {
  const delayMs = samplesToMs(proc.delay.valueSamples, sampleRate);

  return (
    <div className="rounded-2xl border border-smx-line bg-black/10 p-4 space-y-5">
      <div className="text-base font-semibold">{title}</div>

      <div>
        <div className="flex items-center justify-between mb-2 text-sm md:text-xs text-smx-muted">
          <span>Trim [dB]</span>
          <span className="text-smx-text font-semibold">{proc.trimDb.toFixed(1)} dB</span>
        </div>

        <input
          type="range"
          min={-24}
          max={24}
          step={0.1}
          value={proc.trimDb}
          onChange={(e) =>
            onChange(sourceKey, { trimDb: clamp(Number(e.target.value), -24, 24) })
          }
          className="w-full smx-range smx-range-fill smx-range-red"
          style={{
            ["--fill" as any]: `${((proc.trimDb + 24) / 48) * 100}%`
          }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 text-sm md:text-xs text-smx-muted">
          <span>Delay [ms]</span>
          <span className="text-smx-text font-semibold">{delayMs.toFixed(2)} ms</span>
        </div>

        <input
          type="range"
          min={0}
          max={delayMaxMs}
          step={0.01}
          value={delayMs}
          onChange={(e) =>
            onChange(sourceKey, {
              delay: {
                ...proc.delay,
                valueSamples: msToSamples(Number(e.target.value), sampleRate)
              }
            })
          }
          className="w-full smx-range smx-range-fill smx-range-red"
          style={{
            ["--fill" as any]: `${(delayMs / delayMaxMs) * 100}%`
          }}
        />
      </div>
    </div>
  );
}

function FailoverCard({
  failover,
  onChange
}: {
  failover: FailoverConfig;
  onChange: (patch: Partial<FailoverConfig>) => void;
}) {
  const first = failover.order[0] ?? "analog";
  const second: PhysicalSource = first === "analog" ? "dante" : "analog";

  return (
    <div className="rounded-2xl border border-green-600/80 bg-black/10 p-4 space-y-5">
      <div className="text-base font-semibold">Failover</div>

      <div>
        <div className="text-sm md:text-xs text-smx-muted mb-2">Priority Order</div>
        <select
          value={first}
          onChange={(e) => {
            const nextFirst = e.target.value as PhysicalSource;
            const nextSecond: PhysicalSource = nextFirst === "analog" ? "dante" : "analog";
            onChange({ order: [nextFirst, nextSecond] });
          }}
          className="smx-select h-10"
        >
          <option value="analog">Analog &gt; Dante</option>
          <option value="dante">Dante &gt; Analog</option>
        </select>

        <div className="mt-2 text-sm md:text-xs text-smx-text">
          {first} &gt; {second}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 text-sm md:text-xs text-smx-muted">
          <span>Threshold [dBu]</span>
          <span className="text-smx-text font-semibold">
            {failover.thresholdDbu.toFixed(0)} dBu
          </span>
        </div>

        <input
          type="range"
          min={-90}
          max={0}
          step={1}
          value={failover.thresholdDbu}
          onChange={(e) =>
            onChange({ thresholdDbu: clamp(Number(e.target.value), -90, 0) })
          }
          className="w-full smx-range smx-range-fill smx-range-red"
          style={{
            ["--fill" as any]: `${((failover.thresholdDbu + 90) / 90) * 100}%`
          }}
        />
      </div>
    </div>
  );
}