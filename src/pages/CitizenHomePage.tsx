import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useMonitorData } from '../hooks/useMonitorData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { RiskBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  MapPin,
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  Navigation,
  CloudRain,
  Droplets,
  Layers,
  Locate,
  CheckCircle2,
  Bell,
  RefreshCw,
} from 'lucide-react';

export function CitizenHomePage() {
  const { riskZones, alerts, shelters, hospitals, refreshRiskZones, isLoading } = useMonitorData();

  // Location auto-detection state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Default NER location fallback (Shillong, Meghalaya)
  const DEFAULT_LOCATION = { lat: 25.5788, lng: 91.8933, name: 'Shillong, Meghalaya' };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationMode('manual');
      setUserLocation(DEFAULT_LOCATION);
      setLocationError('GPS not supported by browser. Using default monitoring region.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: parseFloat(pos.coords.latitude.toFixed(4)),
          lng: parseFloat(pos.coords.longitude.toFixed(4)),
          name: 'Current GPS Location',
        });
        setLocationMode('auto');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation denied/failed:', err);
        setUserLocation(DEFAULT_LOCATION);
        setLocationMode('manual');
        setLocationError('GPS permission denied. Operating in manual location fallback mode.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const activeLoc = userLocation || DEFAULT_LOCATION;

  // Find nearest risk zone or highest risk zone nearby
  const criticalZones = (riskZones || []).filter((z) => z.riskLevel === 'critical' || z.riskLevel === 'high');
  const nearbyRisk = criticalZones.length > 0 ? criticalZones.slice(0, 3) : (riskZones || []).slice(0, 3);
  const activeAlerts = (alerts || []).filter((a) => !a.acknowledged);

  // Local environmental metrics
  const avgRainfall = riskZones.length > 0 ? Math.round(riskZones.reduce((acc, z) => acc + (z.rainfall || 0), 0) / riskZones.length) : 120;
  const avgSoilMoisture = riskZones.length > 0 ? Math.round(riskZones.reduce((acc, z) => acc + (z.soilMoisture || 0), 0) / riskZones.length) : 68;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center">
        <img src="/logo.png" alt="SLOPEGUARD AI Logo" className="h-16 w-16 mb-2 object-contain drop-shadow-md" />
        <h1 className="font-display text-2xl font-bold text-main">SLOPEGUARD AI</h1>
        <p className="text-xs text-accent-bright font-mono uppercase tracking-wider mt-1">
          Automated Landslide Risk Early Warning Platform
        </p>
      </motion.div>

      {/* Location Status & Detector Bar */}
      <Card className="border-accent/40 bg-card/90 shadow-lg">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${locationMode === 'auto' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-main">Monitoring Location:</span>
                <span className="text-xs font-bold text-white">{activeLoc.name}</span>
                {locationMode === 'auto' ? (
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> GPS Auto-Detected
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Manual Location Selected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-dim font-mono mt-0.5">
                Lat: {activeLoc.lat}° N, Lng: {activeLoc.lng}° E · Auto-refresh active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={detectLocation}
              disabled={isLocating}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Locate className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Detecting...' : 'Re-Detect GPS'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshRiskZones()}
              disabled={isLoading}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Telemetry
            </Button>
          </div>
        </CardContent>
        {locationError && (
          <div className="px-4 pb-3 text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {locationError}
          </div>
        )}
      </Card>

      {/* Main Evacuation Call to Action */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <Link to="/safe-route">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent-bright via-accent to-accent-bright p-6 text-slate-950 shadow-2xl cursor-pointer group transition-transform hover:scale-[1.01]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950/20 backdrop-blur-sm shrink-0">
                  <Navigation className="h-7 w-7 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">Safe Evacuation Route Engine</h2>
                  <p className="text-xs font-medium text-slate-900/80 mt-0.5">
                    Real-time hazard-aware routing away from active landslide risk corridors and blocked roads
                  </p>
                </div>
              </div>
              <Button className="bg-slate-950 text-white hover:bg-slate-900 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg">
                Calculate Safe Route <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Live Environmental Telemetry & Threat Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
              <CloudRain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-dim font-medium">Regional 24h Rain</p>
              <p className="text-xl font-bold text-main font-mono">{avgRainfall} mm</p>
              <p className="text-[10px] text-emerald-400">Open-Meteo Live API</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-dim font-medium">Soil Pore Moisture</p>
              <p className="text-xl font-bold text-main font-mono">{avgSoilMoisture} %</p>
              <p className="text-[10px] text-accent-bright">Soil Saturation Level</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-dim font-medium">Active High Risk Zones</p>
              <p className="text-xl font-bold text-main font-mono">{criticalZones.length}</p>
              <p className="text-[10px] text-red-400 font-medium">Automated AI Warnings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active System Warnings & Nearby Vulnerable Slope Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nearby Risk Zones */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-main flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-bright" />
                Monitored Slope Hazard Zones
              </span>
              <Link to="/safe-route" className="text-[11px] text-accent-bright hover:underline font-normal">
                Check Evacuation Routes ➔
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nearbyRisk.map((zone) => (
              <div key={zone.id} className="flex items-center justify-between rounded-xl bg-card-hover/60 p-3 border border-border/40">
                <div>
                  <p className="text-xs font-bold text-main">{zone.name}</p>
                  <p className="text-[10px] text-dim font-mono mt-0.5">
                    {zone.location.district} · Score: {zone.riskScore}/100 · Rain: {zone.rainfall}mm
                  </p>
                </div>
                <RiskBadge level={zone.riskLevel} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live System Alerts Feed */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-main flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                Live Automated Early Warnings
              </span>
              <Link to="/alerts" className="text-[11px] text-accent-bright hover:underline font-normal">
                View All Alerts ➔
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-dim border border-dashed border-border/40 rounded-xl">
                ✓ No active high-severity alerts. Systems operational.
              </div>
            ) : (
              activeAlerts.slice(0, 3).map((alt) => (
                <div key={alt.id} className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      {alt.title}
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                      {alt.riskLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-200/80 mt-1 line-clamp-2">{alt.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emergency Shelters & Hospitals Quick Reference */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-main flex items-center justify-between">
            <span>Verified Disaster Shelters & Relief Facilities</span>
            <span className="text-[10px] text-emerald-400 font-mono">Live Capacity Monitoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shelters.slice(0, 2).map((sh) => (
              <div key={sh.id} className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-main">{sh.name}</p>
                  <p className="text-[10px] text-dim">{sh.location.area || sh.district}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">
                  {sh.capacity - sh.currentOccupancy} Beds Free
                </span>
              </div>
            ))}
            {hospitals.slice(0, 2).map((hosp) => (
              <div key={hosp.id} className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-main">{hosp.name}</p>
                  <p className="text-[10px] text-dim">{hosp.location.area || hosp.district}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-pink-600 text-white rounded-full">
                  {hosp.availableICUBeds} ICU Beds
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
