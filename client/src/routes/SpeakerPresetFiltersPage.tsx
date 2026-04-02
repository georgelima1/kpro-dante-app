import React, { useEffect, useMemo, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import { FilterType } from "../types/filters";
import { API_BASE } from "../config/endpoints";
import SpeakerPresetLocked from "../ui/SpeakerPresetLocked";
import FiltersEditor from "../ui/InputFiltersEditor";

export default function SpeakerPresetFilterPage() {
  const { status, setStatus, deviceId, ch } = useDevice();
  const channel = status?.channels?.find((c) => c.ch === ch);

  const [filters, setFilters] = useState<SpeakerFilter[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!deviceId || !ch) return;

    fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/filters`)
      .then((r) => r.json())
      .then((j) => {
        let arr = (j.filters ?? []) as SpeakerFilter[];

        arr = arr.map((f, idx) => {
          if (idx === 0) {
            return {
              ...f,
              type: "hpf" as FilterType,
              crossoverFamily: f.crossoverFamily ?? "butterworth",
              slope: f.slope ?? 12
            };
          }

          if (idx === arr.length - 1) {
            return {
              ...f,
              type: "lpf" as FilterType,
              crossoverFamily: f.crossoverFamily ?? "butterworth",
              slope: f.slope ?? 12
            };
          }

          return f;
        });

        setFilters(arr);
        setSelectedId((prev) => prev ?? arr[0]?.id ?? null);
      });
  }, [deviceId, ch]);

  if (!status || !channel) return null;

  if (channel.speakerPreset?.locked) {
    return (
      <SpeakerPresetLocked
        title="Preset Locked"
        message="This manufacturer preset is protected. Filters settings cannot be viewed or edited."
      />
    );
  }

  async function updateFilter(filterId: number, patch: Partial<SpeakerFilter>) {
    const r = await fetch(
      `${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/speaker/filters/${filterId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }
    );

    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text}`);
    const j = JSON.parse(text);

    setFilters((prev) => prev.map((f) => (f.id === filterId ? j.filter : f)));

    setStatus((s) => {
      if (!s) return s;
      return {
        ...s,
        channels: s.channels.map((c: any) =>
          c.ch === ch
            ? {
                ...c,
                speakerFilters: (c.speakerFilters ?? filters).map((f: SpeakerFilter) =>
                  f.id === filterId ? j.filter : f
                )
              }
            : c
        )
      };
    });
  }

  function updateLocal(filterId: number, patch: Partial<SpeakerFilter>) {
    setFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, ...patch } : f))
    );
  }

  if (!selectedId) {
    return <div className="text-sm text-smx-muted">Carregando speaker filters...</div>;
  }

  return (
    <FiltersEditor
      title="Speaker Filters"
      subtitle={`CH ${ch} • Speaker EQ and crossovers`}
      filters={filters}
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
      onLocalChange={updateLocal}
      onCommitChange={updateFilter}
      showHeader
      chartHeightClassName="h-[260px] md:h-[320px] lg:h-[380px]"
    />
  );
}