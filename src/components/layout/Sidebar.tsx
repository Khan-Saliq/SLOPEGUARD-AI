import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Map, Bell, BarChart3, Route, Siren,
  Camera, History, Settings, Mountain, WifiOff, FileWarning,
} from 'lucide-react';
import { cn } from '../../lib/utils';
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

export function Sidebar() {
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
      report: 'Citizen',
      reportHazard: 'Report Hazard',
      history: 'My Reports',
      settings: 'Settings',
    };
    return map[key] ?? key;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border/60 bg-elevated/95 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent overflow-hidden">
          <img src="/logo.png" alt="SLOPEGUARD AI" className="h-10 w-10 object-contain drop-shadow-sm" />
        </div>
        <div>
          <h1 className="font-display text-sm font-bold text-main leading-tight">SLOPEGUARD AI</h1>
          <p className="text-[10px] text-dim">Risk Monitor · Live</p>
        </div>
      </div>

      {isOffline && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-accent-warm/10 border border-accent-warm/30 px-3 py-2">
          <WifiOff className="h-4 w-4 text-accent-warm" />
          <span className="text-xs text-accent-warm font-medium">
            Offline · {pendingSyncCount} pending sync
          </span>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-accent/15 text-accent-bright shadow-sm'
                  : 'text-dim hover:bg-card-hover hover:text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 h-8 w-1 rounded-r-full bg-accent"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4" />
                {label(key)}
                {to === '/alerts' && pendingAlerts > 0 && (
                  <span className="ml-auto rounded-full bg-critical/20 px-1.5 py-0.5 text-[10px] font-bold text-critical">
                    {pendingAlerts}
                  </span>
                )}
                {to === '/notifications' && unreadNotifications > 0 && (
                  <span className="ml-auto rounded-full bg-accent-warm/70 px-2 py-0.5 text-[10px] font-bold text-white">{unreadNotifications}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/60 p-3">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-dim hover:bg-card-hover hover:text-muted transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
          {unreadNotifications > 0 && (
            <span className="ml-auto rounded-full bg-accent-warm/70 px-2 py-0.5 text-[10px] font-bold text-white">{unreadNotifications}</span>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
