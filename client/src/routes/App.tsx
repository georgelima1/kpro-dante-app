import { Navigate, Route, Routes } from "react-router-dom";
import DevicesPage from "./DevicesPage";
import DeviceLayout from "./DeviceLayout";
import DashboardDevicePage from "./DashboardDevicePage";
import InputPage from "./InputPage";
import RoutingPage from "./RoutingPage";
import DelayPage from "./DelayPage";
import FiltersPage from "./FiltersPage";
import SpeakerPresetPage from "./SpeakerPresetPage";
import SpeakerPresetFilterPage from "./SpeakerPresetFiltersPage";
import SpeakerPresetFIRPage from "./SpeakerPresetFIRPage";

import React from "react";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/devices" replace />} />
      <Route path="/devices" element={<DevicesPage />} />

      {/* ✅ Sem header de canais */}
      <Route path="/devices/:id" element={<DashboardDevicePage />} />
      <Route path="/devices/:id/input" element={<InputPage />} />

      {/* ✅ Com header fixo + seleção de CH */}
      <Route path="/devices/:id/*" element={<DeviceLayout />}>
        <Route path="routing" element={<RoutingPage />} />
        <Route path="delay" element={<DelayPage />} />
        <Route path="filters" element={<FiltersPage />} />
        <Route path="speaker" element={<SpeakerPresetPage />} />
        <Route path="speaker/filters" element={<SpeakerPresetFilterPage />} />
        <Route path="speaker/fir" element={<SpeakerPresetFIRPage />} />
      </Route>
        
    </Routes>
  );
}