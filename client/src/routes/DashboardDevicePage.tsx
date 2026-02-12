import React from "react";
import { useParams } from "react-router-dom";
import { useDevice } from "../state/DeviceContext";

export default function DashboardDevicePage() {
  const { id } = useParams();
  const { status, setStatus } = useDevice();

  if (!id) return <div className="text-sm text-smx-muted">Device não informado.</div>;
  if (!status) return <div className="text-sm text-smx-muted">Carregando status...</div>;

  async function setPower(powerOn: boolean) {
    const r = await fetch(`/api/v1/devices/${id}/power`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ powerOn })
    });
    const j = await r.json();
    setStatus((s) => (s ? { ...s, powerOn: j.powerOn } : s));
  }

  return (
    <div className="space-y-6">
      {/* STATUS GERAL DO DEVICE */}
      <section className="bg-smx-panel border border-smx-line rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-smx-muted">Status</div>
            <div className="text-xl font-semibold mt-1">{status.deviceId}</div>
            <div className="text-xs text-smx-muted mt-1">FW {status.fw}</div>
          </div>

          <button
            onClick={() => setPower(!status.powerOn)}
            className={`px-4 py-2 rounded-xl border transition ${
              status.powerOn
                ? "bg-smx-red/20 border-smx-red/40"
                : "bg-smx-panel2 border-smx-line hover:border-smx-red/30"
            }`}
          >
            <span className="font-medium">{status.powerOn ? "POWER ON" : "POWER OFF"}</span>
          </button>
        </div>

        <div className="mt-5 grid sm:grid-cols-3 gap-4">
          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Rede</div>
            <div className="mt-2 text-sm">
              WiFi: <span className="text-smx-muted">{status.net.wifi}</span>
            </div>
            <div className="text-sm">
              LAN: <span className="text-smx-muted">{status.net.lan}</span>
            </div>
          </div>

          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Temperaturas</div>
            <div className="mt-2 text-sm">
              Heatsink:{" "}
              <span className="text-smx-muted">{status.temps.heatsink.toFixed(1)}°C</span>
            </div>
            <div className="text-sm">
              Board: <span className="text-smx-muted">{status.temps.board.toFixed(1)}°C</span>
            </div>
          </div>

          <div className="bg-smx-panel2 border border-smx-line rounded-2xl p-4">
            <div className="text-xs text-smx-muted">Rails</div>
            <div className="mt-2 text-sm">
              VBAT: <span className="text-smx-muted">{status.rails.vbat.toFixed(1)}V</span>
            </div>
            <div className="text-sm">
              VBUS: <span className="text-smx-muted">{status.rails.vbus.toFixed(1)}V</span>
            </div>
          </div>
        </div>
      </section>

      {/* espaço para cards futuros */}
      <section className="bg-smx-panel border border-smx-line rounded-2xl p-6">
        <div className="text-sm font-semibold">Próximos módulos</div>
        <div className="mt-2 text-sm text-smx-muted">
          Aqui entram “Input Status”, “Output Status”, “Presets”, “Logs”, etc.
        </div>
      </section>
    </div>
  );
}
