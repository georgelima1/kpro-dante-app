import React, { useEffect, useState } from "react";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function InputTrimEditor({
  trimDb,
  onChange
}: {
  trimDb: number;
  onChange: (trimDb: number) => void;
}) {
  const [draft, setDraft] = useState(trimDb);

  useEffect(() => {
    setDraft(trimDb);
  }, [trimDb]);

  function nudge(delta: number) {
    const next = clamp(Number((draft + delta).toFixed(1)), -24, 24);
    setDraft(next);
    onChange(next);
  }

  return (
    <div className="bg-black/10 border border-smx-line rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between text-sm md:text-xs text-smx-muted">
        <span>Trim [dB]</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => nudge(-0.1)}
            className="w-8 h-8 rounded-lg border border-smx-line bg-smx-panel2"
            type="button"
          >
            ▼
          </button>
          <span className="text-smx-text font-semibold min-w-[88px] text-center">
            {draft.toFixed(1)} dB
          </span>
          <button
            onClick={() => nudge(0.1)}
            className="w-8 h-8 rounded-lg border border-smx-line bg-smx-panel2"
            type="button"
          >
            ▲
          </button>
        </div>
      </div>

      <input
        type="range"
        min={-24}
        max={24}
        step={0.1}
        value={draft}
        onChange={(e) => {
          const next = Number(e.target.value);
          setDraft(next);
          onChange(next);
        }}
        className="w-full smx-range smx-range-fill smx-range-red"
        style={{
          ["--fill" as any]: `${((draft + 24) / 48) * 100}%`
        }}
      />
    </div>
  );
}