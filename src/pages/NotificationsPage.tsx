import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatRelativeTime } from '../lib/utils';
import {
  Bell,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  Clock,
  Layers,
  Sparkles,
  Check,
  Inbox,
  Loader2,
} from 'lucide-react';

export default function NotificationsPage() {
  const { token, user } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  useEffect(() => {
    const tokenVal = window.localStorage.getItem('token');
    if (!tokenVal) return;
    const host = window.location.hostname;
    const streamUrl =
      host === 'localhost' || host === '127.0.0.1'
        ? `http://localhost:4000/api/stream?token=${encodeURIComponent(tokenVal)}`
        : `/api/stream?token=${encodeURIComponent(tokenVal)}`;
    const es = new EventSource(streamUrl);

    const onNotification = (ev: MessageEvent) => {
      try {
        const d = JSON.parse((ev as any).data);
        setItems(prev => [d, ...prev.filter(item => item.id !== d.id)]);
      } catch (e) {}
    };

    es.addEventListener('notification', onNotification as any);
    es.addEventListener('ping', () => {});
    return () => {
      es.close();
    };
  }, []);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
  };

  const markAllRead = async () => {
    const unreadItems = items.filter(n => !n.read);
    await Promise.all(
      unreadItems.map(n =>
        fetch(`/api/notifications/${n.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      )
    );
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredItems = items.filter(n => (filter === 'unread' ? !n.read : true));
  const unreadCount = items.filter(n => !n.read).length;

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'report_submitted':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          badgeText: 'NEW REPORT SUBMITTED',
        };
      case 'assignment_created_for_report':
        return {
          icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          badgeText: 'REPORT ASSIGNED TO ADMIN',
        };
      case 'assignment_claimed_for_report':
        return {
          icon: <UserCheck className="w-5 h-5 text-blue-400" />,
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          badgeText: 'OFFICER CLAIMED REPORT',
        };
      case 'assignment_completed_for_report':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          badgeText: 'REPORT RESOLVED',
        };
      case 'assignment':
        return {
          icon: <Layers className="w-5 h-5 text-indigo-400" />,
          badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          badgeText: 'TASK ASSIGNED TO YOU',
        };
      case 'report_review':
        return {
          icon: <Sparkles className="w-5 h-5 text-purple-400" />,
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          badgeText: 'REPORT REVIEWED',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-accent-bright" />,
          badgeClass: 'bg-accent/20 text-accent-bright border-accent/30',
          badgeText: 'SYSTEM NOTICE',
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-accent-bright" />
            Live System Notifications & Dispatch Inbox
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {user?.role !== 'citizen'
              ? 'Real-time alert notifications for citizen report submissions, task dispatches, and emergency updates.'
              : 'Real-time notifications for your submitted hazard reports and operational admin assignments.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllRead}
              className="text-xs font-semibold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Mark All Read ({unreadCount})
            </Button>
          )}

          <div className="flex bg-muted/60 p-1 rounded-lg border border-border text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === 'unread'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Inbox Card */}
      <Card className="border-border/60 bg-card shadow-xl">
        <CardHeader className="border-b border-border/40 pb-3">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2 text-foreground">
              <Inbox className="w-4 h-4 text-accent-bright" />
              Inbox ({filteredItems.length})
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                {unreadCount} UNREAD
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent-bright" /> Loading notifications...
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="p-8 text-center text-muted-foreground space-y-2 border border-dashed border-border/60 rounded-xl bg-card-hover/20">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-xs font-bold text-foreground">No Notifications Found</p>
              <p className="text-[11px] text-muted-foreground">
                {filter === 'unread' ? 'You have no unread notifications.' : 'Your inbox is clear.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {filteredItems.map(n => {
              const cfg = getNotificationConfig(n.type);
              const isUnread = !n.read;

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isUnread
                      ? 'border-accent-bright/50 bg-accent/5 shadow-md'
                      : 'border-border/50 bg-card-hover/40 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-card border border-border/60 shrink-0 mt-0.5">
                        {cfg.icon}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border uppercase ${cfg.badgeClass}`}
                          >
                            {cfg.badgeText}
                          </span>

                          {n.meta?.reportId && (
                            <span className="text-[10px] font-mono text-muted-foreground font-bold">
                              REPORT #{n.meta.reportId}
                            </span>
                          )}

                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-accent-bright animate-pulse" />
                          )}
                        </div>

                        <p className="text-xs font-bold text-foreground leading-snug">
                          {n.title || n.message}
                        </p>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{formatRelativeTime(n.createdAt)}</span>
                          <span>•</span>
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {isUnread && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markRead(n.id)}
                        className="text-[10px] h-7 px-2.5 font-semibold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shrink-0"
                      >
                        <Check className="w-3 h-3 mr-1" /> Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
