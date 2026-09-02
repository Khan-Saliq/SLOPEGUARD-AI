import { motion } from 'framer-motion';
import { useApp } from '../hooks/useApp';
import { useMonitorData } from '../hooks/useMonitorData';
import { Card, CardContent } from '../components/ui/Card';
import { RiskBadge, StatusBadge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { MapPin, Shield, Clock } from 'lucide-react';

const statusFlow = ['submitted', 'ai_checked', 'under_review', 'action_assigned', 'resolved'];

export function ReportHistoryPage() {
  const { user } = useApp();
  const { citizenReports } = useMonitorData();
  const myReports = citizenReports.filter(r => r.userId === (user?.id ?? ''));
  const allReports = myReports.length > 0 ? myReports : citizenReports.slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Reports</h1>
        <p className="text-sm text-slate-400 mt-1">Track status and verification of your submitted hazard reports</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/20">
              <Shield className="h-7 w-7 text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Your Trust Score</p>
              <p className="text-3xl font-bold text-white">{user?.trustScore ?? '--'}%</p>
              <p className="text-xs text-slate-500 mt-1">
                Based on {allReports.length} reviewed reports · Verified Useful Reports ÷ Total Reviewed × 100
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-700 overflow-hidden">
              <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user?.trustScore ?? 0}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {allReports.map((report, i) => {
          const statusIdx = statusFlow.indexOf(report.status);
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card hover>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white capitalize">{report.category.replace(/_/g, ' ')}</span>
                        <RiskBadge level={report.severity} />
                        <StatusBadge status={report.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{report.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{report.location.area}, {report.location.district}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(report.timestamp)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">AI Confidence</p>
                      <p className="text-lg font-bold text-sky-400">{report.aiConfidence}%</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1">
                    {statusFlow.map((s, idx) => (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div className={`h-2 w-2 rounded-full ${idx <= statusIdx ? 'bg-sky-500' : 'bg-slate-600'}`} />
                        {idx < statusFlow.length - 1 && (
                          <div className={`flex-1 h-0.5 ${idx < statusIdx ? 'bg-sky-500' : 'bg-slate-700'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {statusFlow.map(s => (
                      <span key={s} className="text-[8px] text-slate-500 capitalize">{s.replace(/_/g, ' ')}</span>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded bg-slate-800/50 p-2">
                      <p className="text-slate-500">Evidence</p>
                      <StatusBadge status={report.evidenceAssessment} />
                    </div>
                    <div className="rounded bg-slate-800/50 p-2">
                      <p className="text-slate-500">Media</p>
                      <StatusBadge status={report.mediaAuthenticity} />
                    </div>
                    <div className="rounded bg-slate-800/50 p-2">
                      <p className="text-slate-500">Priority</p>
                      <p className="font-bold text-white font-mono">{report.actionPriority}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
