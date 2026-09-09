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
  Camera,
  FileText,
  Building,
} from 'lucide-react';

export function CitizenHomePage() {
  const { riskZones, alerts, shelters, hospitals, refreshRiskZones, isLoading } = useMonitorData();

  // Location auto-detection state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name: string; area?: string; district?: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Default NER location fallback (Shillong, Meghalaya)
  const DEFAULT_LOCATION = { lat: 25.5788, lng: 91.8933, name: 'Shillong Hill Sector, Shillong', area: 'Shillong Hill Sector', district: 'East Khasi Hills' };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationMode('manual');
      setUserLocation(DEFAULT_LOCATION);
      setLocationError('GPS not supported by browser. Operating in regional default mode.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latVal = parseFloat(pos.coords.latitude.toFixed(5));
        const lngVal = parseFloat(pos.coords.longitude.toFixed(5));
        let area = 'Shillong Hill Sector';
        let city = 'Shillong';
        let dist = 'East Khasi Hills';

        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latVal}&lon=${lngVal}&format=json`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.road || area;
            city = addr.city || addr.town || addr.city_district || addr.state_district || addr.county || city;
            dist = addr.state_district || addr.county || addr.city_district || dist;
          }
        } catch (e) {}

        const locName = `${area}, ${city}`;
        setUserLocation({ lat: latVal, lng: lngVal, name: locName, area, district: dist });
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

  // Find critical risk zones nearby
  const criticalZones = (riskZones || []).filter((z) => z.riskLevel === 'critical' || z.riskLevel === 'high');
  const nearbyRisk = criticalZones.length > 0 ? criticalZones.slice(0, 3) : (riskZones || []).slice(0, 3);
  const activeAlerts = (alerts || []).filter((a) => !a.acknowledged);

  // Local environmental metrics
  const avgRainfall = riskZones.length > 0 ? Math.round(riskZones.reduce((acc, z) => acc + (z.rainfall || 0), 0) / riskZones.length) : 142;
  const avgSoilMoisture = riskZones.length > 0 ? Math.round(riskZones.reduce((acc, z) => acc + (z.soilMoisture || 0), 0) / riskZones.length) : 74;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center flex flex-col items-center pt-2"
      >
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
          <img src="/logo.png" alt="Giri Raksha Logo" className="relative h-16 w-16 object-contain drop-shadow-xl" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">Giri Raksha</h1>
        <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest mt-1 font-bold">
          AI-Based Landslide Risk Monitoring & Early Warning System · Citizen Portal
        </p>
      </motion.div>

      {/* Quick Action Bar: Report Hazard & Safe Routes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/report">
          <Card className="p-5 bg-gradient-to-br from-cyan-950/60 to-slate-900 border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer group shadow-xl hover:shadow-cyan-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Report Hazard</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Upload evidence photo & GPS location</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Card>
        </Link>

        <Link to="/my-reports">
          <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-slate-200 transition-colors">My Reports</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Track AI inspection & admin dispatch</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Card>
        </Link>

        <Link to="/safe-route">
          <Card className="p-5 bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group shadow-xl hover:shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Safe Routes</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Dynamic hazard-free navigation</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Location Status & Detector Card */}
      <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 ${locationMode === 'auto' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400">Monitoring Sector:</span>
                <span className="text-xs font-bold text-white">{activeLoc.name}</span>
                {locationMode === 'auto' ? (
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Exact GPS Acquired
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Regional Fallback
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Coordinates: {activeLoc.lat}° N, {activeLoc.lng}° E · Real-Time Telemetry Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={detectLocation}
              disabled={isLocating}
              className="text-xs font-semibold border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
            >
              <Locate className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Detecting...' : 'Re-Detect GPS'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshRiskZones()}
              disabled={isLoading}
              className="text-xs font-semibold border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Telemetry
            </Button>
          </div>
        </CardContent>
        {locationError && (
          <div className="px-5 pb-3 text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {locationError}
          </div>
        )}
      </Card>

      {/* Main Evacuation Call to Action Banner */}
      <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <Link to="/safe-route">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 p-6 text-slate-950 shadow-2xl cursor-pointer group transition-transform hover:scale-[1.005]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950/20 backdrop-blur-sm shrink-0">
                  <Navigation className="h-7 w-7 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-950">Safe Evacuation Route Engine</h2>
                  <p className="text-xs font-medium text-slate-950/80 mt-0.5">
                    Real-time hazard-aware routing away from active landslide risk corridors and blocked roads
                  </p>
                </div>
              </div>
              <Button className="bg-slate-950 text-white hover:bg-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xl">
                Calculate Safe Route <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Live Environmental Telemetry & Threat Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="pt-5 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
              <CloudRain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Regional 24h Rain</p>
              <p className="text-2xl font-extrabold text-white font-mono">{avgRainfall} mm</p>
              <p className="text-[10px] text-emerald-400 font-semibold">Open-Meteo Live API</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="pt-5 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Soil Pore Moisture</p>
              <p className="text-2xl font-extrabold text-white font-mono">{avgSoilMoisture} %</p>
              <p className="text-[10px] text-cyan-400 font-semibold">Saturation Level</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="pt-5 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Active High Risk Zones</p>
              <p className="text-2xl font-extrabold text-white font-mono">{criticalZones.length}</p>
              <p className="text-[10px] text-red-400 font-semibold">Automated AI Warnings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active System Warnings & Nearby Vulnerable Slope Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nearby Risk Zones */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Monitored Slope Hazard Zones
              </span>
              <Link to="/safe-route" className="text-[11px] text-cyan-400 hover:underline font-normal">
                Check Routes ➔
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {nearbyRisk.map((zone) => (
              <div key={zone.id} className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 border border-slate-800/80">
                <div>
                  <p className="text-xs font-bold text-white">{zone.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {zone.location.district} · Score: {zone.riskScore}/100 · Rain: {zone.rainfall}mm
                  </p>
                </div>
                <RiskBadge level={zone.riskLevel} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live System Alerts Feed */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                Live Automated Early Warnings
              </span>
              <Link to="/alerts" className="text-[11px] text-cyan-400 hover:underline font-normal">
                View All Alerts ➔
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {activeAlerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                ✓ No active high-severity alerts. Systems operational.
              </div>
            ) : (
              activeAlerts.slice(0, 3).map((alt) => (
                <div key={alt.id} className="rounded-xl bg-red-950/40 border border-red-500/30 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      {alt.title}
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-bold border border-red-500/30">
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
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-400" /> Verified Disaster Shelters & Relief Facilities
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Live Capacity Monitoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shelters.slice(0, 2).map((sh) => (
              <div key={sh.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{sh.name}</p>
                  <p className="text-[10px] text-slate-400">{sh.location.area || sh.district}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                  {sh.capacity - sh.currentOccupancy} Beds Free
                </span>
              </div>
            ))}
            {hospitals.slice(0, 2).map((hosp) => (
              <div key={hosp.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{hosp.name}</p>
                  <p className="text-[10px] text-slate-400">{hosp.location.area || hosp.district}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
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
