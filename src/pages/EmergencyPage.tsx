import { motion } from 'framer-motion';
import { useMonitorData } from '../hooks/useMonitorData';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { RiskBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate, getRiskScoreColor } from '../lib/utils';
import { Siren, Users, MapPin, Clock, ArrowUpRight } from 'lucide-react';

export function EmergencyPage() {
  const { emergencyTasks, assignTask, updateTaskStatus } = useMonitorData();
  const sorted = [...emergencyTasks].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Emergency Response Prioritisation</h1>
        <p className="text-sm text-slate-400 mt-1">AI-ranked response tasks based on risk severity, connectivity, and exposure</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical Tasks', count: sorted.filter(t => t.riskLevel === 'critical').length, color: '#ef4444' },
          { label: 'In Progress', count: sorted.filter(t => t.status === 'in_progress').length, color: '#0ea5e9' },
          { label: 'Pending', count: sorted.filter(t => t.status === 'pending').length, color: '#f59e0b' },
        ].map(({ label, count, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-3xl font-bold" style={{ color }}>{count}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        {sorted.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className={`${task.riskLevel === 'critical' ? 'border-red-500/30' : ''} hover:border-slate-600 transition-all`} hover>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                        style={{ backgroundColor: `${getRiskScoreColor(task.priority)}30`, color: getRiskScoreColor(task.priority) }}
                      >
                        #{i + 1}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-slate-500">P:{task.priority}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <RiskBadge level={task.riskLevel} pulse={task.riskLevel === 'critical'} />
                        <StatusBadge status={task.status} />
                      </div>
                      <h3 className="text-base font-semibold text-white mt-2">{task.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{task.district}, {task.location.state}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{task.affectedPopulation.toLocaleString()} affected</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(task.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        <Siren className="h-3 w-3 inline mr-1" />
                        {task.connectivityImpact}
                      </p>
                      {task.assignedTeam && (
                        <p className="text-xs text-sky-400 mt-1">Assigned: {task.assignedTeam}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {task.status === 'pending' && (
                      <Button variant="primary" size="sm" onClick={() => assignTask(task.id, 'NDRF Response Team')}>
                        Assign Team <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button variant="secondary" size="sm" onClick={() => updateTaskStatus(task.id, 'completed')}>Mark Complete</Button>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Priority Score</span>
                    <span className="font-mono">{task.priority}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${task.priority}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getRiskScoreColor(task.priority) }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Priority Scoring Formula</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 font-mono bg-slate-800/50 rounded-lg p-4">
            Action Priority = W₁×Predicted Risk + W₂×Evidence Confidence + W₃×Criticality + W₄×Exposure/Connectivity + W₅×Citizen Trust
          </p>
          <div className="grid grid-cols-5 gap-3 mt-4">
            {[
              { label: 'Predicted Risk', weight: '0.35' },
              { label: 'Evidence Confidence', weight: '0.25' },
              { label: 'Criticality', weight: '0.20' },
              { label: 'Exposure/Connectivity', weight: '0.15' },
              { label: 'Citizen Trust', weight: '0.05' },
            ].map(w => (
              <div key={w.label} className="rounded-lg bg-slate-800/50 p-3 text-center">
                <p className="text-lg font-bold text-sky-400">{w.weight}</p>
                <p className="text-[10px] text-slate-500 mt-1">{w.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
