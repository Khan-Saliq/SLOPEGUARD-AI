import { useNavigate } from 'react-router-dom';
import { useMonitorData } from '../hooks/useMonitorData';
import { useApp } from '../hooks/useApp';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WifiOff, Eye, UserCircle } from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, isOffline, setIsOffline, reducedMotion, setReducedMotion } = useApp();
  const { pendingSyncCount, syncPendingReports } = useMonitorData();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure preferences, accessibility, and demo options</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-4 w-4" /> Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/20 text-xl font-bold text-sky-400">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <div>
              <p className="text-base font-medium text-white">{user?.name ?? 'Unknown'}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role ?? 'guest'}</p>
              {user?.role === 'citizen' && (
                <p className="text-xs text-sky-400 mt-1">Trust Score: {user?.trustScore ?? '--'}%</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={() => { logout(); navigate('/login'); }}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language and theme toggles removed per settings */}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Accessibility</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Reduced Motion</p>
              <p className="text-xs text-slate-500">Minimize animations and 3D effects</p>
            </div>
            <button
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`relative h-7 w-12 rounded-full transition-colors ${reducedMotion ? 'bg-sky-600' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${reducedMotion ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><WifiOff className="h-4 w-4" /> Offline Demo</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Simulate Offline Mode</p>
              <p className="text-xs text-slate-500">Test offline reporting and pending sync UI</p>
            </div>
            <button
              onClick={() => setIsOffline(!isOffline)}
              className={`relative h-7 w-12 rounded-full transition-colors ${isOffline ? 'bg-amber-600' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isOffline ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {pendingSyncCount > 0 && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => syncPendingReports()}>
                Sync {pendingSyncCount} Pending Report(s)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="text-sm text-slate-400">
            SLOPEGUARD AI — AI-Based Early Warning and Landslide Risk Monitoring System for the North Eastern Region (NER).
            Frontend prototype v1.0 — PS_26001
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Combines rainfall, soil moisture, satellite imagery, terrain data, historical records,
            GIS visualization, AI/ML prediction, and geo-tagged citizen reporting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
