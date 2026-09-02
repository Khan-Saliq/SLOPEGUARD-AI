import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useMonitorData } from '../../hooks/useMonitorData';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, CloudSync, Sparkles } from 'lucide-react';

export function OfflineSyncBar() {
  const { isOnline, simulatedOffline, toggleOfflineMode, pendingReports, syncQueue } = useOfflineSync();
  const { submitReport } = useMonitorData();
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleManualSync = () => {
    const count = syncQueue(submitReport);
    if (count > 0) {
      setSyncNotice(`Successfully synchronized ${count} offline field report(s) with cloud database!`);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Network Status & Simulator Control Bar */}
      <div className={`rounded-xl border px-4 py-2.5 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md transition-all ${
        !isOnline
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-accent/20 bg-card/60 text-dim'
      }`}>
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <span className="flex items-center gap-1.5 font-semibold text-amber-400">
              <WifiOff className="h-4 w-4 animate-pulse shrink-0" />
              Low-Network / Offline Mode Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-low">
              <Wifi className="h-4 w-4 shrink-0 text-low" />
              Cloud Sync Connected
            </span>
          )}

          <span className="hidden sm:inline text-dim">•</span>

          <span className="text-[11px] text-dim">
            {!isOnline
              ? 'Reports saved locally on device (IndexedDB) & queued for cloud sync.'
              : 'Real-time telemetry stream synchronized.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pendingReports.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-[10px] text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
              <CloudSync className="h-3 w-3" /> {pendingReports.length} Pending Offline Sync
            </span>
          )}

          {isOnline && pendingReports.length > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              className="flex items-center gap-1.5 rounded-lg bg-low/20 px-2.5 py-1 text-[11px] font-semibold text-low border border-low/30 hover:bg-low/30 transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Sync Queue Now
            </button>
          )}

          <button
            type="button"
            onClick={toggleOfflineMode}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-all ${
              simulatedOffline
                ? 'border-amber-400 bg-amber-500/30 text-amber-200'
                : 'border-border bg-card-hover text-dim hover:text-main'
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            {simulatedOffline ? 'Restore Network Connection' : 'Simulate Low-Network Offline'}
          </button>
        </div>
      </div>

      {/* Sync Success Feedback Notice */}
      <AnimatePresence>
        {syncNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-low/40 bg-low/15 p-2.5 text-xs text-low flex items-center justify-between"
          >
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {syncNotice}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
