import { motion } from 'framer-motion';
import { useMonitorData } from '../../hooks/useMonitorData';
import { RiskBadge, DataSourceBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatRelativeTime } from '../../lib/utils';
import { Bell, MapPin } from 'lucide-react';
import type { RiskZone } from '../../types';

export function AlertCards({ selectedZone }: { selectedZone?: RiskZone | null }) {
  const { alerts, acknowledgeAlert } = useMonitorData();

  let filteredAlerts = alerts;
  if (selectedZone) {
    const matching = alerts.filter(a => a.district === selectedZone.location.district || a.title.includes(selectedZone.name));
    if (matching.length > 0) {
      filteredAlerts = matching;
    } else {
      // Generate live contextual alert for clicked zone
      filteredAlerts = [
        {
          id: `zone-alert-${selectedZone.id}`,
          title: `Focused Alert — ${selectedZone.name}`,
          message: `Live telemetry for ${selectedZone.name} (${selectedZone.location.district}). Risk Score: ${selectedZone.riskScore}. Rainfall: ${selectedZone.rainfall}mm, Moisture: ${selectedZone.soilMoisture}%, Slope: ${selectedZone.slope}°.`,
          riskLevel: selectedZone.riskLevel,
          district: selectedZone.location.district,
          location: selectedZone.location,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          dataSource: 'sensor',
          affectedRoads: ['Local Access Road'],
          affectedVillages: [selectedZone.name],
        },
      ];
    }
  }

  const activeAlerts = filteredAlerts.filter(a => !a.acknowledged);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted flex items-center gap-2">
          <Bell className="h-4 w-4 text-critical" />
          {selectedZone ? `Alerts for ${selectedZone.location.district}` : 'Active Early Warnings'}
          <span className="rounded-full bg-critical/20 px-2 py-0.5 text-xs text-critical">{activeAlerts.length}</span>
        </h3>
      </div>
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {filteredAlerts.map((alert, i) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-lg border p-3 transition-all ${
              alert.riskLevel === 'critical' && !alert.acknowledged
                ? 'border-critical/40 bg-critical/5 shadow-[0_0_15px_rgba(184,67,58,0.12)]'
                : 'border-border/60 bg-card-hover/40'
            } ${alert.acknowledged ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <RiskBadge level={alert.riskLevel} pulse={!alert.acknowledged && alert.riskLevel === 'critical'} />
                  <DataSourceBadge source={alert.dataSource} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-main truncate">{alert.title}</p>
                <p className="mt-0.5 text-xs text-dim line-clamp-2">{alert.message}</p>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-dim">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {alert.district}
                  </span>
                  <span>{formatRelativeTime(alert.timestamp)}</span>
                </div>
              </div>
              {!alert.acknowledged && (
                <Button variant="ghost" size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                  Ack
                </Button>
              )}
            </div>
            {alert.affectedRoads.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {alert.affectedRoads.map(road => (
                  <span key={road} className="rounded bg-card-hover px-1.5 py-0.5 text-[10px] text-dim">
                    {road}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
