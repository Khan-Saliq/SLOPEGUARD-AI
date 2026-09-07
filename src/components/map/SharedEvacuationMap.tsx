import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Hospital as HospitalIcon,
  Home,
  Layers,
  AlertOctagon,
  Compass,
} from 'lucide-react';
import type { RiskZone, Road, Alert, Shelter, Hospital, EvacuationRoute } from '../../types';

// Fix Leaflet marker icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom DivIcons for crisp SVG rendering without missing PNG assets
const createMarkerIcon = (color: string, iconSymbol: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${color};
        color: white;
        font-weight: bold;
        font-size: 13px;
        box-shadow: 0 0 10px ${color}88, 0 4px 6px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        <span>${iconSymbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const startIcon = createMarkerIcon('#22c55e', 'A');
const destIcon = createMarkerIcon('#ef4444', 'B');
const shelterIcon = createMarkerIcon('#3b82f6', '🏕️');
const hospitalIcon = createMarkerIcon('#ec4899', '🏥');
const blockageIcon = createMarkerIcon('#dc2626', '🚫');

interface MapLayerVisibility {
  riskZones: boolean;
  roads: boolean;
  blockages: boolean;
  shelters: boolean;
  hospitals: boolean;
  evacuationRoutes: boolean;
}

interface SharedEvacuationMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  riskZones?: RiskZone[];
  roads?: Road[];
  alerts?: Alert[];
  shelters?: Shelter[];
  hospitals?: Hospital[];
  evacuationRoutes?: EvacuationRoute[];
  startPoint?: { lat: number; lng: number; label?: string } | null;
  destPoint?: { lat: number; lng: number; label?: string } | null;
  routeGeometry?: [number, number][];
  routeColor?: string;
  alternativeGeometries?: { id: string; geometry: [number, number][]; color?: string }[];
  onStartPointDrag?: (lat: number, lng: number) => void;
  onDestPointDrag?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapFitBounds({ geometry }: { geometry?: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (geometry && geometry.length > 1) {
      const bounds = L.latLngBounds(geometry.map(c => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [geometry, map]);
  return null;
}

const TILE_LAYERS = {
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri World Dark GIS',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; ISRO Bhuvan / Esri Imagery',
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri Topographic',
  },
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap contributors',
  },
};

export function SharedEvacuationMap({
  center = [25.5, 92.0],
  zoom = 7,
  height = '100%',
  riskZones = [],
  roads = [],
  shelters = [],
  hospitals = [],
  evacuationRoutes = [],
  startPoint,
  destPoint,
  routeGeometry,
  routeColor = '#3b82f6',
  alternativeGeometries = [],
  onStartPointDrag,
  onDestPointDrag,
  onMapClick,
  interactive = true,
}: SharedEvacuationMapProps) {
  const [activeTile, setActiveTile] = useState<keyof typeof TILE_LAYERS>('dark');
  const [layers, setLayers] = useState<MapLayerVisibility>({
    riskZones: true,
    roads: true,
    blockages: true,
    shelters: true,
    hospitals: true,
    evacuationRoutes: true,
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const toggleLayer = (key: keyof MapLayerVisibility) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const roadColorMap: Record<string, string> = {
    operational: '#22c55e',
    vulnerable: '#eab308',
    damaged: '#f97316',
    blocked: '#ef4444',
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border/60 shadow-2xl bg-card" style={{ height }}>
      <MapContainer center={center} zoom={zoom} className="w-full h-full z-0" scrollWheelZoom={interactive}>
        <TileLayer url={TILE_LAYERS[activeTile].url} attribution={TILE_LAYERS[activeTile].attr} maxZoom={18} />
        
        <MapFlyTo center={center} zoom={zoom} />
        {interactive && <MapClickHandler onClick={onMapClick} />}
        {routeGeometry && routeGeometry.length > 1 && <MapFitBounds geometry={routeGeometry} />}

        {/* Start Point Marker */}
        {startPoint && (
          <Marker
            position={[startPoint.lat, startPoint.lng]}
            icon={startIcon}
            draggable={!!onStartPointDrag}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (onStartPointDrag) onStartPointDrag(position.lat, position.lng);
              },
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1 space-y-1">
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-white bg-green-600 rounded">
                  START / ORIGIN
                </span>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {startPoint.label || `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`}
                </p>
                <p className="text-[10px] text-gray-500">Drag marker on map to adjust starting position.</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Point Marker */}
        {destPoint && (
          <Marker
            position={[destPoint.lat, destPoint.lng]}
            icon={destIcon}
            draggable={!!onDestPointDrag}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (onDestPointDrag) onDestPointDrag(position.lat, position.lng);
              },
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1 space-y-1">
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 rounded">
                  DESTINATION
                </span>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {destPoint.label || `${destPoint.lat.toFixed(4)}, ${destPoint.lng.toFixed(4)}`}
                </p>
                <p className="text-[10px] text-gray-500">Drag marker on map to adjust destination position.</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Alternative Routes Polylines */}
        {alternativeGeometries.map(alt => (
          <Polyline
            key={alt.id}
            positions={alt.geometry}
            pathOptions={{
              color: alt.color || '#94a3b8',
              weight: 4,
              opacity: 0.6,
              dashArray: '8, 8',
            }}
          />
        ))}

        {/* Active Route Polyline */}
        {routeGeometry && routeGeometry.length > 1 && (
          <Polyline
            positions={routeGeometry}
            pathOptions={{
              color: routeColor,
              weight: 6,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Published Official Evacuation Routes */}
        {layers.evacuationRoutes &&
          evacuationRoutes.map(er => {
            if (!er.coordinates || er.coordinates.length < 2) return null;
            const isSuspended = er.status === 'suspended';
            return (
              <React.Fragment key={er.id}>
                <Polyline
                  positions={er.coordinates}
                  pathOptions={{
                    color: isSuspended ? '#64748b' : '#10b981',
                    weight: 5,
                    opacity: isSuspended ? 0.4 : 0.85,
                  }}
                >
                  <Popup>
                    <div className="p-2 space-y-1 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${isSuspended ? 'bg-gray-500 text-white' : 'bg-emerald-600 text-white'}`}>
                          {isSuspended ? 'SUSPENDED ROUTE' : 'OFFICIAL EVACUATION ROUTE'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{er.title}</h4>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300">
                        {er.originName} ➔ {er.destinationName}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Distance: <strong>{er.distanceKm} km</strong> | Est: <strong>{(er.estHours * 60).toFixed(0)} min</strong>
                      </p>
                      {er.warnings && er.warnings.length > 0 && (
                        <div className="mt-1 p-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 rounded text-[10px] text-amber-800 dark:text-amber-200">
                          ⚠️ {er.warnings.join(', ')}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              </React.Fragment>
            );
          })}

        {/* Roads & Status Polylines */}
        {layers.roads &&
          roads.map(rd => {
            if (!rd.coordinates || rd.coordinates.length < 2) return null;
            const color = roadColorMap[rd.status] || '#94a3b8';
            return (
              <Polyline
                key={rd.id}
                positions={rd.coordinates}
                pathOptions={{
                  color,
                  weight: rd.status === 'blocked' ? 5 : 4,
                  opacity: rd.status === 'blocked' ? 0.9 : 0.75,
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded text-white" style={{ background: color }}>
                      {rd.status.toUpperCase()} ROAD
                    </span>
                    <h4 className="text-xs font-bold">{rd.name}</h4>
                    <p className="text-[11px] text-gray-600">District: {rd.district}</p>
                    {rd.lastReport && <p className="text-[10px] text-red-600 font-medium">{rd.lastReport}</p>}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* Road Blockages Layer */}
        {layers.blockages &&
          roads
            .filter(r => r.status === 'blocked' || r.status === 'damaged')
            .map(rd => {
              const centerCoord = rd.coordinates && rd.coordinates.length > 0 ? rd.coordinates[Math.floor(rd.coordinates.length / 2)] : null;
              if (!centerCoord) return null;
              return (
                <Marker key={`blk-${rd.id}`} position={centerCoord} icon={blockageIcon}>
                  <Popup>
                    <div className="p-2 space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-red-600 font-bold">
                        <AlertOctagon className="w-4 h-4" /> ROAD BLOCKAGE DETECTED
                      </div>
                      <p className="font-semibold">{rd.name}</p>
                      <p className="text-[11px] text-gray-600">{rd.lastReport || 'Passage strictly restricted.'}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

        {/* Risk Zones Layer */}
        {layers.riskZones &&
          riskZones.map(zone => {
            const riskColors: Record<string, string> = {
              critical: '#ef4444',
              high: '#f97316',
              moderate: '#eab308',
              low: '#22c55e',
            };
            const color = riskColors[zone.riskLevel] || '#eab308';
            return (
              <React.Fragment key={zone.id}>
                <CircleMarker
                  center={[zone.location.lat, zone.location.lng]}
                  radius={12 + (zone.riskScore / 100) * 8}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.35,
                    color: color,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="p-2 space-y-1.5 max-w-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ background: color }}>
                          {zone.riskLevel.toUpperCase()} RISK ({zone.riskScore}%)
                        </span>
                      </div>
                      <h4 className="text-xs font-bold">{zone.name}</h4>
                      <p className="text-[11px] text-gray-600">{zone.location.district}, {zone.location.state}</p>
                      <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                        <div>Rainfall: <strong>{zone.rainfall} mm</strong></div>
                        <div>Soil Moisture: <strong>{zone.soilMoisture}%</strong></div>
                        <div>Slope: <strong>{zone.slope}°</strong></div>
                        <div>Pop Affected: <strong>{zone.population}</strong></div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}

        {/* Emergency Shelters Layer */}
        {layers.shelters &&
          shelters.map(shelter => (
            <Marker key={shelter.id} position={[shelter.location.lat, shelter.location.lng]} icon={shelterIcon}>
              <Popup>
                <div className="p-2 space-y-1 max-w-xs text-xs">
                  <div className="flex items-center gap-1 text-blue-600 font-bold">
                    <Home className="w-4 h-4" /> EMERGENCY SHELTER
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100">{shelter.name}</h4>
                  <p className="text-[11px] text-gray-600">{shelter.location.area || shelter.district}</p>
                  <div className="flex items-center justify-between text-[11px] bg-blue-50 dark:bg-blue-950/50 p-1.5 rounded border border-blue-200">
                    <span>Capacity: <strong>{shelter.capacity}</strong></span>
                    <span>Occupancy: <strong className="text-blue-600">{shelter.currentOccupancy}</strong></span>
                  </div>
                  {shelter.contactNumber && (
                    <p className="text-[10px] text-gray-500">📞 Call: {shelter.contactNumber}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Hospitals Layer */}
        {layers.hospitals &&
          hospitals.map(hosp => (
            <Marker key={hosp.id} position={[hosp.location.lat, hosp.location.lng]} icon={hospitalIcon}>
              <Popup>
                <div className="p-2 space-y-1 max-w-xs text-xs">
                  <div className="flex items-center gap-1 text-pink-600 font-bold">
                    <HospitalIcon className="w-4 h-4" /> EMERGENCY MEDICAL CENTER
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100">{hosp.name}</h4>
                  <p className="text-[11px] text-gray-600">{hosp.location.area || hosp.district}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] bg-pink-50 dark:bg-pink-950/50 p-1.5 rounded border border-pink-200">
                    <div>Beds: <strong>{hosp.bedCapacity}</strong></div>
                    <div>ICU Avail: <strong className="text-emerald-600">{hosp.availableICUBeds}</strong></div>
                  </div>
                  {hosp.emergencyServices && (
                    <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                      24/7 Emergency Care Active
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Control Panel */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {/* Tile Basemap Switcher */}
        <div className="flex bg-card/90 backdrop-blur-md p-1 rounded-lg border border-border/70 shadow-lg text-xs">
          {(Object.keys(TILE_LAYERS) as (keyof typeof TILE_LAYERS)[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTile(t)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors font-medium text-[11px] ${
                activeTile === t ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Map Sub-Layers Toggle Button */}
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="flex items-center gap-1.5 px-3 py-2 bg-card/90 backdrop-blur-md rounded-lg border border-border/70 shadow-lg text-xs font-semibold hover:bg-card-hover transition-colors text-foreground"
        >
          <Layers className="w-4 h-4 text-accent-bright" />
          Map Layers
        </button>

        {showLayerPanel && (
          <div className="w-56 p-3 bg-card/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl text-xs space-y-2 text-foreground">
            <h4 className="font-bold border-b border-border/60 pb-1.5 flex items-center justify-between text-muted-foreground">
              <span>Visible Map Sub-Layers</span>
              <Layers className="w-3.5 h-3.5" />
            </h4>
            {(Object.keys(layers) as (keyof MapLayerVisibility)[]).map(key => (
              <label key={key} className="flex items-center justify-between cursor-pointer py-1 hover:bg-muted/40 px-1 rounded">
                <span className="capitalize font-medium text-[11px]">{key.replace(/([A-Z])/g, ' $1')}</span>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => toggleLayer(key)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Floating Legend Toggle */}
      <div className="absolute bottom-3 left-3 z-10">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center gap-1 px-3 py-1.5 bg-card/90 backdrop-blur-md rounded-lg border border-border/70 shadow-lg text-xs font-semibold text-foreground hover:bg-card-hover"
        >
          <Compass className="w-3.5 h-3.5 text-accent-bright" />
          {showLegend ? 'Hide Legend' : 'Legend'}
        </button>

        {showLegend && (
          <div className="mt-2 p-3 bg-card/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl text-[11px] space-y-1.5 w-60 text-foreground">
            <h4 className="font-bold text-muted-foreground border-b border-border/60 pb-1">Evacuation Map Legend</h4>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> <span>Start Point (Origin)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> <span>Evacuation Destination</span></div>
            <div className="flex items-center gap-2"><span className="w-4 h-1 bg-emerald-500 inline-block"></span> <span>Operational / Safe Road</span></div>
            <div className="flex items-center gap-2"><span className="w-4 h-1 bg-amber-500 inline-block"></span> <span>Vulnerable Road</span></div>
            <div className="flex items-center gap-2"><span className="w-4 h-1 bg-red-500 inline-block"></span> <span>Blocked Road</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> <span>Emergency Shelter Camp</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500 inline-block"></span> <span>Emergency Hospital</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500 inline-block"></span> <span>Critical Landslide Hazard Zone</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
