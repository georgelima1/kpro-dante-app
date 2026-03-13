import React, { useMemo, useState } from "react";
import type {
  FailoverConfig,
  InputChannelConfig,
  InputFilter,
  PhysicalSource,
  SourceProcessing
} from "../routes/InputPage";
import InputSourceConfigModal from "./InputSourceConfigModal";
import InputDelayAccordion from "./InputDelayAccordion";
import InputFiltersAccordion from "./InputFiltersAccordion";

function samplesToMs(samples: number, sampleRate: number) {
  return (samples / sampleRate) * 1000;
}

export default function InputChannelSection({
  input,
  sampleRate,
  delayMaxMs,
  onMetaChange,
  onSourceProcessingChange,
  onFailoverChange,
  onInputDelayChange,
  onInputFilterChange
}: {
  input: InputChannelConfig;
  sampleRate: number;
  delayMaxMs: number;
  onMetaChange: (patch: Partial<InputChannelConfig>) => void;
  onSourceProcessingChange: (
    sourceKey: "analog" | "dante",
    patch: Partial<SourceProcessing>
  ) => void;
  onFailoverChange: (patch: Partial<FailoverConfig>) => void;
  onInputDelayChange: (patch: Partial<InputChannelConfig["inputDelay"]>) => void;
  onInputFilterChange: (filterId: number, patch: Partial<InputFilter>) => void;
}) {
  const [showSet, setShowSet] = useState(false);

  const activePhysicalSource = useMemo<PhysicalSource>(() => {
    if (input.selectedSource === "analog") return "analog";
    if (input.selectedSource === "dante") return "dante";
    return input.failover.order[0] ?? "analog";
  }, [input.selectedSource, input.failover.order]);

  const activeProc = activePhysicalSource === "analog" ? input.analog : input.dante;

  const trimSummary = `${activeProc.trimDb.toFixed(1)} dB`;
  const delaySummary = `${samplesToMs(activeProc.delay.valueSamples, sampleRate).toFixed(2)} ms`;
  const failoverSummary = `Failover: ${input.failover.order[0]} > ${input.failover.order[1]} • ${input.failover.thresholdDbu.toFixed(0)} dBu`;

  return (
    <>
      <section className="bg-black/10 border border-smx-line rounded-2xl overflow-hidden">
        {/* topo do canal */}
        <div className="px-4 md:px-5 py-3 border-b border-smx-line">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            {/* esquerda */}
            <div className="min-w-0">
              <div className="text-base font-semibold text-smx-text">
                IN {input.inputCh}
              </div>

              <div className="mt-1 text-sm md:text-xs text-smx-muted flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  Trim <span className="text-smx-text font-medium">{trimSummary}</span>
                </span>

                <span className="opacity-40">•</span>

                <span>
                  Delay <span className="text-smx-text font-medium">{delaySummary}</span>
                </span>

                <span className="opacity-40">•</span>

                <span className="truncate">
                  <span className="text-smx-text font-medium">{failoverSummary}</span>
                </span>
              </div>
            </div>

            {/* direita */}
            <div className="flex items-center gap-2 self-end md:self-start shrink-0">
              <button
                onClick={() => onMetaChange({ mute: !input.mute })}
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all duration-200 active:scale-95 font-semibold ${
                  input.mute
                    ? "bg-smx-red/25 border-smx-red text-smx-red shadow-md"
                    : "bg-smx-panel2 border-smx-line text-white hover:border-smx-red/40"
                }`}
                title="Mute"
              >
                M
              </button>

              <button
                type="button"
                onClick={() => setShowSet(true)}
                className="px-4 py-2.5 rounded-xl border bg-smx-panel2 border-smx-line text-sm font-semibold text-smx-text hover:border-smx-red/30 transition"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* acordeons */}
        <div className="p-3 md:p-4 space-y-3">
          <InputDelayAccordion
            delay={input.inputDelay}
            sampleRate={sampleRate}
            delayMaxMs={delayMaxMs}
            onChange={onInputDelayChange}
          />

          <InputFiltersAccordion
            filters={input.filters}
            onFilterChange={onInputFilterChange}
          />
        </div>
      </section>

      {showSet && (
        <InputSourceConfigModal
          input={input}
          sampleRate={sampleRate}
          delayMaxMs={delayMaxMs}
          onClose={() => setShowSet(false)}
          onSourceProcessingChange={onSourceProcessingChange}
          onFailoverChange={onFailoverChange}
        />
      )}
    </>
  );
}