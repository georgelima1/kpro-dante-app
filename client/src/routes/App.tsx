import { Navigate, Route, Routes } from "react-router-dom";
import DevicesPage from "./DevicesPage";
import DeviceLayout from "./DeviceLayout";
import DashboardDevicePage from "./DashboardDevicePage";
import RoutingPage from "./RoutingPage";
import DelayPage from "./DelayPage";
import EqPage from "./EqPage";
import SpeakerPresetPage from "./SpeakerPresetPage";
import React from "react";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/devices" replace />} />
      <Route path="/devices" element={<DevicesPage />} />

      {/* ✅ Dashboard sem header de canais */}
      <Route path="/devices/:id" element={<DashboardDevicePage />} />

      {/* ✅ Subpáginas com header fixo + seleção de CH */}
      <Route path="/devices/:id/*" element={<DeviceLayout />}>
        <Route path="routing" element={<RoutingPage />} />
        <Route path="delay" element={<DelayPage />} />
        <Route path="eq" element={<EqPage />} />
        <Route path="speaker" element={<SpeakerPresetPage />} />
      </Route>
    </Routes>
  );
}
