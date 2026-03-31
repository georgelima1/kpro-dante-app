import { Navigate, Route, Routes } from "react-router-dom";
import DevicesPage from "./DevicesPage";
import DeviceLayout from "./DeviceLayout";
import DashboardDevicePage from "./DashboardDevicePage";
import UserPresetPage from "./UserPresetPage";
import InputPage from "./InputPage";
import DelayPage from "./DelayPage";
import FiltersPage from "./FiltersPage";
import SpeakerPresetPage from "./SpeakerPresetPage";
import SpeakerPresetFilterPage from "./SpeakerPresetFiltersPage";
import SpeakerPresetDelayPage from "./SpeakerPresetDelayPage";
import SpeakerPresetFIRPage from "./SpeakerPresetFIRPage";
import SpeakerPresetLimiterPage from "./SpeakerPresetLimiterPage";
import SpeakerPresetPolarityPage from "./SpeakerPresetPolarityPage";

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
        <Route path="preset" element={<UserPresetPage />} />
        <Route path="filters" element={<FiltersPage />} />
        <Route path="speaker" element={<SpeakerPresetPage />} />
        <Route path="speaker/filters" element={<SpeakerPresetFilterPage />} />
        <Route path="speaker/fir" element={<SpeakerPresetFIRPage />} />
        <Route path="speaker/delay" element={<SpeakerPresetDelayPage />} />
        <Route path="speaker/limiter" element={<SpeakerPresetLimiterPage />} />
        <Route path="speaker/polarity" element={<SpeakerPresetPolarityPage />} />
      </Route>

    </Routes>
  );
}