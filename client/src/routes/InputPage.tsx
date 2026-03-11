import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DeviceProvider, useDevice } from "../state/DeviceContext";
import { API_BASE } from "../config/endpoints";
import Select from "../ui/Select";

type InputSourceType = "analog" | "dante";

type InputPriorityItem = {
  source: InputSourceType;
  thresholdDbu: number;
};

type InputChannelConfig = {
  inputCh: number;
  primarySource: InputSourceType;
  backupEnabled: boolean;
  backupSource: InputSourceType;
  thresholdDbu: number;
  priority: InputPriorityItem[];
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

export default function InputPage() {
  const { id } = useParams();
  if (!id) return <div className="text-sm text-smx-muted">Device não informado.</div>;

  return (
    <DeviceProvider deviceId={id}>
      <InputPageInner deviceId={id} />
    </DeviceProvider>
  );
}

function InputPageInner({ deviceId }: { deviceId: string }) {
  const { status } = useDevice();
  const channelsCount = status?.channelsCount ?? 0;

  const [data, setData] = useState<InputPageState | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/input`);
        const j = await r.json();
        if (alive) setData(j);
      } catch {
        if (alive) setData(null);
      }
    }

    if (deviceId) load();
    return () => {
      alive = false;
    };
  }, [deviceId]);

  async function updateInput(inputCh: number, patch: Partial<InputChannelConfig>) {
    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const j = await r.json();

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inputs: prev.inputs.map((x) => (x.inputCh === inputCh ? j.input : x))
      };
    });
  }

  async function updateMatrixCell(
    inputCh: number,
    outputCh: number,
    patch: Partial<InputRouteCell>
  ) {
    const r = await fetch(
      `${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/output/${outputCh}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }
    );
    const j = await r.json();

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        matrix: prev.matrix.map((cell) =>
          cell.inputCh === inputCh && cell.outputCh === outputCh ? j.cell : cell
        )
      };
    });
  }

  const matrixByInput = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: channelsCount }).map((_, i) => {
      const inputCh = i + 1;
      return {
        inputCh,
        cells: data.matrix.filter((c) => c.inputCh === inputCh)
      };
    });
  }, [data, channelsCount]);

  if (!status || !data) {
    return <div className="text-sm text-smx-muted">Carregando input...</div>;
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between">
          <div>
            <div className="text-lg md:text-base font-semibold">Input</div>
            <div className="text-sm md:text-xs text-smx-muted">
              Input source, backup and routing matrix
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Source cards */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-4">
            <div className="text-sm font-semibold mb-4">Source / Backup</div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data.inputs.map((input) => (
                <InputSourceCard
                  key={input.inputCh}
                  input={input}
                  onChange={(patch) => updateInput(input.inputCh, patch)}
                />
              ))}
            </div>
          </div>

          {/* Matrix */}
          <div className="bg-black/10 border border-smx-line rounded-2xl p-4 overflow-hidden">
            <div className="text-sm font-semibold mb-4">Routing Matrix</div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div
                  className="grid gap-2 items-center"
                  style={{
                    gridTemplateColumns: `100px repeat(${channelsCount}, minmax(110px, 1fr))`
                  }}
                >
                  <div />
                  {Array.from({ length: channelsCount }).map((_, i) => (
                    <div
                      key={`head-${i + 1}`}
                      className="text-center text-sm md:text-xs text-smx-muted font-semibold"
                    >
                      OUT {i + 1}
                    </div>
                  ))}

                  {matrixByInput.map((row) => (
                    <React.Fragment key={`row-${row.inputCh}`}>
                      <div className="text-sm font-semibold text-smx-text">
                        IN {row.inputCh}
                      </div>

                      {Array.from({ length: channelsCount }).map((_, outIdx) => {
                        const outputCh = outIdx + 1;
                        const cell = row.cells.find((c) => c.outputCh === outputCh);

                        if (!cell) return <div key={`${row.inputCh}-${outputCh}`} />;

                        return (
                          <InputMatrixCell
                            key={`${row.inputCh}-${outputCh}`}
                            cell={cell}
                            onChange={(patch) =>
                              updateMatrixCell(row.inputCh, outputCh, patch)
                            }
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InputSourceCard({
  input,
  onChange
}: {
  input: InputChannelConfig;
  onChange: (patch: Partial<InputChannelConfig>) => void;
}) {
  const sourceOptions = [
    { value: "analog", label: "Analog" },
    { value: "dante", label: "Dante" }
  ] as const;

  return (
    <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">IN {input.inputCh}</div>

        <button
          onClick={() => onChange({ backupEnabled: !input.backupEnabled })}
          className={`relative w-12 h-6 rounded-full border transition ${
            input.backupEnabled
              ? "bg-smx-red/30 border-smx-red/50"
              : "bg-smx-panel border-smx-line"
          }`}
          aria-label="Backup On/Off"
          title="Backup On/Off"
          type="button"
        >
          <span
            className={`absolute top-[0.07rem] left-[0.05rem] w-5 h-5 rounded-full transition-transform ${
              input.backupEnabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select
          label="Primary Source"
          value={input.primarySource}
          options={sourceOptions.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(value) => {
            const primarySource = value as InputSourceType;
            const backupSource = primarySource === "analog" ? "dante" : "analog";
            onChange({ primarySource, backupSource });
          }}
        />

        <Select
          label="Backup Source"
          value={input.backupSource}
          options={sourceOptions.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(value) => onChange({ backupSource: value as InputSourceType })}
        />
      </div>

      <div className={!input.backupEnabled ? "opacity-45 grayscale pointer-events-none" : ""}>
        <div className="flex items-center justify-between mb-2 text-sm md:text-xs text-smx-muted">
          <span>Signal Loss Threshold [dBu]</span>
          <span className="text-smx-text font-semibold">{input.thresholdDbu.toFixed(1)} dBu</span>
        </div>

        <input
          type="range"
          min={-90}
          max={0}
          step={1}
          value={input.thresholdDbu}
          onChange={(e) => onChange({ thresholdDbu: Number(e.target.value) })}
          className="w-full smx-range smx-range-fill smx-range-red"
          style={{
            ["--fill" as any]: `${((input.thresholdDbu + 90) / 90) * 100}%`
          }}
        />

        <div className="mt-2 flex justify-between text-sm md:text-xs text-smx-muted">
          <span>-90</span>
          <span>-60</span>
          <span>-30</span>
          <span>0</span>
        </div>
      </div>
    </div>
  );
}

function InputMatrixCell({
  cell,
  onChange
}: {
  cell: InputRouteCell;
  onChange: (patch: Partial<InputRouteCell>) => void;
}) {
  function setPreset(kind: "mute" | "0" | "-6" | "inf") {
    if (kind === "mute") {
      onChange({ mute: !cell.mute });
      return;
    }

    if (kind === "0") onChange({ mute: false, gainDb: 0 });
    if (kind === "-6") onChange({ mute: false, gainDb: -6 });
    if (kind === "inf") onChange({ mute: false, gainDb: -120 });
  }

  const effectiveGain = cell.mute ? -120 : cell.gainDb;

  return (
    <div className="rounded-xl border border-smx-line bg-smx-panel2 p-2 space-y-2">
      <div className="text-center text-sm md:text-xs">
        <span className="font-semibold text-smx-text">
          {cell.mute || effectiveGain <= -120 ? "-∞" : `${effectiveGain.toFixed(1)} dB`}
        </span>
      </div>

      <input
        type="range"
        min={-120}
        max={0}
        step={0.5}
        value={effectiveGain}
        onChange={(e) => onChange({ mute: false, gainDb: Number(e.target.value) })}
        className="w-full smx-range smx-range-fill smx-range-red"
        style={{
          ["--fill" as any]: `${((effectiveGain + 120) / 120) * 100}%`
        }}
      />

      <div className="grid grid-cols-4 gap-1">
        <QuickCellButton
          active={cell.mute}
          onClick={() => setPreset("mute")}
          label="M"
        />
        <QuickCellButton
          active={!cell.mute && Math.abs(cell.gainDb - 0) < 0.01}
          onClick={() => setPreset("0")}
          label="0"
        />
        <QuickCellButton
          active={!cell.mute && Math.abs(cell.gainDb + 6) < 0.01}
          onClick={() => setPreset("-6")}
          label="-6"
        />
        <QuickCellButton
          active={!cell.mute && cell.gainDb <= -120}
          onClick={() => setPreset("inf")}
          label="∞"
        />
      </div>
    </div>
  );
}

function QuickCellButton({
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
      className={`h-8 rounded-lg border text-sm md:text-xs font-semibold transition ${
        active
          ? "bg-smx-red/15 border-smx-red/40 text-smx-text"
          : "bg-smx-panel border-smx-line text-smx-muted hover:border-smx-red/30"
      }`}
    >
      {label}
    </button>
  );
}