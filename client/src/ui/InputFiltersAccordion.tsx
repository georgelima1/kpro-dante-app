import React, { useMemo, useState } from "react";
import type { FilterType, CrossoverFamily, FilterItem, FiltersEditorProps} from "@/types/filters";
import FiltersEditor from "./InputFiltersEditor";

type InputFilter = FilterItem;

export default function InputFiltersAccordion({
  filters,
  onFilterChange
}: {
  filters: InputFilter[];
  onFilterChange: (filterId: number, patch: Partial<InputFilter>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(filters[0]?.id ?? null);
  const [draftFilters, setDraftFilters] = useState<InputFilter[]>(filters);

  React.useEffect(() => {
    setDraftFilters(filters);
    setSelectedId((prev) => prev ?? filters[0]?.id ?? null);
  }, [filters]);

  const enabledCount = useMemo(
    () => draftFilters.filter((f) => f.enabled).length,
    [draftFilters]
  );

  function updateLocal(filterId: number, patch: Partial<InputFilter>) {
    setDraftFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, ...patch } : f))
    );
  }

  async function commitChange(filterId: number, patch: Partial<InputFilter>) {
    onFilterChange(filterId, patch);
  }

  return (
    <div className="rounded-2xl border border-smx-line bg-smx-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 md:px-5 py-3 flex items-center justify-between gap-3 border-b border-smx-line bg-smx-panel2"
      >
        <div className="min-w-0 text-left">
          <div className="text-sm font-semibold text-smx-text">Filters</div>
          <div className="text-xs text-smx-muted">
            {enabledCount} enabled • {draftFilters.length} bands
          </div>
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
        <div className="p-0">
          <FiltersEditor
            filters={draftFilters}
            selectedId={selectedId}
            onSelectedIdChange={setSelectedId}
            onLocalChange={updateLocal}
            onCommitChange={commitChange}
            showHeader={false}
            embedded
            chartHeightClassName="h-[220px] md:h-[380px]"
          />
        </div>
      )}
    </div>
  );
}