import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, CheckCircle2, XCircle, Sparkles, MapPin,
  RefreshCw, Eye, ShieldCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatRelativeTime } from '../../lib/utils';

interface Report {
  id: string;
  category: string;
  location: {
    area: string;
    district: string;
    state: string;
    lat: number;
    lng: number;
  };
  description: string;
  photoUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  userName?: string;
  userEmail?: string;
  createdAt: string;
  adminNotes?: string;
  aiVerification?: {
    is_relevant: boolean;
    confidence: number;
    verification_category: string;
    apparent_severity: string;
    recommendation: string;
  };
}

export function CitizenReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [adminNoteInput, setAdminNoteInput] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const token = window.localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/reports`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data.reports || data || []);
    } catch (err) {
      console.error('Error fetching citizen reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: 'verified' | 'rejected' | 'pending') => {
    setUpdatingId(reportId);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const token = window.localStorage.getItem('token');
      const notes = adminNoteInput[reportId] || '';

      const res = await fetch(`${apiBase}/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: notes,
          assignedDepartment: 'Disaster Response Command Center'
        })
      });

      if (!res.ok) throw new Error('Status update failed');

      const data = await res.json();
      const updated = data.report || data;

      // Update local state
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updated, status: newStatus } : r));
    } catch (err) {
      console.error('Failed to update report status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReports = reports.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const verifiedCount = reports.filter(r => r.status === 'verified').length;
  const rejectedCount = reports.filter(r => r.status === 'rejected').length;

  return (
    <Card className="border-accent/40 bg-card/90 shadow-xl overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-main flex items-center gap-2">
              <Camera className="h-5 w-5 text-accent-bright" /> Citizen Hazard Reports & AI Verification Queue
            </CardTitle>
            <p className="text-xs text-dim mt-1">
              Field evidence submitted by citizens with automated computer vision image verification results.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterStatus === 'all' ? 'bg-accent text-slate-950 font-bold' : 'bg-card-hover text-dim hover:text-main'}`}
          >
            All Reports ({reports.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterStatus === 'pending' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('verified')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterStatus === 'verified' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterStatus === 'rejected' ? 'bg-rose-500 text-white font-bold' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-dim text-xs space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-accent-bright" />
            <p>Loading citizen report queue...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-dim text-xs">
            <ShieldCheck className="h-10 w-10 mx-auto text-dim opacity-40 mb-2" />
            <p>No citizen reports matching filter: <strong>{filterStatus.toUpperCase()}</strong></p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-border/80 bg-card p-4 space-y-4 hover:border-accent/40 transition-colors"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-accent-bright bg-accent/10 px-2 py-0.5 rounded">
                      {report.id}
                    </span>
                    <span className="text-xs font-bold text-main capitalize">
                      {report.category.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-dim font-medium">
                      by {report.userName || 'Citizen User'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={report.status === 'verified' ? 'success' : report.status === 'rejected' ? 'critical' : 'warning'}>
                      {report.status.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-dim font-mono">
                      {formatRelativeTime(report.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Content Body: Image + Details + AI Verification */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Photo Thumbnail */}
                  {report.photoUrl && (
                    <div className="md:col-span-4 relative group h-40 rounded-xl overflow-hidden border border-border bg-black/40">
                      <img src={report.photoUrl} alt="Hazard photo" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setSelectedPhoto(report.photoUrl!)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5"
                      >
                        <Eye className="h-4 w-4" /> View Full Image
                      </button>
                    </div>
                  )}

                  <div className={report.photoUrl ? 'md:col-span-8 space-y-3' : 'md:col-span-12 space-y-3'}>
                    <div className="flex items-center gap-1.5 text-xs text-dim">
                      <MapPin className="h-3.5 w-3.5 text-accent-bright shrink-0" />
                      <span><strong>Location:</strong> {report.location?.area || 'Sector'}, {report.location?.district || ''} ({report.location?.lat}, {report.location?.lng})</span>
                    </div>

                    <p className="text-xs text-main bg-card-hover/40 p-3 rounded-xl border border-border/40">
                      "{report.description}"
                    </p>

                    {/* AI Verification Results Box */}
                    {report.aiVerification && (
                      <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-main flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-accent-bright" /> AI Image Verification Score
                          </span>
                          <span className="font-mono font-bold text-accent-bright bg-accent/20 px-2 py-0.5 rounded text-[11px]">
                            {Math.round(report.aiVerification.confidence * 100)}% Confidence
                          </span>
                        </div>

                        <p className="text-[11px] text-dim">
                          {report.aiVerification.recommendation}
                        </p>
                      </div>
                    )}

                    {/* Admin Action Bar */}
                    <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Optional admin review notes..."
                        value={adminNoteInput[report.id] || ''}
                        onChange={(e) => setAdminNoteInput({ ...adminNoteInput, [report.id]: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                      />

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === report.id || report.status === 'verified'}
                          onClick={() => handleUpdateStatus(report.id, 'verified')}
                          className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/40 text-xs font-bold gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === report.id || report.status === 'rejected'}
                          onClick={() => handleUpdateStatus(report.id, 'rejected')}
                          className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-rose-500/40 text-xs font-bold gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Full Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-border shadow-2xl">
              <img src={selectedPhoto} alt="Full hazard evidence" className="max-w-full max-h-[85vh] object-contain" />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 rounded-full bg-black/70 text-white p-2 text-xs font-bold hover:bg-red-600"
              >
                ✕ Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
