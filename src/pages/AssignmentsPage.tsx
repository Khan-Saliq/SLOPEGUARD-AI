import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../hooks/useApp';
import { getApiUrl, getImageUrl, formatRelativeTime } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Users,
  UserCheck,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Clock,
  Filter,
  Search,
  Building2,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Eye,
  X,
  ShieldCheck,
} from 'lucide-react';

const DEPARTMENT_OPTIONS = [
  { id: 'ndrf', name: 'NDRF & Emergency Response Force', code: 'NDRF-HQ' },
  { id: 'pwd', name: 'Public Works Department (PWD Road Safety)', code: 'PWD-STATE' },
  { id: 'deoc', name: 'District Emergency Operations Center (DEOC)', code: 'DEOC-DISPATCH' },
  { id: 'gsi', name: 'Geological Survey & Slope Monitoring Team', code: 'GSI-GEOL' },
  { id: 'forest', name: 'Forest & Environmental Protection Cell', code: 'ENV-CELL' },
];

export default function AssignmentsPage() {
  const { token } = useApp();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');

  // Selected report for assignment modal
  const [assigningReport, setAssigningReport] = useState<any | null>(null);
  const [selectedDept, setSelectedDept] = useState(DEPARTMENT_OPTIONS[0].name);
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Selected report for deletion confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Lightbox photo preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Error & success notifications
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(getApiUrl('/api/reports'), { headers });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch reports for assignment:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle assigning report to a departmental admin
  const handleConfirmAssignment = async () => {
    if (!assigningReport) return;
    setAssigning(true);
    setMsg(null);

    try {
      const res = await fetch(getApiUrl(`/api/reports/${assigningReport.id}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: assigningReport.status === 'rejected' ? 'rejected' : 'verified',
          assignedDepartment: selectedDept,
          adminNotes: assignNotes || `Assigned to ${selectedDept}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to update assignment');

      setMsg({ type: 'success', text: `Report #${assigningReport.id} successfully assigned to ${selectedDept}!` });
      setAssigningReport(null);
      setAssignNotes('');
      fetchReports();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to assign report' });
    } finally {
      setAssigning(false);
    }
  };

  // Handle deleting a citizen report
  const handleDeleteReport = async (id: string) => {
    setDeleting(true);
    setMsg(null);

    try {
      const res = await fetch(getApiUrl(`/api/reports/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete report');

      setMsg({ type: 'success', text: `Report #${id} has been permanently deleted.` });
      setDeletingId(null);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Delete operation failed' });
    } finally {
      setDeleting(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch =
      (r.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.location?.area || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.id || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = reports.length;
  const verifiedCount = reports.filter(r => r.status === 'verified').length;
  const pendingCount = reports.filter(r => r.status === 'pending' || r.status === 'submitted').length;
  const rejectedCount = reports.filter(r => r.status === 'rejected').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-cyan-400" />
            Departmental Report Assignments & Dispatch Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review Hugging Face AI screened hazard reports, assign incidents to specialized departmental taskforces, or delete invalid citizen submissions.
          </p>
        </div>

        <Button
          onClick={fetchReports}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Reports
        </Button>
      </div>

      {/* Command Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Incident Reports</span>
            <span className="text-xl font-extrabold text-white">{totalCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Pending Admin Review</span>
            <span className="text-xl font-extrabold text-amber-300">{pendingCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Verified & Dispatched</span>
            <span className="text-xl font-extrabold text-emerald-400">{verifiedCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Rejected / Non-Hazard</span>
            <span className="text-xl font-extrabold text-red-400">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/70 border border-red-500/40 text-red-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reports by area, category, description, reporter, or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <Filter className="w-4 h-4 text-cyan-400 ml-2 shrink-0" />
          <div className="flex w-full gap-1">
            {(['all', 'pending', 'verified', 'rejected'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="border-b border-slate-800/80 pb-3">
          <CardTitle className="text-sm font-bold flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Active Incident Queue ({filteredReports.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center p-12 text-xs text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" /> Loading reports queue...
            </div>
          )}

          {!loading && filteredReports.length === 0 && (
            <div className="p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
              <ShieldAlert className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-200">No Reports Found</p>
              <p className="text-xs text-slate-500">There are no citizen reports matching the current filter criteria.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredReports.map((report, idx) => {
                const photo = getImageUrl(report.photoBase64 || report.evidenceUrl || report.mediaUrl || report.imageUrl || report.photoUrl);
                const aiDecision = report.aiVerification?.decision || (report.status === 'verified' ? 'accepted' : report.status === 'rejected' ? 'rejected' : 'unclear_manual_inspection');
                const assignedDept = report.assignedDepartment || 'Unassigned Taskforce';

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Top Row: AI Status & Category */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold uppercase">
                            {report.category.replace('_', ' ')}
                          </span>

                          {/* AI Classification Badge */}
                          {aiDecision === 'accepted' && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ACCEPTED BY HF AI
                            </span>
                          )}
                          {aiDecision === 'rejected' && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-400" /> REJECTED BY HF AI
                            </span>
                          )}
                          {aiDecision === 'unclear_manual_inspection' && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-400" /> MANUAL INSPECTION REQUIRED
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">#{report.id}</span>
                      </div>

                      {/* Image & Description */}
                      <div className="flex gap-4 items-start">
                        {photo ? (
                          <div className="relative group shrink-0">
                            <img
                              src={photo}
                              alt="Incident Photo"
                              className="w-24 h-24 rounded-xl object-cover border border-slate-800 bg-slate-950 shadow-md transition-transform group-hover:scale-105"
                            />
                            <button
                              onClick={() => setPreviewPhoto(photo)}
                              className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white gap-1 transition-opacity rounded-xl"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" /> Zoom
                            </button>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center text-[10px] text-slate-600 text-center p-2 shrink-0">
                            No Photo
                          </div>
                        )}

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <p className="text-xs font-bold text-white line-clamp-2 leading-snug">
                            {report.description}
                          </p>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">
                              {report.location?.area || 'Sector'}, {report.location?.district || 'District'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Submitted {formatRelativeTime(report.createdAt || report.timestamp)}</span>
                            <span>•</span>
                            <span>By {report.userName || 'Citizen'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Department Badge */}
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300">
                          <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Assigned Department</span>
                            <span className="font-semibold text-white">{assignedDept}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-bold">
                          {report.status}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingId(report.id)}
                        className="text-xs font-semibold text-red-400 border-red-500/30 hover:bg-red-500/20 hover:text-red-300 gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Report
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setAssigningReport(report);
                          setSelectedDept(report.assignedDepartment || DEPARTMENT_OPTIONS[0].name);
                        }}
                        className="text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-1.5 shadow-md shadow-cyan-500/20"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assign to Department
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      {assigningReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                Assign Incident to Departmental Admin
              </h3>
              <button onClick={() => setAssigningReport(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Assign Report <span className="font-mono font-bold text-white">#{assigningReport.id}</span> ({assigningReport.location?.area || 'Sector'}) to an official emergency response department.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Select Department / Admin Taskforce</label>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-cyan-500"
                >
                  {DEPARTMENT_OPTIONS.map(dept => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Dispatch Instructions / Admin Notes</label>
                <textarea
                  rows={3}
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  placeholder="Add specific instructions for field officers or response personnel..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-cyan-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setAssigningReport(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmAssignment} disabled={assigning} className="bg-cyan-500 text-slate-950 font-bold">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-red-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Citizen Report?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete report <span className="font-mono text-white font-bold">#{deletingId}</span>? This action will erase the uploaded evidence photo and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleDeleteReport(deletingId)}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-2">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/80 text-white hover:bg-red-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewPhoto} alt="Full Size Evidence" className="w-full h-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
