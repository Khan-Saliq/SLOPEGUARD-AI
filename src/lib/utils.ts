import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4d7a5a',
  moderate: '#b8963a',
  high: '#c4703a',
  critical: '#b8433a',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

export const RISK_BG: Record<RiskLevel, string> = {
  low: 'bg-low/20 text-[#6a9a78] border-low/35',
  moderate: 'bg-moderate/20 text-[#d4b05a] border-moderate/35',
  high: 'bg-high/20 text-[#e09050] border-high/35',
  critical: 'bg-critical/20 text-[#d86058] border-critical/35',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function getRiskScoreColor(score: number): string {
  if (score >= 80) return RISK_COLORS.critical;
  if (score >= 60) return RISK_COLORS.high;
  if (score >= 40) return RISK_COLORS.moderate;
  return RISK_COLORS.low;
}
