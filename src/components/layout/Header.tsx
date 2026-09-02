import { Bell, UserCircle, Globe, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { useMonitorData } from '../../hooks/useMonitorData';
import { useLanguage } from '../../hooks/useLanguage';
import { formatRelativeTime } from '../../lib/utils';
import { RiskBadge } from '../ui/Badge';
import { LiveIndicator } from '../ui/LiveIndicator';

export function Header() {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-elevated/90 backdrop-blur-xl px-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-main">
          {(user?.role ?? 'citizen') === 'authority' ? t('command_center') : t('citizen_portal')}
        </h2>
        <p className="text-xs text-dim">
          SLOPEGUARD AI · {t('live_monitoring')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <LiveIndicator lastUpdated={lastUpdated} tickCount={tickCount} />

        {/* Regional Multilingual Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card-hover/60 px-2.5 py-1.5 text-xs text-main hover:bg-card-hover transition-colors"
          >
            <Globe className="h-4 w-4 text-accent-bright" />
            <span className="font-medium text-[11px]">{currentLangObj.flag} {currentLangObj.name.split(' ')[0]}</span>
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
            className="relative rounded-lg p-2 text-dim hover:bg-card-hover hover:text-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[10px] font-bold text-main">
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
                className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl z-50"
              >
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-main">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`border-b border-border/50 px-4 py-3 ${!n.read ? 'bg-accent/5' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-main">{n.title}</span>
                        <RiskBadge level={n.type} />
                      </div>
                      <p className="mt-1 text-xs text-dim">{n.message}</p>
                      <p className="mt-1 text-[10px] text-dim/70">{formatRelativeTime(n.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-1.5">
          <UserCircle className="h-5 w-5 text-accent-bright" />
          <div>
            <p className="text-xs font-medium text-main">{user?.name ?? 'Guest'}</p>
            <p className="text-[10px] text-dim capitalize">{(user?.role ?? 'guest').replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
