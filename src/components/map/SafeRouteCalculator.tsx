import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Route, Navigation, AlertOctagon, Clock, ArrowRight, Sparkles, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { calculateSafeRoute, geocodeAddress, type RoutePoint, type RouteResult, type HazardZone } from '../../lib/routingService';
import type { Road, Village } from '../../types';
import 'leaflet/dist/leaflet.css';

interface SafeRouteCalculatorProps {
  roads: Road[];
  villages: Village[];
  onSelectRoute?: (routeDetails: { origin: string; destination: string; distanceKm: number; estHours: number; bypassedHazards: string[] }) => void;
}

// Component to fit map bounds to route
function MapBoundsHandler({ geometry }: { geometry: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (geometry && geometry.length > 0) {
      const bounds = geometry.map(coord => [coord[1], coord[0]] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [geometry, map]);

  return null;
}

export function SafeRouteCalculator({ roads, villages, onSelectRoute }: SafeRouteCalculatorProps) {
  const blockedRoads = (roads || []).filter(r => r.status === 'blocked');

  const DEFAULT_ORIGIN = 'Shillong, Meghalaya';
  const [originInput, setOriginInput] = useState<string>(DEFAULT_ORIGIN);
  const [destinationInput, setDestinationInput] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeRoute, setActiveRoute] = useState<{
    origin: RoutePoint;
    destination: RoutePoint;
    route: RouteResult & { hazardAnalysis?: any };
  } | null>(null);

  // Convert blocked roads to hazard zones
  const hazardZones: HazardZone[] = blockedRoads.map(road => {
    const coords = road.coordinates;
    const lat = Array.isArray(coords) ? coords[0] : 25.5;
    const lng = Array.isArray(coords) ? coords[1] : 91.8;

    return {
      lat: typeof lat === 'number' ? lat : 25.5,
      lng: typeof lng === 'number' ? lng : 91.8,
      radius: 5000, // 5km radius
      severity: road.riskLevel || 'high',
      name: road.name,
    };
  });

  const handleCalculateRoute = async () => {
    if (!originInput.trim() || !destinationInput.trim()) {
      setError('Please enter both origin and destination');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Geocode addresses
      const originPoint = await geocodeAddress(originInput);
      const destPoint = await geocodeAddress(destinationInput);

      if (!originPoint) {
        throw new Error(`Could not find location: ${originInput}`);
      }

      if (!destPoint) {
        throw new Error(`Could not find location: ${destinationInput}`);
      }

      // Calculate route with hazard analysis
      const route = await calculateSafeRoute(originPoint, destPoint, hazardZones, {
        preferORS: true,
      });

      setActiveRoute({
        origin: originPoint,
        destination: destPoint,
        route,
      });

      if (onSelectRoute) {
        onSelectRoute({
          origin: originInput,
          destination: destinationInput,
          distanceKm: route.distance,
          estHours: route.duration,
          bypassedHazards: route.hazardAnalysis?.warnings || [],
        });
      }
    } catch (err: any) {
      console.error('Route calculation error:', err);
      setError(err.message || 'Failed to calculate route');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleQuickSelect = (villageName: string) => {
    setDestinationInput(villageName);
  };

  return (
    <Card className="border-accent/40 bg-card/90 shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-accent-bright" />
            Safe Route Planner with Hazard Analysis
          </span>
          <span className="text-[10px] font-mono bg-accent/20 text-accent-bright px-2.5 py-1 rounded-full border border-accent/40 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Real Road Routing
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Origin & Destination Input */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-main">Origin (Starting Point)</label>
            <input
              value={originInput}
              onChange={e => setOriginInput(e.target.value)}
              placeholder="Enter address or place name"
              className="w-full rounded-lg border border-border bg-card-hover px-3 py-2 text-xs text-main focus:outline-hidden focus:border-accent-bright"
            />
          </div>

          <div className="col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-main">Destination</label>
            <input
              value={destinationInput}
              onChange={e => setDestinationInput(e.target.value)}
              placeholder="Enter address or place name"
              className="w-full rounded-lg border border-border bg-card-hover px-3 py-2 text-xs text-main focus:outline-hidden focus:border-accent-bright"
            />
          </div>

          <div className="col-span-2 flex items-end">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCalculateRoute}
              disabled={isCalculating}
              className="w-full h-[38px] flex items-center justify-center gap-1.5 bg-accent-bright text-black font-bold hover:bg-accent"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Routing...
                </>
              ) : (
                <>
                  <Route className="h-4 w-4" />
                  Find Route
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick select isolated villages */}
        {villages.filter(v => v.connectivityStatus === 'isolated').length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Quick select isolated village:</p>
            <div className="flex flex-wrap gap-2">
              {villages
                .filter(v => v.connectivityStatus === 'isolated')
                .slice(0, 4)
                .map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleQuickSelect(v.name)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                  >
                    📍 {v.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-300">{error}</div>
          </motion.div>
        )}

        {/* Route Results Display */}
        <AnimatePresence>
          {activeRoute && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Route Summary */}
              <div className="rounded-xl border border-accent/30 bg-black/30 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <MapPin className="h-4 w-4 text-accent-bright shrink-0" />
                    <div className="flex items-center gap-2 text-sm overflow-hidden">
                      <span className="font-semibold text-main truncate">{originInput}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-accent-bright shrink-0" />
                      <span className="font-semibold text-accent-bright truncate">{destinationInput}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-dim">Distance</p>
                      <p className="text-sm font-mono font-bold text-accent-bright">
                        {activeRoute.route.distance.toFixed(1)} km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-dim">Est. Time</p>
                      <p className="text-sm font-mono font-bold text-low flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {activeRoute.route.duration.toFixed(1)} hrs
                      </p>
                    </div>
                  </div>
                </div>

                {/* Map Display */}
                <div className="rounded-lg overflow-hidden border border-border/40 h-[300px]">
                  <MapContainer
                    center={[activeRoute.origin.lat, activeRoute.origin.lng]}
                    zoom={10}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Route line */}
                    <Polyline
                      positions={activeRoute.route.geometry.map(coord => [coord[1], coord[0]])}
                      color="#0ea5e9"
                      weight={4}
                      opacity={0.8}
                    />

                    {/* Start marker */}
                    <Marker position={[activeRoute.origin.lat, activeRoute.origin.lng]}>
                      <Popup>
                        <strong>Start:</strong> {originInput}
                      </Popup>
                    </Marker>

                    {/* End marker */}
                    <Marker position={[activeRoute.destination.lat, activeRoute.destination.lng]}>
                      <Popup>
                        <strong>Destination:</strong> {destinationInput}
                      </Popup>
                    </Marker>

                    {/* Hazard zone markers */}
                    {hazardZones.map((hazard, idx) => (
                      <Marker key={idx} position={[hazard.lat, hazard.lng]}>
                        <Popup>
                          <strong>⚠️ Hazard:</strong> {hazard.name}
                          <br />
                          <strong>Severity:</strong> {hazard.severity}
                        </Popup>
                      </Marker>
                    ))}

                    <MapBoundsHandler geometry={activeRoute.route.geometry} />
                  </MapContainer>
                </div>

                {/* Route Warnings */}
                {activeRoute.route.warnings && activeRoute.route.warnings.length > 0 && (
                  <div
                    className={`rounded-lg p-3 space-y-1.5 ${
                      activeRoute.route.hazardAnalysis?.criticalCount > 0
                        ? 'bg-red-500/10 border border-red-500/30'
                        : activeRoute.route.hazardAnalysis?.warningCount > 0
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'bg-blue-500/10 border border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <AlertOctagon
                        className={`h-4 w-4 shrink-0 ${
                          activeRoute.route.hazardAnalysis?.criticalCount > 0
                            ? 'text-red-400'
                            : activeRoute.route.hazardAnalysis?.warningCount > 0
                            ? 'text-amber-400'
                            : 'text-blue-400'
                        }`}
                      />
                      <span
                        className={
                          activeRoute.route.hazardAnalysis?.criticalCount > 0
                            ? 'text-red-300'
                            : activeRoute.route.hazardAnalysis?.warningCount > 0
                            ? 'text-amber-300'
                            : 'text-blue-300'
                        }
                      >
                        Route Safety Information:
                      </span>
                    </div>
                    <div className="space-y-0.5 ml-6">
                      {activeRoute.route.warnings.map((warning, idx) => (
                        <p
                          key={idx}
                          className={`text-xs ${
                            activeRoute.route.hazardAnalysis?.criticalCount > 0
                              ? 'text-red-200'
                              : activeRoute.route.hazardAnalysis?.warningCount > 0
                              ? 'text-amber-200'
                              : 'text-blue-200'
                          }`}
                        >
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Turn-by-turn instructions (if available) */}
                {activeRoute.route.instructions && activeRoute.route.instructions.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-accent-bright hover:text-accent font-semibold">
                      View Turn-by-Turn Instructions ({activeRoute.route.instructions.length} steps)
                    </summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {activeRoute.route.instructions.map((instruction, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded bg-slate-800/50">
                          <span className="font-mono text-accent-bright shrink-0">{idx + 1}.</span>
                          <div className="flex-1">
                            <p className="text-white">{instruction.text}</p>
                            <p className="text-slate-400 text-[10px]">
                              {instruction.distance.toFixed(1)} km · {(instruction.duration * 60).toFixed(0)} min
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info note about routing */}
        {!activeRoute && (
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3 text-xs text-slate-300">
            <p className="font-semibold text-white mb-1">Real Road-Based Routing</p>
            <p>
              This route planner uses actual road networks and considers blocked roads and hazard zones. Routes are
              calculated using OpenRouteService/OSRM APIs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
