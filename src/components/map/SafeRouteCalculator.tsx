import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  ArrowUpDown,
  Locate,
  Share2,
  Home,
  Hospital as HospitalIcon,
  CheckCircle2,
  AlertOctagon,
  Send,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { SharedEvacuationMap } from './SharedEvacuationMap';
import { useMonitorData } from '../../hooks/useMonitorData';
import { useApp } from '../../hooks/useApp';
import {
  calculateSafeRoute,
  fetchAlternativeRoutes,
  geocodeAddress,
  type RoutePoint,
  type RouteResult,
  type HazardZone,
} from '../../lib/routingService';
import type { RoadStatus, AlternativeRouteOption } from '../../types';

interface SafeRouteCalculatorProps {
  isAdmin?: boolean;
  onSelectRoute?: (routeDetails: {
    origin: string;
    destination: string;
    distanceKm: number;
    estHours: number;
    bypassedHazards: string[];
  }) => void;
}

const QUICK_DESTINATIONS = [
  { name: 'Chooralmala, Wayanad', district: 'Wayanad' },
  { name: 'Meppadi Town, Wayanad', district: 'Wayanad' },
  { name: 'Gaurikund Cut, Rudraprayag', district: 'Rudraprayag' },
  { name: 'Sonprayag Camp, Rudraprayag', district: 'Rudraprayag' },
  { name: 'Sohra Slope, Cherrapunji', district: 'East Khasi Hills' },
  { name: 'Elephant Falls Pass, Shillong', district: 'East Khasi Hills' },
  { name: 'Tashi View Ridge, Gangtok', district: 'Gangtok' },
];

export function SafeRouteCalculator({ isAdmin = false, onSelectRoute }: SafeRouteCalculatorProps) {
  const {
    roads,
    shelters,
    hospitals,
    evacuationRoutes,
    riskZones,
    isLoading,
    refreshRiskZones,
    refreshRoads,
    refreshShelters,
    refreshHospitals,
    refreshEvacuationRoutes,
    updateRoadStatus,
    publishEvacuationRoute,
  } = useMonitorData();
  const { user } = useApp();

  const isUserAdmin = isAdmin || ['authority', 'super_admin'].includes(user?.role || '');

  const DEFAULT_ORIGIN = 'Shillong, Meghalaya';
  const DEFAULT_DESTINATION = 'Sohra Slope, Cherrapunji';

  const [originInput, setOriginInput] = useState<string>(DEFAULT_ORIGIN);
  const [destinationInput, setDestinationInput] = useState<string>(DEFAULT_DESTINATION);
  const [originPoint, setOriginPoint] = useState<RoutePoint | null>({ lat: 25.57, lng: 91.88, name: DEFAULT_ORIGIN });
  const [destPoint, setDestPoint] = useState<RoutePoint | null>({ lat: 25.27, lng: 91.73, name: DEFAULT_DESTINATION });

  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const [activeRouteResult, setActiveRouteResult] = useState<RouteResult & { hazardAnalysis?: any } | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeRouteOption[]>([]);
  const [selectedAltIndex, setSelectedAltIndex] = useState<number>(0);

  // Admin mutation states
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Convert blocked/vulnerable roads to hazard zones
  const hazardZones: HazardZone[] = useMemo(() => {
    return (roads || [])
      .filter(r => r.status === 'blocked' || r.status === 'damaged' || r.status === 'vulnerable')
      .map(road => {
        const coords = road.coordinates;
        const lat = Array.isArray(coords) && coords.length > 0 ? coords[0][0] : 25.5;
        const lng = Array.isArray(coords) && coords.length > 0 ? coords[0][1] : 91.8;

        return {
          lat: typeof lat === 'number' ? lat : 25.5,
          lng: typeof lng === 'number' ? lng : 91.8,
          radius: road.status === 'blocked' ? 6000 : 3500,
          severity: road.riskLevel || 'high',
          name: road.name,
        };
      });
  }, [roads]);

  const runRouteCalculation = useCallback(
    async (start: RoutePoint, end: RoutePoint) => {
      setIsCalculating(true);
      setError(null);
      setPublishSuccess(null);

      try {
        const primaryRoute = await calculateSafeRoute(start, end, hazardZones, { preferORS: true });
        setActiveRouteResult(primaryRoute);

        // Fetch alternative options from server
        const alts = await fetchAlternativeRoutes(start, end);
        if (alts && alts.length > 0) {
          setAlternatives(alts);
          setSelectedAltIndex(0);
        } else {
          setAlternatives([]);
        }

        if (onSelectRoute) {
          onSelectRoute({
            origin: start.name || `${start.lat},${start.lng}`,
            destination: end.name || `${end.lat},${end.lng}`,
            distanceKm: primaryRoute.distance,
            estHours: primaryRoute.duration,
            bypassedHazards: primaryRoute.hazardAnalysis?.warnings || [],
          });
        }
      } catch (err: any) {
        console.error('Route calculation error:', err);
        setError(err.message || 'Unable to calculate safe route. Please check location inputs.');
      } finally {
        setIsCalculating(false);
      }
    },
    [hazardZones, onSelectRoute]
  );

  // Initial calculation on mount
  useEffect(() => {
    if (originPoint && destPoint) {
      runRouteCalculation(originPoint, destPoint);
    }
  }, []);

  const handleCalculateClick = async () => {
    if (!originInput.trim() || !destinationInput.trim()) {
      setError('Please provide both starting origin and evacuation destination');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      let start = originPoint;
      if (!start || start.name !== originInput) {
        start = await geocodeAddress(originInput);
      }

      let end = destPoint;
      if (!end || end.name !== destinationInput) {
        end = await geocodeAddress(destinationInput);
      }

      if (!start) throw new Error(`Location not found: "${originInput}". Please select a valid place.`);
      if (!end) throw new Error(`Location not found: "${destinationInput}". Please select a valid place.`);

      setOriginPoint(start);
      setDestPoint(end);

      await runRouteCalculation(start, end);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve locations');
      setIsCalculating(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = parseFloat(position.coords.latitude.toFixed(4));
        const lng = parseFloat(position.coords.longitude.toFixed(4));
        const point: RoutePoint = { lat, lng, name: 'My Current Location' };

        setOriginInput('My Current Location');
        setOriginPoint(point);
        setIsLocating(false);

        if (destPoint) {
          runRouteCalculation(point, destPoint);
        }
      },
      () => {
        setIsLocating(false);
        setError('Unable to retrieve GPS location. Please type your location manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSwapLocations = () => {
    const tempInput = originInput;
    const tempPoint = originPoint;

    setOriginInput(destinationInput);
    setOriginPoint(destPoint);

    setDestinationInput(tempInput);
    setDestPoint(tempPoint);

    if (destPoint && tempPoint) {
      runRouteCalculation(destPoint, tempPoint);
    }
  };

  const handleDragStartPoint = (lat: number, lng: number) => {
    const updated: RoutePoint = { lat, lng, name: `Custom Start (${lat.toFixed(3)}, ${lng.toFixed(3)})` };
    setOriginPoint(updated);
    setOriginInput(updated.name!);
    if (destPoint) runRouteCalculation(updated, destPoint);
  };

  const handleDragDestPoint = (lat: number, lng: number) => {
    const updated: RoutePoint = { lat, lng, name: `Custom Dest (${lat.toFixed(3)}, ${lng.toFixed(3)})` };
    setDestPoint(updated);
    setDestinationInput(updated.name!);
    if (originPoint) runRouteCalculation(originPoint, updated);
  };

  // Convert geometry coordinates from [lng, lat] to [lat, lng] for Leaflet display
  const currentGeometry: [number, number][] = useMemo(() => {
    if (alternatives.length > 0 && alternatives[selectedAltIndex]) {
      const altGeo = alternatives[selectedAltIndex].geometry;
      return altGeo.map(c => [c[1], c[0]]);
    }
    if (activeRouteResult?.geometry) {
      return activeRouteResult.geometry.map(c => [c[1], c[0]]);
    }
    return [];
  }, [alternatives, selectedAltIndex, activeRouteResult]);

  const activeDistance = alternatives[selectedAltIndex]?.distanceKm ?? activeRouteResult?.distance ?? 0;
  const activeDuration = alternatives[selectedAltIndex]?.durationHours ?? activeRouteResult?.duration ?? 0;
  const activeStatus = alternatives[selectedAltIndex]?.routeStatus ?? 'NORMAL';

  // Admin: Publish Route as Official Evacuation Route
  const handlePublishRoute = async () => {
    if (!originPoint || !destPoint || currentGeometry.length === 0) return;
    setPublishing(true);
    setPublishSuccess(null);

    try {
      await publishEvacuationRoute({
        title: `Evacuation Route: ${originInput} ➔ ${destinationInput}`,
        originName: originInput,
        destinationName: destinationInput,
        district: originPoint.name?.split(',')[1]?.trim() || 'Evacuation Corridor',
        coordinates: currentGeometry,
        distanceKm: activeDistance,
        estHours: activeDuration,
        status: 'published',
        safetyRating: activeStatus === 'NORMAL' ? 'RECOMMENDED' : activeStatus === 'CAUTION' ? 'CAUTION' : 'WARNING',
        warnings: activeRouteResult?.warnings || [],
      });
      setPublishSuccess('✓ Evacuation Route successfully published to Citizen Emergency Network!');
    } catch (err: any) {
      setError('Failed to publish evacuation route: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopySummary = () => {
    const text = `🚨 EMERGENCY EVACUATION ROUTE ADVISORY\nFrom: ${originInput}\nTo: ${destinationInput}\nDistance: ${activeDistance.toFixed(1)} km\nEstimated Travel Time: ${(activeDuration * 60).toFixed(0)} mins\nRoute Safety Status: ${activeStatus}\n\nKey Hazards & Advisories:\n${(activeRouteResult?.warnings || []).join('\n')}\n\nStay alert and monitor Landslide Emergency Command.`;
    navigator.clipboard.writeText(text);
    setCopiedMessage('Copied to clipboard!');
    setTimeout(() => setCopiedMessage(null), 3000);
  };

  const handleSyncLiveTelemetry = async () => {
    await Promise.all([
      refreshRiskZones(),
      refreshRoads(),
      refreshShelters(),
      refreshHospitals(),
      refreshEvacuationRoutes(),
    ]);
    if (originPoint && destPoint) {
      runRouteCalculation(originPoint, destPoint);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-accent/40 bg-card/90 shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2 text-foreground font-bold">
              <Navigation className="h-5 w-5 text-accent-bright" />
              Real-Time Evacuation Route Planner
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSyncLiveTelemetry}
                disabled={isLoading}
                className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold hover:bg-emerald-500/30 transition-colors"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin text-emerald-400" /> : <RefreshCw className="h-3 w-3 text-emerald-400" />}
                🔴 LIVE TELEMETRY STREAM
              </button>

              {isUserAdmin && (
                <span className="text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                  <ShieldAlert className="h-3 w-3" /> ADMIN OPERATIONAL MODE
                </span>
              )}
              <span className="text-[10px] font-mono bg-accent/20 text-accent-bright px-2.5 py-1 rounded-full border border-accent/40 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> OpenRouteService Engine
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {/* Origin & Destination Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Origin Input */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Start Origin</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="text-[10px] text-accent-bright hover:underline flex items-center gap-1 font-normal"
                >
                  {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Locate className="w-3 h-3" />}
                  Use My Location
                </button>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500" />
                <input
                  value={originInput}
                  onChange={e => setOriginInput(e.target.value)}
                  placeholder="Enter starting location..."
                  className="w-full rounded-lg border border-border bg-card-hover pl-9 pr-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-accent-bright"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="md:col-span-2 flex justify-center pt-2 md:pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSwapLocations}
                title="Swap Start & Destination"
                className="rounded-full p-2 border-border hover:bg-accent/20 text-foreground"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Destination Input */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-foreground">Evacuation Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-red-500" />
                <input
                  value={destinationInput}
                  onChange={e => setDestinationInput(e.target.value)}
                  placeholder="Enter destination location..."
                  className="w-full rounded-lg border border-border bg-card-hover pl-9 pr-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-accent-bright"
                />
              </div>
            </div>
          </div>

          {/* Quick Destination Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Quick Destinations:</span>
            {QUICK_DESTINATIONS.map(item => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setDestinationInput(item.name);
                  geocodeAddress(item.name).then(pt => {
                    if (pt) {
                      setDestPoint(pt);
                      if (originPoint) runRouteCalculation(originPoint, pt);
                    }
                  });
                }}
                className="px-2.5 py-1 rounded-full text-[10px] bg-muted/60 hover:bg-accent/20 hover:text-accent-bright border border-border text-foreground transition-colors"
              >
                📍 {item.name.split(',')[0]}
              </button>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <Button
              onClick={handleCalculateClick}
              disabled={isCalculating}
              className="bg-accent-bright hover:bg-accent text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Calculating Safe Route...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" /> Calculate Safest Evacuation Route
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopySummary} className="text-xs flex items-center gap-1 text-foreground">
                <Share2 className="w-3.5 h-3.5" /> Share Summary
              </Button>
              {copiedMessage && <span className="text-[11px] text-emerald-500 font-semibold">{copiedMessage}</span>}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Interactive Map & Panel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Column */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border/60 bg-card p-2 shadow-xl">
            <SharedEvacuationMap
              height="550px"
              center={originPoint ? [originPoint.lat, originPoint.lng] : [25.5, 92.0]}
              zoom={10}
              startPoint={originPoint}
              destPoint={destPoint}
              routeGeometry={currentGeometry}
              alternativeGeometries={alternatives
                .filter((_, idx) => idx !== selectedAltIndex)
                .map((alt, i) => ({
                  id: alt.id || `alt-${i}`,
                  geometry: alt.geometry.map(c => [c[1], c[0]]),
                  color: '#94a3b8',
                }))}
              onStartPointDrag={handleDragStartPoint}
              onDestPointDrag={handleDragDestPoint}
              roads={roads}
              riskZones={riskZones}
              shelters={shelters}
              hospitals={hospitals}
              evacuationRoutes={evacuationRoutes}
            />
          </Card>

          {/* Admin Operational Actions Box */}
          {isUserAdmin && (
            <Card className="border-red-500/40 bg-red-950/20 shadow-xl backdrop-blur-md p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-red-500/30 pb-2">
                <h4 className="text-xs font-bold text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Admin Evacuation Command & Control
                </h4>
                <span className="text-[10px] text-red-300 font-mono">AUTHORIZED ONLY</span>
              </div>

              {publishSuccess && (
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {publishSuccess}
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <Button
                  onClick={handlePublishRoute}
                  disabled={publishing || currentGeometry.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish as Official Evacuation Route
                </Button>

                <div className="text-[11px] text-muted-foreground font-medium">
                  {evacuationRoutes.length} Published Routes Active
                </div>
              </div>

              {/* Road Status Quick Updater */}
              <div className="pt-2 border-t border-red-500/20 space-y-2">
                <p className="text-[11px] font-semibold text-foreground">Quick Road Status Control:</p>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {roads.slice(0, 4).map(rd => (
                    <div key={rd.id} className="p-2 rounded bg-card/80 border border-border/60 flex items-center justify-between gap-2 text-foreground">
                      <span className="font-semibold text-[11px]">{rd.name}</span>
                      <div className="flex items-center gap-1">
                        {(['operational', 'vulnerable', 'blocked', 'damaged'] as RoadStatus[]).map(st => (
                          <button
                            key={st}
                            onClick={() => updateRoadStatus(rd.id, st, `Status updated by Admin`)}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                              rd.status === st ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {st[0].toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Route Details Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Route Summary Card */}
          <Card className="border-accent/40 bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Calculated Route</span>
                <h3 className="text-sm font-bold text-foreground">
                  {originInput.split(',')[0]} ➔ {destinationInput.split(',')[0]}
                </h3>
              </div>

              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border ${
                  activeStatus === 'NORMAL'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : activeStatus === 'CAUTION'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
              >
                {activeStatus === 'NORMAL' ? '✓ SAFE ROUTE' : activeStatus}
              </span>
            </div>

            {/* Stats Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-card-hover border border-border/50">
                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-accent-bright" /> Distance
                </span>
                <span className="text-xl font-extrabold text-foreground">{activeDistance.toFixed(1)} km</span>
              </div>

              <div className="p-3 rounded-lg bg-card-hover border border-border/50">
                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-accent-bright" /> Est Travel Time
                </span>
                <span className="text-xl font-extrabold text-foreground">{(activeDuration * 60).toFixed(0)} mins</span>
              </div>
            </div>

            {/* Alternative Routes Comparison Tabs */}
            {alternatives.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-xs font-bold text-foreground">Alternative Route Options:</span>
                <div className="grid grid-cols-1 gap-2">
                  {alternatives.map((alt, idx) => (
                    <button
                      key={alt.id || idx}
                      type="button"
                      onClick={() => setSelectedAltIndex(idx)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedAltIndex === idx
                          ? 'border-accent-bright bg-accent/15 text-foreground shadow-md'
                          : 'border-border/60 bg-card-hover text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{alt.name}</span>
                        {alt.isRecommended && (
                          <span className="px-2 py-0.5 text-[9px] bg-emerald-600 text-white font-bold rounded">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 text-muted-foreground">
                        <span>{alt.distanceKm.toFixed(1)} km | {(alt.durationHours * 60).toFixed(0)} mins</span>
                        <span className="font-semibold">{alt.summary}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hazard Warnings */}
            {activeRouteResult?.warnings && activeRouteResult.warnings.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1 text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> Active Route Hazard Advisories
                </span>
                <ul className="space-y-1 text-amber-200 text-[11px] list-disc list-inside">
                  {activeRouteResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Turn by Turn Instructions */}
            {activeRouteResult?.instructions && activeRouteResult.instructions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-accent-bright" /> Turn-by-Turn Directions
                </span>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {activeRouteResult.instructions.map((step, i) => (
                    <div key={i} className="p-2 rounded bg-card-hover border border-border/40 flex items-start gap-2 text-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent-bright text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium leading-snug">{step.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {step.distance ? `${step.distance.toFixed(1)} km` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby Emergency Shelters & Hospitals */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-xs font-bold text-foreground">Nearby Evacuation Facilities:</span>
              <div className="space-y-2 text-xs">
                {shelters.slice(0, 2).map(sh => (
                  <div key={sh.id} className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-foreground">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <p className="font-bold text-[11px]">{sh.name}</p>
                        <p className="text-[10px] text-muted-foreground">{sh.location.area || sh.district}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded">
                      {sh.capacity - sh.currentOccupancy} Beds Available
                    </span>
                  </div>
                ))}

                {hospitals.slice(0, 2).map(hosp => (
                  <div key={hosp.id} className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-between text-foreground">
                    <div className="flex items-center gap-2">
                      <HospitalIcon className="w-4 h-4 text-pink-400 shrink-0" />
                      <div>
                        <p className="font-bold text-[11px]">{hosp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{hosp.location.area || hosp.district}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-pink-600 text-white rounded">
                      {hosp.availableICUBeds} ICU Beds
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
