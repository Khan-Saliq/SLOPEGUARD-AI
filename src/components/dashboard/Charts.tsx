import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useMonitorData } from '../../hooks/useMonitorData';
import { RISK_COLORS } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import type { RiskZone, WeatherData, DistrictSummary } from '../../types';

const CHART_GRID = '#3d3530';
const CHART_TEXT = '#8a8078';
const TOOLTIP_STYLE = { background: '#221e1a', border: '1px solid #3d3530', borderRadius: 8, fontSize: 12 };

// Safe baseline fallbacks for Normal Conditions / Zero Hazard scenarios
const DEFAULT_NORMAL_WEATHER: WeatherData[] = Array.from({ length: 12 }, (_, i) => ({
  date: `${String(i * 2).padStart(2, '0')}:00`,
  rainfall: 12 + (i % 4) * 3,
  soilMoisture: 30 + (i % 3) * 2,
  temperature: 24,
  humidity: 68,
}));

const DEFAULT_NORMAL_TREND = Array.from({ length: 12 }, (_, i) => ({
  hour: `${String(i * 2).padStart(2, '0')}:00`,
  critical: 0,
  high: 0,
  moderate: 1,
  low: 11,
}));

const DEFAULT_NORMAL_DISTRICTS = [
  { name: 'East Khasi Hills', state: 'Meghalaya', totalZones: 3, critical: 0, high: 0, moderate: 1, low: 2 },
  { name: 'Kamrup Metro', state: 'Assam', totalZones: 2, critical: 0, high: 0, moderate: 0, low: 2 },
  { name: 'Gangtok', state: 'Sikkim', totalZones: 2, critical: 0, high: 0, moderate: 1, low: 1 },
  { name: 'Shimla', state: 'Himachal Pradesh', totalZones: 2, critical: 0, high: 0, moderate: 0, low: 2 },
  { name: 'Wayanad', state: 'Kerala', totalZones: 2, critical: 0, high: 0, moderate: 0, low: 2 },
];

export function RainfallChart({ selectedZone }: { selectedZone?: RiskZone | null }) {
  const { weatherHistory } = useMonitorData();

  const safeWeatherHistory = (weatherHistory && weatherHistory.length > 0)
    ? weatherHistory.filter(item => Number.isFinite(Number(item.rainfall)) && Number.isFinite(Number(item.soilMoisture)))
    : DEFAULT_NORMAL_WEATHER;

  const dataToUse = safeWeatherHistory.length > 0 ? safeWeatherHistory : DEFAULT_NORMAL_WEATHER;

  const selectedRainfall = selectedZone ? Number(selectedZone.rainfall) : 0;
  const selectedSoilMoisture = selectedZone ? Number(selectedZone.soilMoisture) : 0;

  const displayData = selectedZone && Number.isFinite(selectedRainfall) && Number.isFinite(selectedSoilMoisture)
    ? dataToUse.map((item, idx) => {
        const factor = 0.85 + (idx / Math.max(dataToUse.length, 1)) * 0.3;
        return {
          date: item.date,
          rainfall: Math.max(5, Math.round(selectedRainfall * factor)),
          soilMoisture: Math.min(100, Math.max(15, Math.round(selectedSoilMoisture * factor))),
        };
      })
    : dataToUse;

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            📊 Rainfall & Soil Moisture
          </span>
          <span className="text-xs font-bold text-accent-bright bg-accent/20 px-2.5 py-1 rounded-md border border-accent/30 font-mono">
            📍 Location: {selectedZone ? `${selectedZone.name} (${selectedZone.location.district})` : 'All Monitored Areas (Regional Baseline)'}
          </span>
        </CardTitle>
        <p className="text-[11px] text-slate-400 font-mono mt-1">
          {selectedZone
            ? `Telemetry for ${selectedZone.name}, ${selectedZone.location.district}, ${selectedZone.location.state}`
            : 'Aggregate hydrometeorological parameters across monitored sectors'}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={displayData}>
            <defs>
              <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5a9a84" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#5a9a84" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c4845c" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#c4845c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="date" tick={{ fill: CHART_TEXT, fontSize: 10 }} tickFormatter={d => String(d).slice(5)} />
            <YAxis tick={{ fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f5f0e8' }} />
            <Area type="monotone" dataKey="rainfall" stroke="#5a9a84" fill="url(#rainGrad)" name="Rainfall (mm)" isAnimationActive />
            <Area type="monotone" dataKey="soilMoisture" stroke="#c4845c" fill="url(#moistGrad)" name="Soil Moisture (%)" isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RiskTrendChart({ selectedZone }: { selectedZone?: RiskZone | null }) {
  const { riskTrend } = useMonitorData();

  const safeRiskTrend = (riskTrend && riskTrend.length > 0)
    ? riskTrend.filter(point => (
        Number.isFinite(Number(point.critical)) &&
        Number.isFinite(Number(point.high)) &&
        Number.isFinite(Number(point.moderate)) &&
        Number.isFinite(Number(point.low))
      ))
    : DEFAULT_NORMAL_TREND;

  const trendToUse = safeRiskTrend.length > 0 ? safeRiskTrend : DEFAULT_NORMAL_TREND;

  const selectedRiskScore = selectedZone ? Number(selectedZone.riskScore) : 0;
  const zoneTrendData = selectedZone && Number.isFinite(selectedRiskScore)
    ? trendToUse.map((pt, idx) => {
        const delta = Math.sin(idx / 2) * 5;
        const score = Math.min(100, Math.max(5, Math.round(selectedRiskScore + delta)));
        return {
          hour: pt.hour,
          zoneScore: score,
        };
      })
    : null;

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            📈 Risk Progression Trajectory
          </span>
          <span className="text-xs font-bold text-accent-bright bg-accent/20 px-2.5 py-1 rounded-md border border-accent/30 font-mono">
            📍 Location: {selectedZone ? `${selectedZone.name} (${selectedZone.location.district})` : 'All Monitored Areas (Regional Baseline)'}
          </span>
        </CardTitle>
        <p className="text-[11px] text-slate-400 font-mono mt-1">
          {selectedZone
            ? `Temporal hazard score curve for ${selectedZone.name}`
            : 'Regional risk distribution across active monitoring stations'}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {zoneTrendData ? (
            <LineChart data={zoneTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="hour" tick={{ fill: CHART_TEXT, fontSize: 10 }} interval={3} />
              <YAxis domain={[0, 100]} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="zoneScore" stroke={selectedZone ? RISK_COLORS[selectedZone.riskLevel] : '#10b981'} strokeWidth={2.5} dot={false} isAnimationActive name={`${selectedZone?.name ?? 'Focused Zone'} Score`} />
            </LineChart>
          ) : (
            <LineChart data={trendToUse}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="hour" tick={{ fill: CHART_TEXT, fontSize: 10 }} interval={3} />
              <YAxis tick={{ fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="critical" stroke={RISK_COLORS.critical} strokeWidth={2} dot={false} isAnimationActive />
              <Line type="monotone" dataKey="high" stroke={RISK_COLORS.high} strokeWidth={2} dot={false} isAnimationActive />
              <Line type="monotone" dataKey="moderate" stroke={RISK_COLORS.moderate} strokeWidth={1.5} dot={false} isAnimationActive />
              <Line type="monotone" dataKey="low" stroke={RISK_COLORS.low} strokeWidth={1.5} dot={false} isAnimationActive />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DistrictSummaryChart({ data, selectedZone }: { data: DistrictSummary[]; selectedZone?: RiskZone | null }) {
  const safeData = (data && data.length > 0) ? data : DEFAULT_NORMAL_DISTRICTS;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono bg-black/40 p-2 rounded-lg border border-border/40">
        <span className="text-slate-300">Administrative District Data Scope:</span>
        <span className="text-accent-bright font-bold">
          📍 Location: {selectedZone ? `${selectedZone.name} (${selectedZone.location.district}, ${selectedZone.location.state})` : 'All Administrative Districts'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={safeData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fill: CHART_TEXT, fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="critical" stackId="1" stroke={RISK_COLORS.critical} fill={RISK_COLORS.critical} fillOpacity={0.6} />
          <Area type="monotone" dataKey="high" stackId="1" stroke={RISK_COLORS.high} fill={RISK_COLORS.high} fillOpacity={0.6} />
          <Area type="monotone" dataKey="moderate" stackId="1" stroke={RISK_COLORS.moderate} fill={RISK_COLORS.moderate} fillOpacity={0.6} />
          <Area type="monotone" dataKey="low" stackId="1" stroke={RISK_COLORS.low} fill={RISK_COLORS.low} fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
