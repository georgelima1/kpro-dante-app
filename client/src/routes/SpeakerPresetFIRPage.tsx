import React, { useEffect, useState } from "react";
import { useDevice } from "../state/DeviceContext";
import { API_BASE } from "../config/endpoints";
import FIRImportModal from "../ui/FIRImportModal";

type FirState = {
  enabled: boolean;
  loaded: boolean;
  fileName?: string;
  taps?: number;
};

export default function SpeakerPresetFIRPage() {
  const { status, deviceId, ch } = useDevice();
  const channel = status?.channels?.find((c) => c.ch === ch);

  const [speakerFir, setFir] = useState<FirState>({
    enabled: false,
    loaded: false,
    fileName: "",
    taps: 0
  });

  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!deviceId || !ch) return;

      try {
        const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/fir`);
        const j = await r.json();
        if (alive) {
          setFir(
            j.speakerFir ?? {
              enabled: false,
              loaded: false,
              fileName: "",
              taps: 0
            }
          );
        }
      } catch {
        if (alive) {
          setFir({
            enabled: false,
            loaded: false,
            fileName: "",
            taps: 0
          });
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [deviceId, ch]);

  async function updateFir(patch: Partial<FirState>) {
    if (!deviceId || !ch) return;

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/fir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });

    const j = await r.json();
    setFir(
      j.speakerFir ?? {
        enabled: false,
        loaded: false,
        fileName: "",
        taps: 0
      }
    );
  }

  async function clearFir() {
    await updateFir({
      loaded: false,
      fileName: "",
      taps: 0
    });
  }

  async function importFirFile(file: File) {
    if (!deviceId || !ch) return;

    const form = new FormData();
    form.append("file", file);

    const r = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/ch/${ch}/fir/upload`, {
      method: "POST",
      body: form
    });

    const j = await r.json();
    setFir(
      j.speakerFir ?? {
        enabled: false,
        loaded: false,
        fileName: "",
        taps: 0
      }
    );
  }

  if (!status || !channel) return null;

  return (
    <div className="max-w-8xl space-y-8">
      <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-smx-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">FIR</div>
            <div className="text-sm md:text-xs text-smx-muted">
              CH {ch} • Finite Impulse Response
            </div>
          </div>

          <button
            onClick={() => updateFir({ enabled: !speakerFir.enabled })}
            className={`relative w-12 h-6 rounded-full border transition ${speakerFir.enabled
                ? "bg-smx-red/30 border-smx-red/50"
                : "bg-smx-panel2 border-smx-line"
              }`}
            aria-label="FIR On/Off"
            title="FIR On/Off"
            type="button"
          >
            <span
              className={`absolute top-[0.07rem] left-[0.05rem] w-5 h-5 rounded-full transition-transform ${speakerFir.enabled ? "translate-x-6 bg-white" : "translate-x-0 bg-white/80"
                }`}
            />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className={!speakerFir.enabled ? "opacity-45 grayscale pointer-events-none select-none" : ""}>
            <div className="bg-black/10 border border-smx-line rounded-2xl p-5 min-h-[220px] flex flex-col justify-between">
              <div className="space-y-2">
                {speakerFir.loaded ? (
                  <>
                    <div className="text-smx-text font-semibold text-base">
                      {speakerFir.fileName || "FIR Loaded"}
                    </div>
                    <div className="text-sm md:text-xs text-smx-muted">
                      Taps: <span className="text-smx-text font-semibold">{speakerFir.taps ?? 0}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm md:text-xs text-smx-muted">Not Loaded</div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={clearFir}
                    disabled={!speakerFir.loaded}
                    className={`px-5 flex-1 py-3 text-sm font-semibold rounded-2xl transition ${speakerFir.loaded
                        ? "bg-white/20 text-white hover:bg-white/25"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                      }`}
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    className="px-5 flex-1 py-3 text-sm font-semibold rounded-2xl transition border bg-smx-red border-smx-red/40 text-smx-text"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FIRImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importFirFile}
      />
    </div>
  );
}