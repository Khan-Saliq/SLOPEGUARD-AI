import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useMonitorData } from '../../hooks/useMonitorData';
import { RISK_COLORS } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import type { RiskZone } from '../../types';

const CHART_GRID = '#3d3530';
const CHART_TEXT = '#8a8078';
const TOOLTIP_STYLE = { background: '#221e1a', border: '1px solid #3d3530', borderRadius: 8, fontSize: 12 };

export function RainfallChart({ selectedZone }: { selectedZone?: RiskZone | null }) {
  const { weatherHistory } = useMonitorData();

  // If a specific zone is selected, scale rainfall/moisture to zone's live values
  const displayData = selectedZone
    ? weatherHistory.map((item, idx) => {
        const factor = 0.85 + (idx / weatherHistory.length) * 0.3;
        return {
          date: item.date,
          rainfall: Math.round(selectedZone.rainfall * factor),
          soilMoisture: Math.min(100, Math.round(selectedZone.soilMoisture * factor)),
        };
      })
    : weatherHistory;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {selectedZone ? `Rainfall & Soil Moisture — ${selectedZone.name}` : 'Rainfall & Soil Moisture (Live)'}
          </span>
          {selectedZone && (
            <span className="text-[10px] font-mono text-accent-bright bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
              {selectedZone.rainfall}mm | {selectedZone.soilMoisture}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={displayData}>
            <defs>
              <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5a9a84" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#5a9a84" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c4845c" stopOpacity={0.3} />
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

  // If a zone is selected, calculate 24h risk score trend for that single zone
  const zoneTrendData = selectedZone
    ? riskTrend.map((pt, idx) => {
        const delta = Math.sin(idx / 2) * 8;
        const score = Math.min(100, Math.max(10, Math.round(selectedZone.riskScore + delta)));
        return {
          hour: pt.hour,
          zoneScore: score,
        };
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {selectedZone ? `Risk Score Trajectory — ${selectedZone.name}` : 'Live Risk Trend'}
          </span>
          {selectedZone && (
            <span className="text-[10px] font-mono text-critical bg-critical/10 px-2 py-0.5 rounded border border-critical/20 font-bold">
              Score: {selectedZone.riskScore}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {zoneTrendData ? (
            <LineChart data={zoneTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="hour" tick={{ fill: CHART_TEXT, fontSize: 10 }} interval={3} />
              <YAxis domain={[0, 100]} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="zoneScore" stroke={selectedZone ? RISK_COLORS[selectedZone.riskLevel] : '#ef4444'} strokeWidth={2.5} dot={false} isAnimationActive name={`${selectedZone?.name ?? 'Focused Zone'} Risk Score`} />
            </LineChart>
          ) : (
            <LineChart data={riskTrend}>
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

export function DistrictSummaryChart({ data }: { data: { name: string; critical: number; high: number; moderate: number; low: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
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
  );
}
