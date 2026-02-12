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

      <Route path="/devices/:id" element={<DeviceLayout />}>
        <Route index element={<DashboardDevicePage />} />
        <Route path="routing" element={<RoutingPage />} />
        <Route path="delay" element={<DelayPage />} />
        <Route path="eq" element={<EqPage />} />
        <Route path="speaker" element={<SpeakerPresetPage />} />
      </Route>
    </Routes>
  );
}
