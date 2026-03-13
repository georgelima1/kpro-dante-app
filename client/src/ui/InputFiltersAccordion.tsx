import React, { useState } from "react";
import type { InputFilter } from "../routes/InputPage";
import InputFiltersEditor from "./InputFiltersEditor";

export default function InputFiltersAccordion({
  filters,
  onFilterChange
}: {
  filters: InputFilter[];
  onFilterChange: (filterId: number, patch: Partial<InputFilter>) => void;
}) {
  const [open, setOpen] = useState(false);

  const enabledCount = filters.filter((f) => f.enabled).length;
  const summary = `${enabledCount} bands`;

  return (
    <div className="rounded-2xl border border-smx-line bg-smx-panel2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/10 transition"
      >
        <div>
          <div className="font-semibold">Filters</div>
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
            <InputFiltersEditor
              filters={filters}
              onFilterChange={onFilterChange}
            />
          </div>
        </>
      )}
    </div>
  );
}