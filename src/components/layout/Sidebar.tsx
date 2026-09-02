import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Bell, BarChart3, Route, Siren,
  Camera, History, Mountain, WifiOff, FileWarning, X,
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import { useMonitorData } from '../../hooks/useMonitorData';
import { useEffect, useState } from 'react';

const authorityLinks = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/map', icon: Map, key: 'map' },
  { to: '/alerts', icon: Bell, key: 'alerts' },
  { to: '/notifications', icon: Bell, key: 'notifications' },
  { to: '/assignments', icon: FileWarning, key: 'assignments' },
  { to: '/analytics', icon: BarChart3, key: 'analytics' },
  { to: '/roads', icon: Route, key: 'roads' },
  { to: '/emergency', icon: Siren, key: 'emergency' },
];

const citizenLinks = [
  { to: '/citizen', icon: Camera, key: 'report' },
  { to: '/report', icon: Mountain, key: 'reportHazard' },
  { to: '/history', icon: History, key: 'history' },
  { to: '/notifications', icon: Bell, key: 'notifications' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, isOffline } = useApp();
  const { alerts, pendingSyncCount } = useMonitorData();
  const links = (user?.role ?? 'citizen') === 'authority' ? authorityLinks : citizenLinks;
  const pendingAlerts = alerts.filter(a => !a.acknowledged).length;
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const token = window.localStorage.getItem('token');
    if (!token) return;
    const host = window.location.hostname;
    const streamUrl = (host === 'localhost' || host === '127.0.0.1')
      ? `http://localhost:4000/api/stream?token=${encodeURIComponent(token)}`
      : `/api/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);
    es.addEventListener('notification', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d && d.userId === (window.localStorage.getItem('userId') || null) || true) {
          setUnreadNotifications(n => n + 1);
        }
      } catch (e) { }
    });
    es.addEventListener('ping', () => {});
    return () => { es.close(); };
  }, [user]);

  const label = (key: string) => {
    const map: Record<string, string> = {
      dashboard: 'Dashboard',
      map: 'Map',
      alerts: 'Alerts',
      analytics: 'Analytics',
      roads: 'Roads',
      emergency: 'Emergency',
      assignments: 'Assignments',
      report: 'Citizen Portal',
      reportHazard: 'Report Hazard',
      history: 'My Reports',
      settings: 'Settings',
    };
    return map[key] ?? key;
  };

  const navContent = (
    <div className="flex h-full flex-col bg-elevated/95 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shrink-0">
            <img src="/logo.png" alt="SLOPEGUARD AI" className="h-9 w-9 object-contain drop-shadow-sm" />
          </div>
          <div>
            <h1 className="font-display text-sm font-bold text-main leading-tight">SLOPEGUARD AI</h1>
            <p className="text-[10px] text-dim">Risk Monitor · Live</p>
          </div>
        </div>

        {/* Mobile Close X Button */}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden rounded-lg p-1.5 text-dim hover:bg-card-hover hover:text-main"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOffline && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-accent-warm/10 border border-accent-warm/30 px-3 py-2">
          <WifiOff className="h-4 w-4 text-accent-warm" />
          <span className="text-xs text-accent-warm font-medium">
            Offline · {pendingSyncCount} pending sync
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        {links.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => onMobileClose?.()}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent/20 text-accent-bright font-bold border border-accent/30 shadow-sm'
                  : 'text-dim hover:bg-card-hover/60 hover:text-main'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-accent-bright" />
              <span>{label(key)}</span>
            </div>
            {key === 'alerts' && pendingAlerts > 0 && (
              <span className="rounded-full bg-critical/20 px-2 py-0.5 text-[10px] font-bold text-critical">
                {pendingAlerts}
              </span>
            )}
            {key === 'notifications' && unreadNotifications > 0 && (
              <span className="rounded-full bg-accent-warm/20 px-2 py-0.5 text-[10px] font-bold text-accent-warm">
                {unreadNotifications}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Role Footer */}
      <div className="border-t border-border/60 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-card-hover/40 p-2.5 border border-border/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent-bright font-bold text-xs shrink-0">
            {(user?.name ?? 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-main truncate">{user?.name ?? 'Guest User'}</p>
            <p className="text-[10px] text-dim capitalize truncate">{(user?.role ?? 'citizen')} mode</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar (Visible on md and larger) */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-full w-64 flex-col border-r border-border/60">
        {navContent}
      </aside>

      {/* Mobile Drawer (Visible on mobile when open) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="md:hidden fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] border-r border-border/60 shadow-2xl"
            >
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
