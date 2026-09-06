import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { RiskBadge } from '../ui/Badge';
import type { RiskZone, Alert, DistrictSummary } from '../../types';
import { ShieldCheck, Activity, MapPin, Database, Cpu, Layers, FileText, CheckCircle2 } from 'lucide-react';

interface TextReportProps {
  selectedZone?: RiskZone | null;
}

// 1. Live Automated Early Warning Feed — Text Component Report
export function AlertsTextReport({ selectedZone, alerts }: TextReportProps & { alerts: Alert[] }) {
  const activeAlerts = (alerts || []).filter(a => !a.acknowledged);
  const displayAlerts = selectedZone
    ? activeAlerts.filter(a => a.district === selectedZone.location.district || a.title.includes(selectedZone.name))
    : activeAlerts;

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-main">
            <FileText className="h-4 w-4 text-accent-bright" />
            Early Warning Feed — Text Status Report
          </span>
          <span className="text-[10px] font-mono bg-accent/10 text-accent-bright px-2 py-0.5 rounded border border-accent/20">
            Text Output Mode (Default)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        {displayAlerts.length === 0 ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="h-4 w-4" />
              <span>NORMAL CONDITION — ALL SLOPES STABLE & SAFE</span>
            </div>
            <p className="text-xs text-slate-300">
              No active critical or high hazard alerts in monitored sectors. Slope shear strength within safe limits (Safety Factor FS &gt; 1.5).
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-slate-400">
              <div>• Active Escalate Warnings: 0</div>
              <div>• System Status: Baseline Safe</div>
              <div>• Emergency Hotlines: Standby</div>
              <div>• PA Siren Towers: Ready (18/18)</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {displayAlerts.map(alert => (
              <div key={alert.id} className="rounded-lg border border-critical/30 bg-critical/5 p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{alert.title}</span>
                  <RiskBadge level={alert.riskLevel} />
                </div>
                <p className="text-slate-300 text-[11px]">{alert.message}</p>
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-border/30">
                  <span>District: {alert.district}</span>
                  <span>Time: {new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 2. 3D Terrain & Rain Simulation — Text Component Report
export function TerrainTextReport({ selectedZone }: TextReportProps) {
  const slope = selectedZone ? selectedZone.slope : 38;
  const rain = selectedZone ? selectedZone.rainfall : 25;
  const isNormal = !selectedZone || selectedZone.riskLevel === 'low' || selectedZone.riskLevel === 'moderate';

  return (
    <Card className="h-full flex flex-col justify-between border-border/60 bg-card/90">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-main">
            <Layers className="h-4 w-4 text-accent-bright" />
            3D Elevation & Topography — Text Report
          </span>
          <span className="text-[10px] font-mono bg-accent/10 text-accent-bright px-2 py-0.5 rounded border border-accent/20">
            DEM Technical Analysis
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-3 flex-1 flex flex-col justify-between text-xs">
        <div className="rounded-lg bg-black/30 p-3 border border-border/40 space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-border/30">
            <span className="font-semibold text-main">Micro-Topography Profile:</span>
            <span className="font-mono text-accent-bright font-bold">{selectedZone ? selectedZone.name : 'NER Regional Slope Grid'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="rounded bg-slate-900/60 p-2 border border-slate-800">
              <span className="text-slate-400 block">Slope Angle:</span>
              <span className="text-white font-bold text-sm">{slope}° Gradient</span>
            </div>
            <div className="rounded bg-slate-900/60 p-2 border border-slate-800">
              <span className="text-slate-400 block">Precipitation:</span>
              <span className="text-white font-bold text-sm">{rain} mm/h</span>
            </div>
            <div className="rounded bg-slate-900/60 p-2 border border-slate-800">
              <span className="text-slate-400 block">Terrain Elevation:</span>
              <span className="text-white font-bold">1,480m DTM</span>
            </div>
            <div className="rounded bg-slate-900/60 p-2 border border-slate-800">
              <span className="text-slate-400 block">Shear Strength (c'):</span>
              <span className={isNormal ? "text-emerald-400 font-bold" : "text-critical font-bold"}>
                {isNormal ? '28.5 kPa (Stable)' : '11.2 kPa (Weakened)'}
              </span>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-300 leading-relaxed">
            <strong className="text-white">Hydrological Summary:</strong> {isNormal
              ? 'Precipitation runoff is draining naturally without excessive topsoil pore-water pressure accumulation. Contour stability remains within nominal limits.'
              : 'Heavy rain infiltration reduces soil effective stress along slip surface. High probability of localized slope failure along hill cutting.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 3. Rainfall & Soil Moisture — Text Component Report
export function RainfallTextReport({ selectedZone }: TextReportProps) {
  const rain = selectedZone ? selectedZone.rainfall : 22;
  const moisture = selectedZone ? selectedZone.soilMoisture : 38;

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-main">
            <Database className="h-4 w-4 text-accent-bright" />
            Rainfall & Soil Moisture Telemetry Report
          </span>
          <span className="text-[10px] font-mono text-accent-bright bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
            Live ARG Sensor Log
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-3 text-xs">
        <div className="rounded-lg bg-black/30 p-3 border border-border/40 space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="text-slate-400">Current 24h Precipitation:</span>
            <span className="text-accent-bright font-bold text-sm">{rain} mm</span>
          </div>
          <div className="flex justify-between items-center font-mono">
            <span className="text-slate-400">Topsoil Moisture Saturation:</span>
            <span className="text-accent-warm font-bold text-sm">{moisture} %</span>
          </div>
          <div className="flex justify-between items-center font-mono border-t border-border/30 pt-1.5">
            <span className="text-slate-400">Pore-Water Hydraulic Status:</span>
            <span className={moisture > 70 ? "text-critical font-bold" : "text-emerald-400 font-bold"}>
              {moisture > 70 ? 'CRITICAL SATURATION' : 'NORMAL SAFE BASELINE'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 4. Live Risk Trend — Text Component Report
export function RiskTrendTextReport({ selectedZone }: TextReportProps) {
  const score = selectedZone ? selectedZone.riskScore : 28;
  const level = selectedZone ? selectedZone.riskLevel : 'low';

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-main">
            <Activity className="h-4 w-4 text-accent-bright" />
            Live Risk Progression Trajectory Report
          </span>
          <span className="text-[10px] font-mono text-accent-bright bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
            Temporal AI Log
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-3 text-xs">
        <div className="rounded-lg bg-black/30 p-3 border border-border/40 space-y-2 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Target Area:</span>
            <span className="text-white font-bold">{selectedZone ? selectedZone.name : 'Regional Slope Grid'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Composite Hazard Score:</span>
            <span className="text-accent-bright font-bold text-sm">{score} / 100</span>
          </div>
          <div className="flex justify-between items-center border-t border-border/30 pt-1.5">
            <span className="text-slate-400">Classification Status:</span>
            <RiskBadge level={level} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 5. District Risk Summary — Text Component Report
export function DistrictTextReport({ districts }: { districts: DistrictSummary[] }) {
  const safeDistricts = districts || [];

  return (
    <Card className="h-full flex flex-col justify-between border-border/60 bg-card/90">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-main">
            <MapPin className="h-4 w-4 text-accent-bright" />
            District Administrative Summary — Text Table
          </span>
          <span className="text-[10px] font-mono bg-accent/10 text-accent-bright px-2 py-0.5 rounded border border-accent/20">
            Administrative Matrix
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-2 text-xs">
        <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
          {safeDistricts.map(d => (
            <div key={d.name} className="flex items-center justify-between rounded bg-slate-900/60 p-2 border border-slate-800">
              <div>
                <p className="font-bold text-white">{d.name}</p>
                <p className="text-[10px] text-slate-400">{d.state}</p>
              </div>
              <div className="text-right font-mono text-[11px]">
                <p className="text-emerald-400 font-bold">{d.totalZones} Zones Monitored</p>
                <p className="text-slate-400">{d.critical} Critical · {d.high} High</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 6. AI-Prioritized High-Risk Hotspots — Text Component Report
export function HotspotsTextReport({ riskZones }: { riskZones: RiskZone[] }) {
  const safeZones = riskZones || [];

  return (
    <Card className="h-full flex flex-col justify-between border-border/60 bg-card/90">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-main">
            <ShieldCheck className="h-4 w-4 text-accent-bright" />
            AI-Prioritized Hazard Ranking — Text Report
          </span>
          <span className="text-[10px] font-mono bg-accent/10 text-accent-bright px-2 py-0.5 rounded border border-accent/20">
            Ranked Evaluation
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-2 text-xs">
        <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
          {safeZones.map((z, i) => (
            <div key={z.id} className="flex items-center justify-between rounded bg-slate-900/60 p-2 border border-slate-800">
              <div>
                <p className="font-bold text-white">{i + 1}. {z.name}</p>
                <p className="text-[10px] text-slate-400">{z.location.district}, {z.location.state}</p>
              </div>
              <div className="text-right">
                <RiskBadge level={z.riskLevel} />
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Score: {z.riskScore}/100</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 7. Multi-Criteria Risk Factor Radar — Text Component Report
export function RadarTextReport({ selectedZone }: TextReportProps) {
  const rainW = selectedZone ? Math.round(selectedZone.rainfall * 0.3) : 23;
  const moistW = selectedZone ? Math.round(selectedZone.soilMoisture * 0.2) : 15;
  const slopeW = selectedZone ? Math.round(selectedZone.slope * 0.36) : 14;
  const histW = selectedZone ? Math.round(selectedZone.historicalRisk * 0.15) : 12;
  const satW = selectedZone ? Math.round(selectedZone.satelliteIndicator * 0.15) : 10;

  return (
    <Card className="h-full flex flex-col justify-between border-border/60 bg-card/90">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-main">
            <Cpu className="h-4 w-4 text-accent-bright" />
            Multi-Criteria Risk Weights — Text Table
          </span>
          <span className="text-[10px] font-mono bg-accent/10 text-accent-bright px-2 py-0.5 rounded border border-accent/20">
            Weight Contribution Matrix
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-2 text-xs">
        <div className="rounded-lg bg-black/30 p-3 border border-border/40 space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-slate-300">
            <span>• W₁ Rainfall Rate (30%):</span>
            <span className="text-white font-bold">{rainW} pts</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>• W₂ Soil Moisture (20%):</span>
            <span className="text-white font-bold">{moistW} pts</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>• W₃ Slope Gradient (20%):</span>
            <span className="text-white font-bold">{slopeW} pts</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>• W₄ Historical Failure (15%):</span>
            <span className="text-white font-bold">{histW} pts</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>• W₅ Satellite Vegetation (15%):</span>
            <span className="text-white font-bold">{satW} pts</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
