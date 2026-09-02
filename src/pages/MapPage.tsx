import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMonitorData } from '../hooks/useMonitorData';
import { GISMap } from '../components/map/GISMap';
import { Terrain3D } from '../components/map/Terrain3D';
import { SatelliteLayerControl, type SatelliteLayerMode } from '../components/map/SatelliteLayerControl';
import { EvaluatorExplanationCard, EvaluatorHeaderBanner } from '../components/ui/EvaluatorExplanationCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { RiskBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { RiskZone } from '../types';
import { Layers, Box, Filter, ChevronRight, Globe } from 'lucide-react';
import { RISK_COLORS } from '../lib/utils';

export function MapPage() {
  const { riskZones, roads, alerts, districts } = useMonitorData();
  const [showEvaluatorExplanations, setShowEvaluatorExplanations] = useState(true);
  const [view3D, setView3D] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  
  const [activeSatelliteLayer, setActiveSatelliteLayer] = useState<SatelliteLayerMode>('basemap');
  const [imdFeedActive, setImdFeedActive] = useState<boolean>(true);
  const [regionPreset, setRegionPreset] = useState<'all_india' | 'ner' | 'himalayas' | 'western_ghats'>('ner');

  const filteredZones = riskFilter === 'all'
    ? riskZones
    : riskZones.filter(z => z.riskLevel === riskFilter);

  const regionConfigs: Record<string, { center: [number, number]; zoom: number }> = {
    all_india: { center: [22.5937, 78.9629], zoom: 5 },
    ner: { center: [25.5, 92.0], zoom: 7 },
    himalayas: { center: [31.0, 78.0], zoom: 7 },
    western_ghats: { center: [11.7, 76.1], zoom: 8 },
  };

  const activeRegion = regionConfigs[regionPreset];
  const mapCenter: [number, number] = selectedDistrict
    ? districts.find(d => d.name === selectedDistrict)?.center || activeRegion.center
    : activeRegion.center;
  const mapZoom = selectedDistrict ? 10 : activeRegion.zoom;

  return (
    <div className="space-y-4">
      {/* Top Banner with Evaluator Explanation Toggle */}
      <EvaluatorHeaderBanner
        pageTitle="GIS Risk Spatial Workspace — India Landslide Data"
        description="Interactive GIS mapping across India (NER, Himalayan Belt, Wayanad Western Ghats), multi-layer satellite feeds, IMD weather station APIs, and 3D terrain elevation."
        isEvaluatorMode={showEvaluatorExplanations}
        onToggleEvaluatorMode={() => setShowEvaluatorExplanations(!showEvaluatorExplanations)}
      />

      {/* Region Presets & Mode Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pan-India & Region Quick-Focus Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-main flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-accent-bright" /> Map Focus:
          </span>
          {[
            { id: 'all_india', label: '🇮🇳 All India Overview' },
            { id: 'ner', label: '🏔️ North Eastern Region (NER)' },
            { id: 'himalayas', label: '⛰️ Himalayas (HP / Uttarakhand)' },
            { id: 'western_ghats', label: '🌿 Western Ghats (Wayanad, Kerala)' },
          ].map(reg => (
            <button
              key={reg.id}
              type="button"
              onClick={() => {
                setRegionPreset(reg.id as any);
                setSelectedDistrict(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                regionPreset === reg.id
                  ? 'border-accent-bright bg-accent/20 text-accent-bright font-bold shadow-sm'
                  : 'border-border/60 bg-card-hover/40 text-dim hover:text-main'
              }`}
            >
              {reg.label}
            </button>
          ))}
        </div>

        {/* 2D vs 3D View Toggle */}
        <div className="flex items-center gap-2">
          <Button variant={view3D ? 'secondary' : 'primary'} size="sm" onClick={() => setView3D(false)}>
            <Layers className="h-4 w-4" /> 2D GIS Map
          </Button>
          <Button variant={view3D ? 'primary' : 'secondary'} size="sm" onClick={() => setView3D(true)}>
            <Box className="h-4 w-4" /> 3D Elevation Mesh
          </Button>
        </div>
      </div>

      {/* Filter Tiers */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-400" />
        {['all', 'critical', 'high', 'moderate', 'low'].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => setRiskFilter(level)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-all ${
              riskFilter === level
                ? 'bg-accent-bright text-black font-bold'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {level === 'all' ? 'All Hazard Tiers' : level}
          </button>
        ))}
      </div>

      {/* Step 4: Multi-Layer Satellite & IMD API Control Box */}
      {!view3D && (
        <SatelliteLayerControl
          activeLayer={activeSatelliteLayer}
          onLayerChange={setActiveSatelliteLayer}
          imdFeedActive={imdFeedActive}
          onToggleIMDFeed={() => setImdFeedActive(!imdFeedActive)}
        />
      )}

      {/* GIS Map & Drilldown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="col-span-1 lg:col-span-9">
          <Card className="h-[320px] sm:h-[450px] lg:h-[calc(100vh-280px)]">
            <CardContent className="p-2 h-full">
              {view3D ? (
                <Terrain3D zones={filteredZones} className="h-full rounded-lg" />
              ) : (
                <GISMap
                  zones={filteredZones}
                  roads={roads}
                  alerts={alerts}
                  center={mapCenter}
                  zoom={mapZoom}
                  height="100%"
                  activeSatelliteLayer={activeSatelliteLayer}
                  imdFeedActive={imdFeedActive}
                  onZoneClick={setSelectedZone}
                />
              )}
            </CardContent>
          </Card>

          {showEvaluatorExplanations && (
            <EvaluatorExplanationCard
              title="Pan-India GIS Spatial Data & Satellite Imagery"
              purpose="Displays real-time GIS spatial landslide risk telemetry across all major vulnerable hill corridors of India (North Eastern Region, Himachal Pradesh, Uttarakhand, Sikkim, and Wayanad Western Ghats)."
              inputs="ISRO BHUVAN satellite imagery, Sentinel-2 InSAR radar ground deformation, IMD Doppler Weather Radar feeds, and ground sensors."
              psReference="PS_26001 Section 6.1, 6.6 & 11.1"
              evaluatorNote="Allows evaluators to zoom out for a Pan-India Overview (zoom 5) or focus directly into high-risk disaster hot-spots (Cherrapunji, Kedarnath, Wayanad, Shimla, Upper Gangtok)."
            />
          )}
        </div>

        <div className="col-span-1 lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle>Region Drill-Down</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setSelectedDistrict(null); setSelectedZone(null); }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${
                    !selectedDistrict ? 'bg-accent/20 text-accent-bright font-semibold' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  All Monitored Locations
                </button>
                {districts.map(d => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => { setSelectedDistrict(d.name); setSelectedZone(null); }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                      selectedDistrict === d.name ? 'bg-accent/20 text-accent-bright font-semibold' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{d.name}</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedZone && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader><CardTitle>Zone Telemetry Details</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-white">{selectedZone.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{selectedZone.location.district}, {selectedZone.location.state}</p>
                  <div className="mt-3"><RiskBadge level={selectedZone.riskLevel} size="md" /></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-slate-800/50 p-2">
                      <p className="text-slate-500">Risk Score</p>
                      <p className="font-bold text-white font-mono">{selectedZone.riskScore}</p>
                    </div>
                    <div className="rounded bg-slate-800/50 p-2">
                      <p className="text-slate-500">Rainfall</p>
                      <p className="font-bold text-white">{selectedZone.rainfall}mm</p>
                    </div>
                    <div className="rounded bg-slate-800/50 p-2">
                      <p className="text-slate-500">Soil Moisture</p>
                      <p className="font-bold text-white">{selectedZone.soilMoisture}%</p>
                    </div>
                    <div className="rounded bg-slate-800/50 p-2">
                      <p className="text-slate-500">Slope</p>
                      <p className="font-bold text-white">{selectedZone.slope}°</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card>
            <CardHeader><CardTitle>GIS Symbology Legend</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                {(['critical', 'high', 'moderate', 'low'] as const).map(level => (
                  <div key={level} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
                    <span className="text-slate-400 capitalize">{level} Risk Zone</span>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-2 mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-sky-500 border border-white" />
                    <span className="text-slate-400">IMD Weather Station</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-6 bg-green-500 rounded" />
                    <span className="text-slate-400">Operational Highway</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-6 bg-red-500 rounded border-dashed" />
                    <span className="text-slate-400">Blocked Highway</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
