import { Routes, Route, Navigate } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import AppLayout from './layouts/AppLayout';
import AuditListPage from './pages/AuditListPage';
import AuditDetailPage from './pages/AuditDetailPage';
import PlanningPhase from './pages/PlanningPhase';
import ExecutionPhase from './pages/ExecutionPhase';
import ReportingPhase from './pages/ReportingPhase';
import ActionTrackingPhase from './pages/ActionTrackingPhase';
import DocumentsPage from './pages/DocumentsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <AuditProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/audits" element={<AuditListPage />} />
          <Route path="/audits/:id" element={<AuditDetailPage />}>
            <Route index element={<Navigate to="planung" replace />} />
            <Route path="planung" element={<PlanningPhase />} />
            <Route path="durchfuehrung" element={<ExecutionPhase />} />
            <Route path="bericht" element={<ReportingPhase />} />
            <Route path="massnahmen" element={<ActionTrackingPhase />} />
            <Route path="dokumente" element={<DocumentsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuditProvider>
  );
}

export default App;
