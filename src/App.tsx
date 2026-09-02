import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './hooks/useApp';
import { MonitorDataProvider } from './hooks/useMonitorData';
import { LanguageProvider } from './hooks/useLanguage';
import { ThemeProvider } from './hooks/useTheme';
import RequireRole from './components/auth/RequireRole';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RoadsPage } from './pages/RoadsPage';
import SafeRoutePage from './pages/SafeRoutePage';
import { EmergencyPage } from './pages/EmergencyPage';
import AssignmentsPage from './pages/AssignmentsPage';
import NotificationsPage from './pages/NotificationsPage';
import { CitizenHomePage } from './pages/CitizenHomePage';
import { ReportHazardPage } from './pages/ReportHazardPage';
import { ReportHistoryPage } from './pages/ReportHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function RoleHome() {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'authority' ? '/dashboard' : '/citizen'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppProvider>
          <MonitorDataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/welcome" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route element={<Layout />}>
                <Route path="portal" element={<RoleHome />} />
                <Route path="dashboard" element={<RequireRole roles={[ 'authority' ]}><DashboardPage /></RequireRole>} />
                <Route path="map" element={<RequireRole roles={[ 'authority','field_official' ]}><MapPage /></RequireRole>} />
                <Route path="alerts" element={<RequireRole roles={[ 'authority','field_official' ]}><AlertsPage /></RequireRole>} />
                <Route path="analytics" element={<RequireRole roles={[ 'authority' ]}><AnalyticsPage /></RequireRole>} />
                <Route path="roads" element={<RequireRole roles={[ 'authority' ]}><RoadsPage /></RequireRole>} />
                <Route path="safe-route" element={<SafeRoutePage />} />
                <Route path="assignments" element={<RequireRole roles={[ 'authority','field_official' ]}><AssignmentsPage /></RequireRole>} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="emergency" element={<RequireRole roles={[ 'authority','field_official' ]}><EmergencyPage /></RequireRole>} />
                <Route path="citizen" element={<CitizenHomePage />} />
                <Route path="report" element={<ReportHazardPage />} />
                <Route path="history" element={<ReportHistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          </MonitorDataProvider>
        </AppProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
