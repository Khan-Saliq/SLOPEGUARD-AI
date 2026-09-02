import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function AssignmentsPage() {
  const { token } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState<'active'|'all'|'completed'>('active');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assignments', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReports(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (token) fetchAssignments(); }, [token]);
  useEffect(() => { if (token) { fetchUsers(); fetchReports(); } }, [token]);

  const claim = async (id: string) => {
    await fetch(`/api/assignments/${id}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchAssignments();
  };

  const complete = async (id: string) => {
    const notes = prompt('Resolution notes (optional)') || '';
    await fetch(`/api/assignments/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ resolution: 'resolved', notes }) });
    fetchAssignments();
  };

  const createAssignment = async () => {
    if (!selectedReport) return alert('Select a report');
    await fetch('/api/assignments', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: selectedReport, assigneeId: selectedAssignee }) });
    setSelectedReport(null); setSelectedAssignee(null);
    fetchAssignments();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Assignments</h1>
        <p className="text-sm text-slate-400 mt-1">Tasks assigned to authorities and field officials</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Assignments</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded px-2 py-1 bg-card-hover text-white">
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="completed">Completed</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <select value={selectedReport ?? ''} onChange={(e) => setSelectedReport(e.target.value || null)} className="rounded px-2 py-1 bg-card-hover text-white">
                <option value="">Select report to assign</option>
                {reports.map(r => <option key={r.id} value={r.id}>{r.id} · {r.category}</option>)}
              </select>
              <select value={selectedAssignee ?? ''} onChange={(e) => setSelectedAssignee(e.target.value || null)} className="rounded px-2 py-1 bg-card-hover text-white">
                <option value="">Assign to (optional)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
              </select>
              <Button size="sm" onClick={createAssignment}>Create</Button>
            </div>
          </div>
          {loading && <p className="text-sm text-slate-400">Loading…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-slate-400">No assignments yet</p>}
          <div className="space-y-3">
            {items.filter(a => filter === 'all' ? true : filter === 'completed' ? a.status === 'completed' : a.status !== 'completed').map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card-hover/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-white">Report: {a.reportId}</p>
                  <p className="text-xs text-slate-400">Status: {a.status} {a.assigneeId ? `· Assigned to ${a.assigneeId}` : ''}</p>
                  <p className="text-xs text-slate-400">Created: {new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(!a.assigneeId || a.assigneeId === null) && (
                    <Button size="sm" onClick={() => claim(a.id)}>Claim</Button>
                  )}
                  {a.status !== 'completed' && a.assigneeId === (window.localStorage.getItem('userId') || null) && (
                    <Button size="sm" variant="outline" onClick={() => complete(a.id)}>Complete</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
