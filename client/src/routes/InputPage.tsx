import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DeviceProvider, useDevice } from "../state/DeviceContext";
import { API_BASE } from "../config/endpoints";
import InputDelayAccordion from "../ui/InputDelayAccordion";
import InputFiltersAccordion from "../ui/InputFiltersAccordion";
import InputSourceConfigModal from "../ui/InputSourceConfigModal";
import Select from "../ui/Select";
import Icon from "../ui/Icon";

export type FilterType =
  | "hpf"
  | "lpf"
  | "parametric"
  | "low_shelf"
  | "high_shelf"
  | "tilt_shelf"
  | "all_pass"
  | "band_pass"
  | "notch";

export type CrossoverFamily = "butterworth" | "linkwitz_riley" | "bessel";

export type InputFilter = {
  id: number;
  enabled: boolean;
  type: FilterType;
  freqHz: number;
  q: number;
  gainDb: number;
  slope?: 6 | 12 | 18 | 24 | 30 | 36 | 42 | 48;
  crossoverFamily?: CrossoverFamily;
};

export type InputSourceMode = "analog" | "dante" | "failover";
export type SourceType = "analog" | "dante";
export type SourceChannel = 1 | 2;

export type SourceRef = {
  type: SourceType;
  channel: SourceChannel;
};

export type SourceProcessing = {
  trimDb: number;
  delay: {
    enabled: boolean;
    valueSamples: number;
  };
};

export type FailoverConfig = {
  thresholdDbu: number;
  order: SourceRef[];
};

export type SourceBank = {
  selectedChannel: SourceChannel;
  ch1: SourceProcessing;
  ch2: SourceProcessing;
};

export type InputChannelConfig = {
  inputCh: number;
  selectedSource: InputSourceMode;
  mute: boolean;
  analog: SourceBank;
  dante: SourceBank;
  failover: FailoverConfig;
  inputDelay: {
    enabled: boolean;
    valueSamples: number;
  };
  filters: InputFilter[];
};

export type InputRouteCell = {
  inputCh: number;
  outputCh: number;
  gainDb: number;
  mute: boolean;
};

export type InputPageState = {
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
  const [editingInputCh, setEditingInputCh] = useState<number | null>(null);

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

  async function updateInputMeta(inputCh: number, patch: Partial<InputChannelConfig>) {
    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/meta`, {
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

  async function updateSourceProcessing(
    inputCh: number,
    sourceType: SourceType,
    sourceChannel: SourceChannel,
    patch: Partial<SourceProcessing>
  ) {
    const r = await fetch(
      `${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/source/${sourceType}/${sourceChannel}`,
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
        inputs: prev.inputs.map((x) => (x.inputCh === inputCh ? j.input : x))
      };
    });
  }

  async function updateSourceRoute(
    inputCh: number,
    sourceType: SourceType,
    patch: { selectedChannel?: SourceChannel }
  ) {
    const r = await fetch(
      `${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/source-route/${sourceType}`,
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
        inputs: prev.inputs.map((x) => (x.inputCh === inputCh ? j.input : x))
      };
    });
  }

  async function updateFailover(inputCh: number, patch: Partial<FailoverConfig>) {
    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/failover`, {
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

  async function updateInputDelay(
    inputCh: number,
    patch: Partial<InputChannelConfig["inputDelay"]>
  ) {
    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/input-delay`, {
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

  async function updateInputFilter(
    inputCh: number,
    filterId: number,
    patch: Partial<InputFilter>
  ) {
    const r = await fetch(
      `${API_BASE}/api/v1/devices/${deviceId}/input/${inputCh}/filters/${filterId}`,
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
        inputs: prev.inputs.map((x) =>
          x.inputCh !== inputCh
            ? x
            : {
              ...x,
              filters: x.filters.map((f) => (f.id === filterId ? j.filter : f))
            }
        )
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

  const editingInput = useMemo(
    () => data?.inputs.find((x) => x.inputCh === editingInputCh) ?? null,
    [data, editingInputCh]
  );

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
      {data.inputs.map((input) => {
        const activeSourceRef: SourceRef =
          input.selectedSource === "analog"
            ? { type: "analog", channel: input.analog.selectedChannel }
            : input.selectedSource === "dante"
              ? { type: "dante", channel: input.dante.selectedChannel }
              : input.failover.order[0] ?? { type: "analog", channel: 1 };

        const activeProc = getSourceProcessing(input, activeSourceRef);

        const trimSummary = `${activeProc.trimDb.toFixed(1)} dB`;
        const delaySummary = `${samplesToMs(
          activeProc.delay.valueSamples,
          status.dsp.sampleRate
        ).toFixed(2)} ms`;

        const sourceOptions = [
          {
            value: "analog",
            label: `Analog ${input.analog.selectedChannel}`
          },
          {
            value: "dante",
            label: `Dante ${input.dante.selectedChannel}`
          },
          {
            value: "failover",
            label: `Failover (${sourceRefLabel(input.failover.order[0])} > ${sourceRefLabel(input.failover.order[1])})`
          }
        ];

        const failoverRows = input.failover.order.map((src) => {
          const proc = getSourceProcessing(input, src);

          return {
            src,
            label: sourceRefLabel(src),
            trim: `${proc.trimDb.toFixed(1)} dB`,
            delay: `${samplesToMs(proc.delay.valueSamples, status.dsp.sampleRate).toFixed(2)} ms`
          };
        });

        return (
          <section
            key={input.inputCh}
            className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden"
          >
            <div className="px-4 md:px-5 py-3 border-b border-smx-line">
              {/* linha 1 */}
              <div className="flex items-start justify-between gap-3">
                <div className="text-base font-semibold text-smx-text">
                  IN {input.inputCh}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateInputMeta(input.inputCh, { mute: !input.mute })}
                    className={`w-10 h-10 rounded-xl border grid place-items-center transition ${input.mute
                        ? "bg-smx-red/15 border-smx-red/40"
                        : "bg-smx-panel2 border-smx-line hover:border-smx-red/30"
                      }`}
                  >
                    <Icon
                      name={input.mute ? "volume_off" : "volume_up"}
                      className={input.mute ? "text-smx-red" : "text-smx-text"}
                      filled={input.mute}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingInputCh(input.inputCh)}
                    className="px-4 h-10 rounded-2xl border bg-smx-panel2 border-smx-line text-sm font-semibold text-smx-text hover:border-smx-red/30 transition"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>

            {/* linha 2 */}
            <div className="px-4 md:px-5 py-3 flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-start min-[900px]:gap-4">
              <div className="w-full min-[900px]:w-[300px]">
                <Select
                  label="Source"
                  value={input.selectedSource}
                  options={sourceOptions}
                  onChange={(value) =>
                    updateInputMeta(input.inputCh, {
                      selectedSource: value as InputSourceMode
                    })
                  }
                />
              </div>

              {input.selectedSource !== "failover" ? (
                <div className="min-[900px]:pt-6 text-xs md:text-[12px] text-smx-muted leading-5">
                  <div>
                    Trim <span className="text-smx-text font-medium">{trimSummary}</span>
                  </div>
                  <div>
                    Delay <span className="text-smx-text font-medium">{delaySummary}</span>
                  </div>
                </div>
              ) : (
                <div className="min-[900px]:pt-6 flex flex-col min-[900px]:flex-row min-[900px]:items-center gap-3 min-[900px]:gap-6">
                  <div className="text-xs md:text-[12px] text-smx-muted">
                    {failoverRows.map((row) => (
                      <div

                        key={`${row.src.type}-${row.src.channel}`}
                        className="grid grid-cols-[72px_140px_140px] gap-x-4 items-center"
                      >
                        <div className="text-smx-text font-medium">{row.label}</div>

                        <div>
                          Trim <span className="text-smx-text font-medium">{row.trim}</span>
                        </div>

                        <div>
                          Delay <span className="text-smx-text font-medium">{row.delay}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs md:text-[12px] text-smx-muted min-[900px]:self-center">
                    Threshold{" "}
                    <span className="text-smx-text font-medium">
                      {input.failover.thresholdDbu.toFixed(0)} dBu
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 md:p-4 space-y-3">
              <InputDelayAccordion
                delay={input.inputDelay}
                sampleRate={status.dsp.sampleRate}
                delayMaxMs={status.dsp.delayMaxMs}
                onChange={(patch) => updateInputDelay(input.inputCh, patch)}
              />

              <InputFiltersAccordion
                filters={input.filters}
                onFilterChange={(filterId, patch) =>
                  updateInputFilter(input.inputCh, filterId, patch)
                }
              />
            </div>
          </section>
        );
      })}

      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line">
          <div className="text-base font-semibold">Routing Matrix</div>
          <div className="text-sm md:text-xs text-smx-muted">
            Input to output trim matrix
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="min-w-[720px]">
            <div
              className="grid gap-2 items-center"
              style={{
                gridTemplateColumns: `100px repeat(${channelsCount}, 144px)`
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

                    const effectiveGain = cell.mute ? -120 : cell.gainDb;

                    return (
                      <div
                        key={`${row.inputCh}-${outputCh}`}
                        className="rounded-xl border border-smx-line bg-smx-panel2 p-2 space-y-2"
                      >
                        <div className="text-center text-sm md:text-xs">
                          <span className="font-semibold text-smx-text">
                            {cell.mute || effectiveGain <= -120
                              ? "-∞"
                              : `${effectiveGain.toFixed(1)} dB`}
                          </span>
                        </div>

                        <input
                          type="range"
                          min={-40}
                          max={0}
                          step={0.5}
                          value={effectiveGain}
                          onChange={(e) =>
                            updateMatrixCell(row.inputCh, outputCh, {
                              mute: false,
                              gainDb: Number(e.target.value)
                            })
                          }
                          className="w-full smx-range smx-range-fill smx-range-red"
                          style={{
                            ["--fill" as any]: `${((effectiveGain + 40) / 40) * 100}%`
                          }}
                        />

                        <div className="grid grid-cols-3 gap-1">
                          <QuickBtn
                            label="M"
                            active={cell.mute}
                            onClick={() =>
                              updateMatrixCell(row.inputCh, outputCh, {
                                mute: !cell.mute
                              })
                            }
                          />
                          <QuickBtn
                            label="-6"
                            active={!cell.mute && Math.abs(cell.gainDb + 6) < 0.01}
                            onClick={() =>
                              updateMatrixCell(row.inputCh, outputCh, {
                                mute: false,
                                gainDb: -6
                              })
                            }
                          />
                          <QuickBtn
                            label="0"
                            active={!cell.mute && Math.abs(cell.gainDb - 0) < 0.01}
                            onClick={() =>
                              updateMatrixCell(row.inputCh, outputCh, {
                                mute: false,
                                gainDb: 0
                              })
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {editingInput && (
        <InputSourceConfigModal
          input={editingInput}
          sampleRate={status.dsp.sampleRate}
          delayMaxMs={status.dsp.delayMaxMs}
          onClose={() => setEditingInputCh(null)}
          onSourceRouteChange={(sourceType, patch) =>
            updateSourceRoute(editingInput.inputCh, sourceType, patch)
          }
          onSourceProcessingChange={(sourceType, sourceChannel, patch) =>
            updateSourceProcessing(editingInput.inputCh, sourceType, sourceChannel, patch)
          }
          onFailoverChange={(patch) => updateFailover(editingInput.inputCh, patch)}
        />
      )}
    </div>
  );
}

function QuickBtn({
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
      className={`h-8 w-8 rounded-lg border text-sm md:text-xs font-semibold transition ${active
        ? "bg-smx-red/15 border-smx-red/40 text-smx-text"
        : "bg-smx-panel border-smx-line text-smx-muted hover:border-smx-red/30"
        }`}
    >
      {label}
    </button>
  );
}

function samplesToMs(samples: number, sampleRate: number) {
  return (samples / sampleRate) * 1000;
}

function getSourceProcessing(input: InputChannelConfig, ref: SourceRef): SourceProcessing {
  const bank = ref.type === "analog" ? input.analog : input.dante;
  return ref.channel === 1 ? bank.ch1 : bank.ch2;
}

function sourceRefLabel(ref: SourceRef) {
  return `${ref.type === "analog" ? "Analog" : "Dante"} ${ref.channel}`;
}