import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function NotificationsPage(){
  const { token } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try{
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data || []);
    }catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{ if(token) fetchNotifications(); }, [token]);

  useEffect(() => {
    const tokenVal = window.localStorage.getItem('token');
    if (!tokenVal) return;
    const host = window.location.hostname;
    const streamUrl = (host === 'localhost' || host === '127.0.0.1')
      ? `http://localhost:4000/api/stream?token=${encodeURIComponent(tokenVal)}`
      : `/api/stream?token=${encodeURIComponent(tokenVal)}`;
    const es = new EventSource(streamUrl);
    const onNotification = (ev: MessageEvent) => {
      try {
        const d = JSON.parse((ev as any).data);
        setItems(prev => [d, ...prev]);
      } catch (e) { }
    };
    es.addEventListener('notification', onNotification as any);
    es.addEventListener('ping', () => {});
    return () => { es.close(); };
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchNotifications();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-sm text-slate-400 mt-1">Recent notifications and alerts assigned to you</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Inbox</CardTitle></CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-slate-400">Loading…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-slate-400">No notifications</p>}
          <div className="space-y-3">
            {items.map(n => (
              <div key={n.id} className={`flex items-center justify-between rounded-lg border border-border/40 bg-card-hover/50 px-3 py-2 ${n.read ? 'opacity-60' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-white">{n.message}</p>
                  <p className="text-xs text-slate-400">{n.type} · {new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!n.read && <Button size="sm" onClick={() => markRead(n.id)}>Mark read</Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
