import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMonitorData } from '../hooks/useMonitorData';
import { Card, CardContent } from '../components/ui/Card';
import { RiskBadge, DataSourceBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BroadcastSimulator } from '../components/dashboard/BroadcastSimulator';
import { EvaluatorExplanationCard, EvaluatorHeaderBanner } from '../components/ui/EvaluatorExplanationCard';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { Bell, MapPin, CheckCircle, AlertTriangle, ShieldAlert, Radio } from 'lucide-react';

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

export function AlertsPage() {
  const { alerts, acknowledgeAlert } = useMonitorData();
  const [showEvaluatorExplanations, setShowEvaluatorExplanations] = useState(true);

  const unacknowledged = alerts.filter(a => !a.acknowledged);
  const acknowledged = alerts.filter(a => a.acknowledged);

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
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-500/30">
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
              <ShieldAlert className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{unacknowledged.length}</p>
              <p className="text-xs text-slate-400">Pending Alerts</p>
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
              <p className="text-2xl font-bold text-white">{alerts.length}</p>
              <p className="text-xs text-slate-400">Total System Alerts (24h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 1: Interactive Automated SMS & Multi-Channel Broadcast Console */}
      <div className="space-y-3">
        <BroadcastSimulator />
        
        {showEvaluatorExplanations && (
          <EvaluatorExplanationCard
            title="Automated SMS & Multi-Channel Broadcast Dispatch System"
            purpose="Simulates automated multi-channel early warning dispatches (Mass SMS via telecom gateways, WhatsApp Meta Cloud API, PA Siren Towers, and NDRF Emergency Hotlines) across NER districts in regional languages."
            inputs="AI risk probability thresholds, affected village boundaries, and multilingual notification templates (English, Assamese, Khasi, Hindi, Manipuri)."
            psReference="PS_26001 Requirement (c), (f) & Expected Solution point 5"
            evaluatorNote="Demonstrates automated early warning dispatch capabilities that notify district magistrates, local village heads, and NDRF rescue teams before catastrophic landslides strike."
          />
        )}
      </div>

      {/* Active Warning Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Radio className="h-5 w-5 text-accent-bright" />
            Active Warning Queue & Emergency Action Protocols
          </h2>
          <span className="text-xs text-slate-400">{unacknowledged.length} alerts pending acknowledgement</span>
        </div>

        {unacknowledged.map((alert, i) => {
          const guide = actionGuide[alert.riskLevel];
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
                  <div className="flex items-start justify-between">
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
                        </div>
                        <h3 className="text-base font-semibold text-white mt-2">{alert.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{alert.district}, {alert.location.state}</span>
                          <span>{formatDate(alert.timestamp)}</span>
                          <span>{formatRelativeTime(alert.timestamp)}</span>
                        </div>
                        {alert.affectedVillages.length > 0 && (
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
          <h2 className="text-lg font-semibold text-slate-400">Acknowledged Alerts Archive</h2>
          {acknowledged.map(alert => (
            <Card key={alert.id} className="opacity-60">
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status="completed" />
                  <div>
                    <p className="text-sm text-white">{alert.title}</p>
                    <p className="text-xs text-slate-500">{formatRelativeTime(alert.timestamp)}</p>
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
