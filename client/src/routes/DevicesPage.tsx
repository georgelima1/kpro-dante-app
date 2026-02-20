import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type DeviceRow = {
  id: string; name: string; ip: string; model: string; fw: string; online: boolean;
};

const API = "http://localhost:8787";

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v1/devices`)
      .then(r => r.json())
      .then((j) => {
        const arr = Array.isArray(j) ? j : (j.devices ?? []);
        const mapped: DeviceRow[] = arr.map((d: any) => ({
          id: d.id,
          name: d.name ?? d.id,
          ip: d.ip ?? "-",
          model: d.model ?? "-",
          fw: d.fw ?? "-",
          online: (d.status ?? "").toUpperCase() === "ONLINE"
        }));
        setDevices(mapped);
      })
      .finally(() => setLoading(false));
  }, []); 

  return (
    <div className="max-w-8xl">
      <h1 className="text-2xl font-semibold">Devices</h1>
      <p className="text-sm text-smx-muted mt-2">
        V0: discovery mock via API. No real (LAN), depois podemos trocar por mDNS + “pairing”/scan.
      </p>

      <div className="mt-6 bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.6fr] gap-0 px-5 py-3 text-xs text-smx-muted border-b border-smx-line">
          <div>Nome</div><div>IP</div><div>Modelo</div><div>FW</div><div>Status</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-smx-muted">Carregando...</div>
        ) : devices.length === 0 ? (
          <div className="p-6 text-sm text-smx-muted">Nenhum device encontrado.</div>
        ) : (
          devices.map(d => (
            <Link
              key={d.id}
              to={`/devices/${d.id}`}
              className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.6fr] px-5 py-4 border-b border-smx-line hover:bg-smx-panel2 transition"
            >
              <div className="font-medium">{d.name}</div>
              <div className="text-smx-muted">{d.ip}</div>
              <div className="text-smx-muted">{d.model}</div>
              <div className="text-smx-muted">{d.fw}</div>
              <div className={d.online ? "text-smx-red" : "text-smx-muted"}>
                {d.online ? "ONLINE" : "OFFLINE"}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
