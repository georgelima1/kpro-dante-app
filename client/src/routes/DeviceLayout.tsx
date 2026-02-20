import React from "react";
import { useNavigate, useParams, Outlet, useSearchParams } from "react-router-dom";
import { DeviceProvider } from "../state/DeviceContext";
import ChannelHeader from "../ui/ChannelHeader";

export default function DeviceLayout() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();

  if (!id) return <div className="text-sm text-smx-muted">Device não informado.</div>;

  const ch = Number(sp.get("ch") ?? "1");

  function onSelectCh(next: number) {
    sp.set("ch", String(next));
    setSp(sp, { replace: true });
  }

  return (
    <DeviceProvider deviceId={id}>
      <div className="space-y-6">
        <ChannelHeader />
        <Outlet />
      </div>
    </DeviceProvider>
  );
}
