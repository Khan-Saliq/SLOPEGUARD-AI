import { Bell, Globe, Sparkles, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { useMonitorData } from '../../hooks/useMonitorData';
import { useLanguage } from '../../hooks/useLanguage';
import { formatRelativeTime } from '../../lib/utils';
import { LiveIndicator } from '../ui/LiveIndicator';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export function Header({ onToggleMobileMenu }: HeaderProps) {
  const { user } = useApp();
  const { notifications, lastUpdated, tickCount } = useMonitorData();
  const { language, setLanguage, t } = useLanguage();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const unread = notifications.filter(n => !n.read).length;

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'as', name: 'Assamese (অসমীয়া)', flag: '🇮🇳' },
    { code: 'kha', name: 'Khasi (Meghalaya)', flag: '🏔️' },
    { code: 'mni', name: 'Manipuri (ꯃꯩꯇꯩꯂꯣꯟ)', flag: '🏞️' },
    { code: 'hi', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali (বাংলা)', flag: '🇮🇳' },
  ];

  const currentLangObj = languages.find(l => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-elevated/90 backdrop-blur-xl px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Button */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden rounded-lg border border-border/60 bg-card-hover/60 p-2 text-main hover:bg-card-hover transition-colors"
            aria-label="Open Mobile Navigation Menu"
          >
            <Menu className="h-5 w-5 text-accent-bright" />
          </button>
        )}

        <div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-main truncate max-w-[180px] sm:max-w-none">
            {(user?.role ?? 'citizen') === 'authority' ? t('command_center') : t('citizen_portal')}
          </h2>
          <p className="text-[10px] sm:text-xs text-dim hidden xs:block">
            SLOPEGUARD AI · {t('live_monitoring')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <LiveIndicator lastUpdated={lastUpdated} tickCount={tickCount} />
        </div>

        {/* Regional Multilingual Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card-hover/60 px-2 sm:px-2.5 py-1.5 text-xs text-main hover:bg-card-hover transition-colors"
          >
            <Globe className="h-4 w-4 text-accent-bright shrink-0" />
            <span className="font-medium text-[10px] sm:text-[11px] truncate max-w-[70px] sm:max-w-none">
              {currentLangObj.flag} {currentLangObj.name.split(' ')[0]}
            </span>
          </button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl p-2 z-50 space-y-1"
              >
                <div className="border-b border-border px-2 py-1.5 text-[10px] font-semibold text-dim uppercase tracking-wider flex items-center justify-between">
                  <span>NER Languages</span>
                  <span className="text-accent-bright font-mono text-[9px] flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> PS_26001
                  </span>
                </div>
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      language === lang.code
                        ? 'bg-accent/20 text-accent-bright font-semibold'
                        : 'text-main hover:bg-card-hover'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {language === lang.code && <span className="text-xs text-accent-bright">✓</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative rounded-lg border border-border bg-card-hover/60 p-2 text-dim hover:bg-card-hover hover:text-main transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-card shadow-2xl p-3 z-50 space-y-2"
              >
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-main">System Notifications</span>
                  <span className="text-[10px] text-dim">{notifications.length} total</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-dim py-3 text-center">No active notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="rounded-lg bg-card-hover/40 p-2 text-xs border border-border/40">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-main">{n.title}</span>
                          <span className="text-[10px] text-accent-bright font-mono uppercase bg-accent/10 px-1.5 py-0.5 rounded">{n.type}</span>
                        </div>
                        <p className="text-dim text-[11px] mt-1">{n.message}</p>
                        <p className="text-[9px] text-dim mt-1 font-mono">{formatRelativeTime(n.timestamp)}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
