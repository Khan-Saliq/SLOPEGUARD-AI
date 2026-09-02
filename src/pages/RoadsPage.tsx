import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMonitorData } from '../hooks/useMonitorData';
import { GISMap } from '../components/map/GISMap';
import { SafeRouteCalculator } from '../components/map/SafeRouteCalculator';
import { EvaluatorExplanationCard, EvaluatorHeaderBanner } from '../components/ui/EvaluatorExplanationCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { RiskBadge, StatusBadge } from '../components/ui/Badge';
import { formatRelativeTime } from '../lib/utils';
import { Route, Users, AlertTriangle } from 'lucide-react';

export function RoadsPage() {
  const { roads, villages } = useMonitorData();
  const [showEvaluatorExplanations, setShowEvaluatorExplanations] = useState(true);

  const blocked = roads.filter(r => r.status === 'blocked');
  const vulnerable = roads.filter(r => r.status === 'vulnerable');
  const operational = roads.filter(r => r.status === 'operational');
  const isolated = villages.filter(v => v.connectivityStatus === 'isolated');

  return (
    <div className="space-y-6">
      {/* Top Banner with Evaluator Explanation Toggle */}
      <EvaluatorHeaderBanner
        pageTitle="Road Connectivity & Emergency Routing"
        description="Real-time road network connectivity monitoring, blocked highway detection, isolated village tracking, and automated safe evacuation routing."
        isEvaluatorMode={showEvaluatorExplanations}
        onToggleEvaluatorMode={() => setShowEvaluatorExplanations(!showEvaluatorExplanations)}
      />

      {/* Connectivity Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Blocked Roads', count: blocked.length, color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle },
          { label: 'Vulnerable Roads', count: vulnerable.length, color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Route },
          { label: 'Operational Routes', count: operational.length, color: 'text-green-400', bg: 'bg-green-500/20', icon: Route },
          { label: 'Isolated Villages', count: isolated.length, color: 'text-red-400', bg: 'bg-red-500/20', icon: Users },
        ].map(({ label, count, color, bg, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="pt-5 flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Step 3: Interactive Automated Emergency Safe Route Pathfinder Console */}
      <div className="space-y-3">
        <SafeRouteCalculator roads={roads} villages={villages} />
        {showEvaluatorExplanations && (
          <EvaluatorExplanationCard
            title="Automated Emergency Safe Route Pathfinder Engine"
            purpose="Calculates safe emergency relief and evacuation routes bypassing active landslide blockages and vulnerable slope passes to reach isolated mountain villages."
            inputs="GIS road network vectors, real-time road blockage statuses, terrain slope steepness, and village geographic coordinates."
            psReference="PS_26001 Section 6.8, 6.9 & 16.0"
            evaluatorNote="Demonstrates automated decision support for emergency teams, allowing NDRF and district authorities to quickly dispatch relief supplies without getting stuck behind blocked mountain passes."
          />
        )}
      </div>

      {/* GIS Spatial Road Network & Blocked Highways Grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <Card className="h-[450px]">
            <CardHeader><CardTitle className="flex items-center gap-2"><Route className="h-4 w-4 text-accent-bright" /> GIS Spatial Road Network Map</CardTitle></CardHeader>
            <CardContent className="h-[calc(100%-60px)]">
              <GISMap roads={roads} height="100%" showHeatmap={false} />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Active Blocked Highways</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {blocked.map(road => (
                  <div key={road.id} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{road.name}</p>
                      <StatusBadge status="blocked" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{road.district} · {road.lastReport && formatRelativeTime(road.lastReport)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-red-400 flex items-center gap-2"><Users className="h-4 w-4" /> Isolated Remote Settlements</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {isolated.map(v => (
                  <div key={v.id} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{v.name}</p>
                        <p className="text-xs text-slate-500">{v.district} · Population: {v.population}</p>
                      </div>
                      <StatusBadge status="isolated" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comprehensive Road Inventory Table */}
      <Card>
        <CardHeader><CardTitle>Comprehensive Regional Road Status Inventory</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                  <th className="pb-3 pr-4">Road Name</th>
                  <th className="pb-3 pr-4">District</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Risk Level</th>
                  <th className="pb-3">Last Report</th>
                </tr>
              </thead>
              <tbody>
                {roads.map(road => (
                  <tr key={road.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4 font-medium text-white">{road.name}</td>
                    <td className="py-3 pr-4 text-slate-400">{road.district}</td>
                    <td className="py-3 pr-4"><StatusBadge status={road.status} /></td>
                    <td className="py-3 pr-4"><RiskBadge level={road.riskLevel} /></td>
                    <td className="py-3 text-slate-500 text-xs">{road.lastReport ? formatRelativeTime(road.lastReport) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
