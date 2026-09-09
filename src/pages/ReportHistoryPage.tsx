import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, CheckCircle2, XCircle, Camera,
  MapPin, Sparkles, Plus, RefreshCw, Eye, ShieldAlert, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { getApiUrl, getImageUrl, formatRelativeTime } from '../lib/utils';

interface Report {
  id: string;
  title?: string;
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
  evidenceUrl?: string;
  imageUrl?: string;
  mediaUrl?: string;
  photoBase64?: string;
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
  createdAt: string;
  timestamp?: string;
  adminNotes?: string;
  assignedDepartment?: string;
  aiVerification?: {
    is_relevant?: boolean;
    decision?: string;
    confidence?: number;
    summaryMessage?: string;
    reasons?: string[];
  };
}

export function ReportHistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = window.localStorage.getItem('token');
      const res = await fetch(getApiUrl('/api/reports'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`);

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.reports || [];
      setReports(rawList);
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      setError(err.message || 'Could not load report history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <FileText className="h-4 w-4" /> Giri Raksha · Citizen Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
              My Submitted Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track real-time admin review status, Hugging Face AI image verification, and departmental dispatch updates.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              disabled={loading}
              className="gap-1.5 border-slate-800 text-slate-300 hover:bg-slate-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Link to="/report">
              <Button size="sm" className="gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
                <Plus className="h-4 w-4" /> New Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="rounded-2xl bg-red-950/80 border border-red-800 p-4 text-xs text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchReports} className="text-xs">Retry</Button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && reports.length === 0 && (
          <div className="p-16 text-center text-xs text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
            <p className="font-semibold text-slate-300">Retrieving your hazard report history...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <Card className="p-12 text-center border-slate-800 bg-slate-900/50 space-y-4">
            <Camera className="w-12 h-12 mx-auto text-slate-600" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Hazard Reports Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You haven't submitted any hazard reports yet. If you observe a landslide, rockfall, or damaged road section, report it immediately to inform authorities.
              </p>
            </div>
            <Link to="/report">
              <Button className="gap-2 bg-cyan-500 text-slate-950 font-bold">
                <Plus className="h-4 w-4" /> Submit Your First Hazard Report
              </Button>
            </Link>
          </Card>
        )}

        {/* Reports Timeline List */}
        <div className="space-y-4">
          <AnimatePresence>
            {reports.map((report, idx) => {
              const photo = getImageUrl(report.photoBase64 || report.photoUrl || report.evidenceUrl || report.imageUrl || report.mediaUrl);
              const aiDecision = report.aiVerification?.decision || (report.status === 'verified' ? 'accepted' : report.status === 'rejected' ? 'rejected' : 'unclear_manual_inspection');
              const assignedDept = report.assignedDepartment || 'Disaster Response Taskforce';

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                >
                  <Card className="p-5 sm:p-6 border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-md hover:border-slate-700 transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Category & Title */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                            {report.category.replace('_', ' ')}
                          </span>

                          {/* Status Badges */}
                          {report.status === 'verified' && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VERIFIED BY AUTHORITY
                            </span>
                          )}
                          {report.status === 'rejected' && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-400" /> REJECTED / INVALID
                            </span>
                          )}
                          {(report.status === 'pending' || report.status === 'submitted') && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" /> PENDING ADMIN REVIEW
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                          {report.title || `Citizen Report: ${report.category.replace('_', ' ').toUpperCase()}`}
                        </h3>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {report.description}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{report.location?.area || 'Sector'}, {report.location?.district || 'District'} ({report.location?.lat}, {report.location?.lng})</span>
                        </div>
                      </div>

                      {/* Right: Uploaded Evidence Photo */}
                      {photo ? (
                        <div className="relative group shrink-0">
                          <img
                            src={photo}
                            alt="Uploaded Evidence"
                            className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border border-slate-800 bg-slate-950 shadow-md transition-transform group-hover:scale-105"
                          />
                          <button
                            onClick={() => setPreviewPhoto(photo)}
                            className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white gap-1.5 transition-opacity rounded-xl"
                          >
                            <Eye className="w-4 h-4 text-cyan-400" /> Preview
                          </button>
                        </div>
                      ) : (
                        <div className="w-28 h-28 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center p-2 text-center text-slate-600 text-[10px] shrink-0">
                          <ShieldAlert className="w-6 h-6 mb-1 opacity-40" /> No Photo
                        </div>
                      )}
                    </div>

                    {/* Hugging Face AI Verification Card */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-cyan-400" /> Hugging Face AI Inspection
                        </span>

                        {aiDecision === 'accepted' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                            Disaster Accepted
                          </span>
                        )}
                        {aiDecision === 'rejected' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold uppercase">
                            Non-Hazard Image
                          </span>
                        )}
                        {aiDecision === 'unclear_manual_inspection' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                            Sent to Admin Queue
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {report.aiVerification?.summaryMessage || 'AI model verified hazard relevancy and queued report for command dispatch.'}
                      </p>

                      {report.adminNotes && (
                        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-cyan-300">
                          <span className="font-bold text-slate-400 block">Authority Admin Response:</span>
                          <p>{report.adminNotes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Submitted {formatRelativeTime(report.createdAt || report.timestamp || new Date().toISOString())}</span>
                        <span>Assigned: <strong className="text-slate-300">{assignedDept}</strong></span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox Photo Preview Modal */}
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
