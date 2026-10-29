import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { BureauDashboard } from './components/screens/BureauDashboard';
import { FDRDetail } from './components/screens/FDRDetail';
import { InstitutionUpload } from './components/screens/InstitutionUpload';
import { FraudGraph } from './components/screens/FraudGraph';
import { AlertsEscalation } from './components/screens/AlertsEscalation';
import { ReleaseRequest } from './components/screens/ReleaseRequest';
import { AuditLog } from './components/screens/AuditLog';
import { AdminIntegrations } from './components/screens/AdminIntegrations';
import { Reports } from './components/screens/Reports';
import { LoginScreen } from './components/screens/LoginScreen';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<BureauDashboard />} />
        <Route path="/fdrs" element={<BureauDashboard />} />
        <Route path="/fdrs/:id" element={<FDRDetail />} />
        <Route path="/upload" element={<InstitutionUpload />} />
        <Route path="/fraud-graph" element={<FraudGraph />} />
        <Route path="/alerts" element={<AlertsEscalation />} />
        <Route path="/release" element={<ReleaseRequest />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={<AdminIntegrations />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
