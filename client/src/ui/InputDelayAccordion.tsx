import React, { useMemo, useState } from "react";
import InputDelayEditor from "./InputDelayEditor";

function samplesToMs(samples: number, sampleRate: number) {
  return (samples / sampleRate) * 1000;
}

export default function InputDelayAccordion({
  delay,
  sampleRate,
  delayMaxMs,
  onChange
}: {
  delay: { enabled: boolean; valueSamples: number };
  sampleRate: number;
  delayMaxMs: number;
  onChange: (patch: Partial<{ enabled: boolean; valueSamples: number }>) => void;
}) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    if (!delay.enabled) return "OFF";
    return `${samplesToMs(delay.valueSamples, sampleRate).toFixed(2)} ms`;
  }, [delay, sampleRate]);

  return (
    <div className="rounded-2xl border border-smx-line bg-smx-panel2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/10 transition"
      >
        <div>
          <div className="font-semibold">Delay</div>
          <div className="text-sm md:text-xs text-smx-muted">{summary}</div>
        </div>

        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-smx-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="border-t border-smx-line" />
          <div className="p-4">
            <InputDelayEditor
              delay={delay}
              sampleRate={sampleRate}
              delayMaxMs={delayMaxMs}
              onChange={onChange}
            />
          </div>
        </>
      )}
    </div>
  );
}