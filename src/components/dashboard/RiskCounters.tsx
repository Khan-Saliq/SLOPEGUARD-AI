import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';
import { useMonitorData } from '../../hooks/useMonitorData';
import { RISK_COLORS } from '../../lib/utils';
import { RiskGauge3D } from '../3d/RiskGauge3D';
import type { RiskLevel } from '../../types';

const levels: { key: RiskLevel; icon: typeof ShieldAlert; label: string }[] = [
  { key: 'critical', icon: ShieldAlert, label: 'Critical' },
  { key: 'high', icon: AlertTriangle, label: 'High' },
  { key: 'moderate', icon: TrendingUp, label: 'Moderate' },
  { key: 'low', icon: CheckCircle, label: 'Low' },
];

export function RiskCounters() {
  const { riskZones, tickCount } = useMonitorData();

  const counts = levels.map(l => ({
    ...l,
    count: riskZones.filter(z => z.riskLevel === l.key).length,
  }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {counts.map(({ key, icon: Icon, label, count }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden rounded-xl border border-border/60 bg-card/90 p-3 sm:p-4"
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{ background: `radial-gradient(circle at top right, ${RISK_COLORS[key]}, transparent 70%)` }}
          />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex-1">
              <p className="text-[11px] sm:text-xs text-dim font-medium">{label} Risk</p>
              <motion.p
                key={`${count}-${tickCount}`}
                initial={{ scale: 1.15, color: RISK_COLORS[key] }}
                animate={{ scale: 1, color: 'var(--color-main)' }}
                className="text-2xl sm:text-3xl font-bold text-main mt-1 font-display"
              >
                {count}
              </motion.p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RiskGauge3D
                value={count}
                max={Math.max(riskZones.length, 1)}
                color={RISK_COLORS[key]}
                label=""
                className="h-16 w-16"
              />
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg -mt-2"
                style={{ backgroundColor: `${RISK_COLORS[key]}20`, color: RISK_COLORS[key] }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
          {key === 'critical' && count > 0 && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ backgroundColor: RISK_COLORS[key] }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
