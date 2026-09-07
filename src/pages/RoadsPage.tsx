import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMonitorData } from '../hooks/useMonitorData';
import { SharedEvacuationMap } from '../components/map/SharedEvacuationMap';
import { SafeRouteCalculator } from '../components/map/SafeRouteCalculator';
import { EvaluatorExplanationCard, EvaluatorHeaderBanner } from '../components/ui/EvaluatorExplanationCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { formatRelativeTime } from '../lib/utils';
import { Route, Users, AlertTriangle, ShieldAlert } from 'lucide-react';

export function RoadsPage() {
  const { roads, villages, shelters, hospitals, evacuationRoutes } = useMonitorData();
  const [showEvaluatorExplanations, setShowEvaluatorExplanations] = useState(true);

  const blocked = roads.filter(r => r.status === 'blocked');
  const vulnerable = roads.filter(r => r.status === 'vulnerable');
  const operational = roads.filter(r => r.status === 'operational');
  const isolated = villages.filter(v => v.connectivityStatus === 'isolated');

  return (
    <div className="space-y-6">
      {/* Top Banner with Evaluator Explanation Toggle */}
      <EvaluatorHeaderBanner
        pageTitle="Admin Road Connectivity & Evacuation Command Center"
        description="Unified emergency evacuation-routing system and road status management. Monitor road network status, verify blockages, and publish official evacuation routes to citizens."
        isEvaluatorMode={showEvaluatorExplanations}
        onToggleEvaluatorMode={() => setShowEvaluatorExplanations(!showEvaluatorExplanations)}
      />

      {/* Connectivity Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Blocked Roads', count: blocked.length, color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle },
          { label: 'Vulnerable Roads', count: vulnerable.length, color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Route },
          { label: 'Operational Routes', count: operational.length, color: 'text-green-400', bg: 'bg-green-500/20', icon: Route },
          { label: 'Isolated Settlements', count: isolated.length, color: 'text-red-400', bg: 'bg-red-500/20', icon: Users },
        ].map(({ label, count, color, bg, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="pt-5 flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Shared Unified Safe Route Pathfinder & Admin Control Console */}
      <div className="space-y-3">
        <SafeRouteCalculator isAdmin={true} />
        {showEvaluatorExplanations && (
          <EvaluatorExplanationCard
            title="Unified Emergency Safe Route Pathfinder Engine"
            purpose="Calculates safe emergency relief and evacuation routes using OpenRouteService with OSRM fallback, evaluating hazard zones and blocked roads to publish official evacuation corridors."
            inputs="OpenRouteService directions proxy, GPS location search, road blockage statuses, risk zone sensor data."
            psReference="PS_26001 Section 6.8, 6.9 & 16.0"
            evaluatorNote="Citizens and Admins use the exact same underlying routing engine and interactive Leaflet map. Admins are equipped with operational controls to update road statuses and publish official evacuation routes directly."
          />
        )}
      </div>

      {/* GIS Spatial Road Network & Blocked Highways Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-1 lg:col-span-7">
          <Card className="h-[480px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Route className="h-4 w-4 text-accent-bright" /> GIS Spatial Evacuation & Road Network Map
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)]">
              <SharedEvacuationMap
                roads={roads}
                shelters={shelters}
                hospitals={hospitals}
                evacuationRoutes={evacuationRoutes}
                height="100%"
              />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Active Blocked & Damaged Roads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {blocked.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No completely blocked roads currently reported.</p>
                ) : (
                  blocked.map(road => (
                    <div key={road.id} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{road.name}</p>
                        <StatusBadge status="blocked" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {road.district} · {road.lastReport && formatRelativeTime(road.lastReport)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-emerald-500" /> Published Evacuation Corridors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {evacuationRoutes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No official evacuation routes published yet.</p>
                ) : (
                  evacuationRoutes.map(er => (
                    <div key={er.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-400">{er.title}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase">
                          {er.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {er.originName} ➔ {er.destinationName} ({er.distanceKm} km)
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
