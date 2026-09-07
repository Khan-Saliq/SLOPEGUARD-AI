import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../hooks/useApp';
import { useMonitorData } from '../hooks/useMonitorData';
import { Card, CardContent } from '../components/ui/Card';
import { RiskBadge, DataSourceBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BroadcastSimulator } from '../components/dashboard/BroadcastSimulator';
import { EvaluatorExplanationCard, EvaluatorHeaderBanner } from '../components/ui/EvaluatorExplanationCard';
import { formatDate, formatRelativeTime } from '../lib/utils';
import {
  Bell,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Filter,
  Search,
  Compass,
} from 'lucide-react';

const actionGuide: Record<string, { icon: typeof Bell; actions: string[] }> = {
  critical: {
    icon: ShieldAlert,
    actions: ['Immediate evacuation advisory', 'Deploy NDRF teams', 'Block vulnerable roads', 'Notify all affected villages'],
  },
  high: {
    icon: AlertTriangle,
    actions: ['Issue warning to authorities', 'Prepare emergency response', 'Increase monitoring frequency', 'Alert field officials'],
  },
  moderate: {
    icon: Bell,
    actions: ['Increased observation', 'Prepare contingency plans', 'Monitor rainfall trends', 'Inform local communities'],
  },
  low: {
    icon: CheckCircle,
    actions: ['Normal monitoring', 'Routine field checks', 'Continue data collection'],
  },
};

const INDIAN_STATES_LIST = [
  'Meghalaya',
  'Assam',
  'Sikkim',
  'Mizoram',
  'Nagaland',
  'Arunachal Pradesh',
  'Manipur',
  'Himachal Pradesh',
  'Uttarakhand',
  'Kerala',
  'West Bengal',
];

export function AlertsPage() {
  const { user } = useApp();
  const { alerts, acknowledgeAlert } = useMonitorData();
  const [showEvaluatorExplanations, setShowEvaluatorExplanations] = useState(true);

  // Filters State
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isAdmin = ['authority', 'admin', 'super_admin', 'field_official'].includes(user?.role ?? '');

  // Extract unique states dynamically from active alerts and default list
  const availableStates = useMemo(() => {
    const alertStates = (alerts || [])
      .map(a => a.location?.state)
      .filter(Boolean) as string[];
    const combined = Array.from(new Set([...INDIAN_STATES_LIST, ...alertStates]));
    return combined.sort();
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return (alerts || []).filter(a => {
      // State Filter
      const matchState =
        selectedState === 'all' ||
        (a.location?.state && a.location.state.toLowerCase() === selectedState.toLowerCase());

      // Severity Filter
      const matchSeverity = selectedSeverity === 'all' || a.riskLevel === selectedSeverity;

      // Search Query Filter
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.district.toLowerCase().includes(q) ||
        (a.location?.state && a.location.state.toLowerCase().includes(q)) ||
        (a.affectedVillages && a.affectedVillages.some(v => v.toLowerCase().includes(q)));

      return matchState && matchSeverity && matchSearch;
    });
  }, [alerts, selectedState, selectedSeverity, searchQuery]);

  const unacknowledged = filteredAlerts.filter(a => !a.acknowledged);
  const acknowledged = filteredAlerts.filter(a => a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Top Banner with Evaluator Explanation Toggle */}
      <EvaluatorHeaderBanner
        pageTitle="Alerts & Automated Early Warning Dispatch"
        description="Automated early warning notifications, SMS & WhatsApp broadcast engine, and district emergency response dispatch for North Eastern Region."
        isEvaluatorMode={showEvaluatorExplanations}
        onToggleEvaluatorMode={() => setShowEvaluatorExplanations(!showEvaluatorExplanations)}
      />

      {/* KPI Alert Status Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-red-500/30">
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
              <ShieldAlert className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{unacknowledged.length}</p>
              <p className="text-xs text-slate-400">
                {selectedState !== 'all' ? `Pending Alerts (${selectedState})` : 'Pending Alerts'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{acknowledged.length}</p>
              <p className="text-xs text-slate-400">Acknowledged Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/20">
              <Bell className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{filteredAlerts.length}</p>
              <p className="text-xs text-slate-400">Filtered System Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* STATE & SEVERITY FILTER CONTROL BAR (Available for All Roles) */}
      <Card className="border-border/60 bg-card p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-accent-bright shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Filter System Alerts by State & Severity</h3>
              <p className="text-[11px] text-muted-foreground">Select an Indian State to view localized warning dispatches and broadcast alerts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center w-full md:w-auto">
            {/* State Selector */}
            <div className="sm:col-span-5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">State / Territory Filter:</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="w-full rounded-lg border border-accent-bright/40 bg-card-hover px-3 py-2 text-xs text-foreground font-bold focus:outline-hidden focus:border-accent-bright"
              >
                <option value="all">🌐 All Indian States & Territories ({alerts.length})</option>
                {availableStates.map(st => {
                  const stateCount = alerts.filter(a => a.location?.state?.toLowerCase() === st.toLowerCase()).length;
                  return (
                    <option key={st} value={st}>
                      📍 {st} ({stateCount} alert{stateCount !== 1 ? 's' : ''})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="sm:col-span-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Threat Tier:</label>
              <select
                value={selectedSeverity}
                onChange={e => setSelectedSeverity(e.target.value)}
                className="w-full rounded-lg border border-border bg-card-hover px-3 py-2 text-xs text-foreground font-semibold focus:outline-hidden focus:border-accent-bright"
              >
                <option value="all">All Threat Tiers</option>
                <option value="critical">🚨 Critical</option>
                <option value="high">⚠️ High</option>
                <option value="moderate">🟡 Moderate</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Search Query:</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="District, village..."
                  className="w-full rounded-lg border border-border bg-card-hover pl-8 pr-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-accent-bright"
                />
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Interactive Automated Broadcast Console (Admin / Authority / Field Official Only) */}
      {isAdmin && (
        <div className="space-y-3">
          <BroadcastSimulator />
          
          {showEvaluatorExplanations && (
            <EvaluatorExplanationCard
              title="Automated SMS Broadcast Dispatch System"
              purpose="Simulates automated early warning dispatches across NER districts in regional languages."
              inputs="AI risk probability thresholds, affected village boundaries, and multilingual notification templates (English, Assamese, Khasi, Hindi, Manipuri)."
              psReference="PS_26001 Requirement (c), (f) & Expected Solution point 5"
              evaluatorNote="Demonstrates automated early warning dispatch capabilities that notify district magistrates, local village heads, and rescue teams before catastrophic landslides strike."
            />
          )}
        </div>
      )}

      {/* Active Warning Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Radio className="h-5 w-5 text-accent-bright animate-pulse" />
            Active Warning Queue & Emergency Action Protocols
          </h2>
          <span className="text-xs text-slate-400">
            Showing {unacknowledged.length} pending alert{unacknowledged.length !== 1 ? 's' : ''}
            {selectedState !== 'all' ? ` for ${selectedState}` : ''}
          </span>
        </div>

        {unacknowledged.length === 0 && (
          <Card className="border border-dashed border-border/60 bg-card-hover/20 p-8 text-center text-muted-foreground space-y-2">
            <Compass className="w-10 h-10 mx-auto text-accent-bright opacity-60" />
            <p className="text-xs font-bold text-foreground">No Pending Hazard Alerts Found</p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              {selectedState !== 'all'
                ? `There are currently no active or unacknowledged hazard alerts registered for ${selectedState}.`
                : 'All system hazard alerts have been acknowledged or resolved.'}
            </p>
            {selectedState !== 'all' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedState('all')}
                className="text-xs font-semibold mt-2"
              >
                Reset State Filter (Show All States)
              </Button>
            )}
          </Card>
        )}

        {unacknowledged.map((alert, i) => {
          const guide = actionGuide[alert.riskLevel] || actionGuide['moderate'];
          const Icon = guide.icon;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`${alert.riskLevel === 'critical' ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : ''}`}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        alert.riskLevel === 'critical' ? 'bg-red-500/20' : 'bg-amber-500/20'
                      }`}>
                        <Icon className={`h-5 w-5 ${alert.riskLevel === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <RiskBadge level={alert.riskLevel} pulse={alert.riskLevel === 'critical'} />
                          <DataSourceBadge source={alert.dataSource} />
                          {alert.location?.state && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/20 text-accent-bright border border-accent/30 font-mono">
                              STATE: {alert.location.state.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-white mt-2">{alert.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-300">
                            <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            {alert.district}, {alert.location?.state || 'India'}
                          </span>
                          <span>{formatDate(alert.timestamp)}</span>
                          <span>{formatRelativeTime(alert.timestamp)}</span>
                        </div>
                        {alert.affectedVillages && alert.affectedVillages.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-slate-500 mb-1">Affected Vulnerable Villages:</p>
                            <div className="flex flex-wrap gap-1">
                              {alert.affectedVillages.map(v => (
                                <span key={v} className="rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs text-red-400">{v}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-slate-400 mb-1">Standard Operating Action Protocols:</p>
                          <ul className="space-y-1">
                            {guide.actions.map(action => (
                              <li key={action} className="text-xs text-slate-500 flex items-center gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-sky-400" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => acknowledgeAlert(alert.id)}>Acknowledge Alert</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {acknowledged.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-400">Acknowledged Alerts Archive ({acknowledged.length})</h2>
          {acknowledged.map(alert => (
            <Card key={alert.id} className="opacity-60">
              <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status="completed" />
                  <div>
                    <p className="text-sm text-white">{alert.title}</p>
                    <p className="text-xs text-slate-500">
                      {alert.district}, {alert.location?.state || 'India'} • {formatRelativeTime(alert.timestamp)}
                    </p>
                  </div>
                </div>
                <RiskBadge level={alert.riskLevel} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
