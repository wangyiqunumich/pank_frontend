import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MAINTENANCE_MODE } from '../config/maintenance';
import MaintenancePage from './MaintenancePage';

export default function MaintenanceGate({ enabled = MAINTENANCE_MODE, children }) {
  if (!enabled) return children;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<MaintenancePage />} />
      </Routes>
    </BrowserRouter>
  );
}
