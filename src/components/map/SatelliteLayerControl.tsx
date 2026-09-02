import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Globe, CloudRain, Satellite, Activity, Sparkles, Database } from 'lucide-react';

export type SatelliteLayerMode = 'basemap' | 'isro_bhuvan' | 'sar_deformation' | 'ndvi_moisture';

interface SatelliteLayerControlProps {
  activeLayer: SatelliteLayerMode;
  onLayerChange: (layer: SatelliteLayerMode) => void;
  imdFeedActive: boolean;
  onToggleIMDFeed: () => void;
}

export function SatelliteLayerControl({
  activeLayer,
  onLayerChange,
  imdFeedActive,
  onToggleIMDFeed,
}: SatelliteLayerControlProps) {
  const layers: { id: SatelliteLayerMode; name: string; type: string; icon: typeof Satellite; badge: string }[] = [
    { id: 'basemap', name: 'GIS Spatial Vector Basemap', type: 'CartoDB Dark', icon: Globe, badge: 'Standard GIS' },
    { id: 'isro_bhuvan', name: 'ISRO BHUVAN Satellite Feed', type: 'High-Res Multispectral', icon: Satellite, badge: 'ISRO Remote Sensing' },
    { id: 'sar_deformation', name: 'Sentinel-2 InSAR Deformation', type: 'Radar Interferometry', icon: Activity, badge: 'Ground Displacement' },
    { id: 'ndvi_moisture', name: 'Sentinel-2 NDVI Topsoil Moisture', type: 'Vegetation Index', icon: CloudRain, badge: 'Hydrological Saturation' },
  ];

  return (
    <Card className="border-accent/40 bg-card/90 shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2">
            <Satellite className="h-4 w-4 text-accent-bright animate-pulse" />
            Satellite Feed & IMD Weather API Integration
          </span>
          <span className="text-[10px] font-mono bg-accent/20 text-accent-bright px-2 py-0.5 rounded border border-accent/40 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> PS_26001 Sec 6.6 & 7.0
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs">
        {/* Layer Selector Grid */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-main uppercase tracking-wider">
            Select Active Imagery & Remote Sensing Layer:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {layers.map(layer => {
              const Icon = layer.icon;
              const isSelected = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => onLayerChange(layer.id)}
                  className={`rounded-lg p-2.5 text-left border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-accent-bright bg-accent/20 text-main shadow-sm'
                      : 'border-border/60 bg-card-hover/40 text-dim hover:text-main'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-xs text-main">
                      <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-accent-bright' : 'text-dim'}`} />
                      {layer.name}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-dim">{layer.type}</span>
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${
                      isSelected ? 'bg-accent-bright/20 text-accent-bright font-bold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {layer.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live IMD Weather API Feed Toggle */}
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent-bright">
              <Database className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-main">IMD Weather Radar API Feed</p>
              <p className="text-[10px] text-dim">Regional Meteorological Centre (Guwahati / Shillong AWS)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleIMDFeed}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              imdFeedActive
                ? 'border-low bg-low/20 text-low font-bold shadow-sm'
                : 'border-border bg-card-hover text-dim hover:text-main'
            }`}
          >
            {imdFeedActive ? 'IMD API Active (Connected)' : 'Connect IMD Live Feed'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
