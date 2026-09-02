import { motion } from 'framer-motion';
import { formatRelativeTime } from '../../lib/utils';

interface LiveIndicatorProps {
  lastUpdated: Date;
  tickCount: number;
}

export function LiveIndicator({ lastUpdated, tickCount }: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1">
      <motion.span
        key={tickCount}
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 0.6 }}
        className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]"
      />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-bright">Live</span>
      <span className="text-[10px] text-dim">Updated {formatRelativeTime(lastUpdated.toISOString())}</span>
    </div>
  );
}
