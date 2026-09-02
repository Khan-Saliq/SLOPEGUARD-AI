import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { useMonitorData } from '../hooks/useMonitorData';
import { Card, CardContent } from '../components/ui/Card';
import { RiskBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Camera, MapPin, Shield, AlertTriangle, ChevronRight, WifiOff } from 'lucide-react';

export function CitizenHomePage() {
  const { user, isOffline } = useApp();
  const { riskZones, citizenReports, pendingSyncCount, syncPendingReports } = useMonitorData();
  const nearbyRisk = riskZones.filter(z => z.riskLevel === 'critical' || z.riskLevel === 'high').slice(0, 3);
  const myReports = citizenReports.filter(r => r.userId === user?.id);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center">
        <img src="/logo.png" alt="SLOPEGUARD AI Logo" className="h-16 w-16 mb-2 object-contain drop-shadow-md" />
        <h1 className="font-display text-2xl font-bold text-main">SLOPEGUARD AI</h1>
        <p className="text-sm text-dim mt-1">AI-Powered Early Warning System</p>
      </motion.div>

      {isOffline && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between gap-3 rounded-xl border border-accent-warm/30 bg-accent-warm/10 p-4">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-accent-warm" />
            <div>
              <p className="text-sm font-medium text-accent-warm">Offline</p>
              <p className="text-xs text-accent-warm/70">Pending sync: {pendingSyncCount} report(s)</p>
            </div>
          </div>
          {pendingSyncCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => syncPendingReports()}>Sync Now</Button>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Link to="/report">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-critical to-high p-8 text-center shadow-2xl shadow-critical/25 cursor-pointer group transition-transform hover:scale-[1.02]">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
            >
              <Camera className="h-8 w-8 text-white" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mt-4">Report Hazard</h2>
            <p className="text-sm text-white/80 mt-1">Tap to report cracks, slope movement, or blocked roads</p>
            <ChevronRight className="h-5 w-5 text-white/60 mx-auto mt-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <Shield className="h-8 w-8 text-accent-bright mx-auto" />
              <p className="text-2xl font-bold text-main mt-2">{user?.trustScore ?? '--'}%</p>
            <p className="text-xs text-dim">Trust Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <AlertTriangle className="h-8 w-8 text-accent-warm mx-auto" />
            <p className="text-2xl font-bold text-main mt-2">{myReports.length}</p>
            <p className="text-xs text-dim">Reports Submitted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-semibold text-main flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-critical" />
            Nearby Risk Warnings
          </h3>
          <div className="space-y-2">
            {nearbyRisk.map(zone => (
              <div key={zone.id} className="flex items-center justify-between rounded-lg bg-card-hover px-3 py-2.5">
                <div>
                  <p className="text-sm text-main">{zone.name}</p>
                  <p className="text-[10px] text-dim">{zone.location.district} · score {zone.riskScore}</p>
                </div>
                <RiskBadge level={zone.riskLevel} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Link to="/history">
        <Button variant="outline" className="w-full">
          View My Reports <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
