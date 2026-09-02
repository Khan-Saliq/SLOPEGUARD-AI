import { cn, RISK_BG } from '../../lib/utils';
import type { RiskLevel } from '../../types';

interface BadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function RiskBadge({ level, size = 'sm', pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium capitalize',
        RISK_BG[level],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        pulse && level === 'critical' && 'animate-pulse',
      )}
    >
      {level}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const colors: Record<string, string> = {
    operational: 'bg-low/20 text-[#6a9a78] border-low/30',
    vulnerable: 'bg-moderate/20 text-[#d4b05a] border-moderate/30',
    blocked: 'bg-critical/20 text-[#d86058] border-critical/30',
    pending: 'bg-moderate/20 text-[#d4b05a] border-moderate/30',
    in_progress: 'bg-accent/20 text-accent-bright border-accent/30',
    completed: 'bg-low/20 text-[#6a9a78] border-low/30',
    connected: 'bg-low/20 text-[#6a9a78] border-low/30',
    partial: 'bg-moderate/20 text-[#d4b05a] border-moderate/30',
    isolated: 'bg-critical/20 text-[#d86058] border-critical/30',
    genuine: 'bg-low/20 text-[#6a9a78] border-low/30',
    likely_genuine: 'bg-accent/20 text-accent-bright border-accent/30',
    suspicious: 'bg-critical/20 text-[#d86058] border-critical/30',
    submitted: 'bg-accent/20 text-accent-bright border-accent/30',
    ai_checked: 'bg-accent-warm/20 text-accent-warm border-accent-warm/30',
    under_review: 'bg-moderate/20 text-[#d4b05a] border-moderate/30',
    action_assigned: 'bg-accent/20 text-accent-bright border-accent/30',
    resolved: 'bg-low/20 text-[#6a9a78] border-low/30',
    likely_original: 'bg-accent/20 text-accent-bright border-accent/30',
    potentially_manipulated: 'bg-critical/20 text-[#d86058] border-critical/30',
    unknown: 'bg-card-hover text-dim border-border/30',
    insufficient: 'bg-card-hover text-dim border-border/30',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize', colors[status] || 'bg-card-hover text-dim border-border/30', className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function DataSourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    ai_prediction: 'AI Prediction',
    sensor: 'Sensor Data',
    satellite: 'Satellite',
    citizen_report: 'Citizen Report',
  };
  const colors: Record<string, string> = {
    ai_prediction: 'bg-accent-warm/20 text-accent-warm',
    sensor: 'bg-accent/20 text-accent-bright',
    satellite: 'bg-muted/10 text-muted',
    citizen_report: 'bg-high/20 text-[#e09050]',
  };
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', colors[source])}>
      {labels[source] || source}
    </span>
  );
}
