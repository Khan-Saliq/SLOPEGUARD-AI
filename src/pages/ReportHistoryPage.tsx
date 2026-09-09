import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Clock, CheckCircle2, XCircle, AlertCircle, Camera,
  MapPin, Sparkles, Plus, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatRelativeTime } from '../lib/utils';

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
  status: 'pending' | 'verified' | 'rejected';
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

export function ReportHistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const token = window.localStorage.getItem('token');

      const res = await fetch(`${apiBase}/api/reports`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`);

      const data = await res.json();
      setReports(data.reports || data || []);
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      setError(err.message || 'Could not load report history.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Verified by Authority</Badge>;
      case 'rejected':
        return <Badge variant="critical" className="gap-1"><XCircle className="h-3 w-3" /> Rejected / Invalid</Badge>;
      default:
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-main text-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-bright uppercase tracking-wider">
              <FileText className="h-4 w-4" /> Giri Raksha · Citizen Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-main mt-1">
              My Submitted Reports
            </h1>
            <p className="text-xs sm:text-sm text-dim mt-1">
              Track real-time admin review status and AI image verification results for your hazard submissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Link to="/report">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Report Hazard
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-12 text-center text-dim text-xs space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-accent-bright" />
            <p>Fetching report history...</p>
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-xs text-critical bg-critical/10 border-critical/30">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center text-dim space-y-4">
            <Camera className="h-12 w-12 mx-auto text-dim opacity-40" />
            <div>
              <h3 className="text-base font-bold text-main">No Reports Submitted Yet</h3>
              <p className="text-xs text-dim mt-1">Help keep your community safe by reporting landslides or damaged roads.</p>
            </div>
            <Link to="/report">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Submit First Report
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-5 space-y-4 hover:border-accent/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent-bright bg-accent/10 px-2 py-0.5 rounded">
                        {report.id}
                      </span>
                      <span className="text-xs font-bold text-main capitalize">
                        {report.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(report.status)}
                      <span className="text-[10px] text-dim font-mono">
                        {formatRelativeTime(report.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Photo preview */}
                    {report.photoUrl && (
                      <div className="md:col-span-4 h-36 rounded-xl overflow-hidden border border-border bg-black/40">
                        <img src={report.photoUrl} alt="Report evidence" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className={report.photoUrl ? 'md:col-span-8 space-y-3' : 'md:col-span-12 space-y-3'}>
                      <div className="flex items-center gap-1.5 text-xs text-dim">
                        <MapPin className="h-3.5 w-3.5 text-accent-bright shrink-0" />
                        <span>{report.location?.area || 'Location'}, {report.location?.district || ''} ({report.location?.lat}, {report.location?.lng})</span>
                      </div>

                      <p className="text-xs text-main bg-card-hover/40 p-3 rounded-xl border border-border/40">
                        "{report.description}"
                      </p>

                      {/* AI Verification Badge */}
                      {report.aiVerification && (
                        <div className="flex items-center gap-3 text-[11px] bg-accent/10 p-2.5 rounded-lg border border-accent/20">
                          <Sparkles className="h-4 w-4 text-accent-bright shrink-0" />
                          <div>
                            <span className="font-bold text-main">AI Verification: </span>
                            <span className="text-accent-bright font-semibold">
                              {Math.round(report.aiVerification.confidence * 100)}% Confidence
                            </span>
                            <span className="text-dim"> — {report.aiVerification.recommendation}</span>
                          </div>
                        </div>
                      )}

                      {report.adminNotes && (
                        <p className="text-xs text-accent-warm bg-accent-warm/10 p-2.5 rounded-lg border border-accent-warm/30">
                          💬 <strong>Admin Feedback:</strong> {report.adminNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
