import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import type { RiskZone, Road, Alert } from '../../types';
import type { SatelliteLayerMode } from './SatelliteLayerControl';
import { RISK_COLORS } from '../../lib/utils';
import { RiskBadge, DataSourceBadge } from '../ui/Badge';
import { formatRelativeTime } from '../../lib/utils';

const NER_CENTER: [number, number] = [25.5, 92.0];

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

interface GISMapProps {
  zones?: RiskZone[];
  roads?: Road[];
  alerts?: Alert[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showHeatmap?: boolean;
  activeSatelliteLayer?: SatelliteLayerMode;
  imdFeedActive?: boolean;
  onZoneClick?: (zone: RiskZone) => void;
}

const TILE_URLS: Record<SatelliteLayerMode, { url: string; attr: string }> = {
  basemap: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri World Dark GIS Basemap',
  },
  isro_bhuvan: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; ISRO Bhuvan / Esri Satellite Imagery',
  },
  sar_deformation: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Sentinel-2 InSAR Topo Ground Deformation',
  },
  ndvi_moisture: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap Hydrological Moisture Layer',
  },
};

const IMD_WEATHER_STATIONS = [
  { id: 'station-1', name: 'IMD Regional Meteorological Centre', district: 'Guwahati', lat: 26.14, lng: 91.73, rainfall24h: 142, temp: '24°C' },
  { id: 'station-2', name: 'IMD Automatic Weather Station (AWS)', district: 'Shillong', lat: 25.57, lng: 91.88, rainfall24h: 198, temp: '19°C' },
  { id: 'station-3', name: 'Cherrapunji Rain Observatory', district: 'East Khasi Hills', lat: 25.27, lng: 91.73, rainfall24h: 310, temp: '18°C' },
];

export function GISMap({
  zones = [],
  roads = [],
  alerts = [],
  center = NER_CENTER,
  zoom = 7,
  height = '100%',
  showHeatmap = true,
  activeSatelliteLayer = 'basemap',
  imdFeedActive = true,
  onZoneClick,
}: GISMapProps) {
  const roadColors: Record<string, string> = {
    operational: '#22c55e',
    vulnerable: '#f59e0b',
    blocked: '#ef4444',
  };

  const tileConfig = TILE_URLS[activeSatelliteLayer] || TILE_URLS.basemap;

  return (
    <div style={{ height }} className="relative rounded-xl overflow-hidden">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution={tileConfig.attr}
          url={tileConfig.url}
        />
        <MapController center={center} zoom={zoom} />

        {showHeatmap && zones.map(zone => (
          <CircleMarker
            key={zone.id}
            center={[zone.location.lat, zone.location.lng]}
            radius={8 + zone.riskScore / 8}
            pathOptions={{
              color: RISK_COLORS[zone.riskLevel],
              fillColor: RISK_COLORS[zone.riskLevel],
              fillOpacity: 0.35,
              weight: 2,
            }}
            eventHandlers={{ click: () => onZoneClick?.(zone) }}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <p className="font-semibold text-slate-900">{zone.name}</p>
                <p className="text-xs text-slate-600">{zone.location.district}, {zone.location.state}</p>
                <div className="mt-2 flex items-center gap-2">
                  <RiskBadge level={zone.riskLevel} />
                  <span className="text-xs font-mono text-slate-700">Score: {zone.riskScore}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                  <span>Rainfall: {zone.rainfall}mm</span>
                  <span>Moisture: {zone.soilMoisture}%</span>
                  <span>Slope: {zone.slope}°</span>
                  <span>Pop: {zone.population}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {roads.map(road => (
          <Polyline
            key={road.id}
            positions={road.coordinates}
            pathOptions={{
              color: roadColors[road.status],
              weight: 4,
              opacity: 0.8,
              dashArray: road.status === 'blocked' ? '10, 10' : undefined,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-slate-900">{road.name}</p>
                <p className="text-xs capitalize text-slate-600">Status: {road.status}</p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {alerts.filter(a => !a.acknowledged).map(alert => (
          <CircleMarker
            key={alert.id}
            center={[alert.location.lat, alert.location.lng]}
            radius={6}
            pathOptions={{
              color: '#fff',
              fillColor: RISK_COLORS[alert.riskLevel],
              fillOpacity: 0.9,
              weight: 3,
              className: 'pulse-marker',
            }}
          >
            <Popup>
              <div className="text-sm min-w-[220px]">
                <p className="font-semibold text-slate-900">{alert.title}</p>
                <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                <div className="mt-2 flex items-center gap-2">
                  <DataSourceBadge source={alert.dataSource} />
                  <span className="text-[10px] text-slate-500">{formatRelativeTime(alert.timestamp)}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Live IMD Weather Station Markers */}
        {imdFeedActive && IMD_WEATHER_STATIONS.map(st => (
          <CircleMarker
            key={st.id}
            center={[st.lat, st.lng]}
            radius={7}
            pathOptions={{
              color: '#38bdf8',
              fillColor: '#0284c7',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <p className="font-bold text-sky-900 flex items-center gap-1">🌦️ {st.name}</p>
                <p className="text-xs text-slate-600">{st.district}</p>
                <div className="mt-2 rounded bg-sky-50 p-2 text-xs font-mono text-sky-900 space-y-1">
                  <p>24h Precipitation: {st.rainfall24h} mm</p>
                  <p>Temp: {st.temp}</p>
                  <p className="text-[10px] text-sky-700 font-sans">IMD Live Doppler Stream Active</p>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
