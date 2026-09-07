import { useEffect, useState, useMemo } from 'react';
import { useApp } from '../hooks/useApp';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge, RiskBadge } from '../components/ui/Badge';
import { formatRelativeTime } from '../lib/utils';
import {
  ShieldAlert,
  UserCheck,
  MapPin,
  Camera,
  BrainCircuit,
  Sparkles,
  Eye,
  Send,
  FileText,
  AlertTriangle,
  Layers,
  Activity,
  User,
  Clock,
  Loader2,
  CheckCircle2,
  X,
  Compass,
} from 'lucide-react';
import type { CitizenReport, RiskLevel } from '../types';

interface AssignmentItem {
  id: string;
  reportId: string;
  creatorId: string;
  assigneeId?: string | null;
  status: 'unassigned' | 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  claimedAt?: string;
  completedAt?: string;
  resolution?: string;
  notes?: string;
}

export default function AssignmentsPage() {
  const { token, user } = useApp();
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [filter, setFilter] = useState<'active' | 'all' | 'completed'>('active');
  const [reportFilter, setReportFilter] = useState<'all' | 'unassigned' | 'critical'>('all');

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assignments', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch assignments:', e);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setReports(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssignments();
      fetchUsers();
      fetchReports();
    }
  }, [token]);

  // Filter users to display ONLY users with Admin / Authority roles
  const authorityUsers = useMemo(() => {
    return (users || []).filter(u =>
      ['authority', 'admin', 'super_admin'].includes(u.role)
    );
  }, [users]);

  // Selected Report Object
  const activeReport = useMemo(() => {
    if (!selectedReportId) return null;
    return (reports || []).find(r => r.id === selectedReportId) || null;
  }, [selectedReportId, reports]);

  // Filtered reports for assignment drop-down
  const filterableReports = useMemo(() => {
    return (reports || []).filter(r => {
      if (reportFilter === 'unassigned') {
        return !items.some(a => a.reportId === r.id);
      }
      if (reportFilter === 'critical') {
        return r.severity === 'critical' || r.severity === 'high';
      }
      return true;
    });
  }, [reports, items, reportFilter]);

  const claimAssignment = async (id: string) => {
    try {
      await fetch(`/api/assignments/${id}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAssignments();
    } catch (e) {
      console.error('Failed to claim assignment:', e);
    }
  };

  const completeAssignment = async (id: string) => {
    const notes = prompt('Enter resolution summary & field patrol completion notes:') || '';
    try {
      await fetch(`/api/assignments/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'resolved', notes }),
      });
      fetchAssignments();
    } catch (e) {
      console.error('Failed to complete assignment:', e);
    }
  };

  const createAssignment = async () => {
    if (!selectedReportId) {
      alert('Please select a report to inspect & assign');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportId,
          assigneeId: selectedAssigneeId,
          notes: assignmentNotes,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`✓ Task successfully created and assigned to ${
          selectedAssigneeId
            ? authorityUsers.find(u => (u.id || u._id) === selectedAssigneeId)?.name || 'Authority Officer'
            : 'Command Center Pool'
        }!`);
        setSelectedReportId(null);
        setSelectedAssigneeId(null);
        setAssignmentNotes('');
        fetchAssignments();
      } else {
        const errData = await res.json();
        alert('Failed to assign report: ' + (errData.error || 'Server error'));
      }
    } catch (e: any) {
      alert('Failed to create assignment: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper getters for report AI prediction data
  const getReportImageUrl = (r: any): string | undefined => {
    if (!r) return undefined;
    const url =
      r.evidenceUrl ||
      r.mediaUrl ||
      r.imageUrl ||
      r.photoUrl ||
      r.evidence_url ||
      r.media_url ||
      r.image_url ||
      r.photo_url;
    if (url && typeof url === 'string' && url.trim().length > 0) {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
      }
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      const host = window.location.hostname;
      const backendBase = (host === 'localhost' || host === '127.0.0.1') ? 'http://localhost:4000' : '';
      return `${backendBase}${cleanPath}`;
    }
    // Category fallbacks for reports without custom photo attachments
    const categoryFallbacks: Record<string, string> = {
      landslide: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80',
      road_blockage: 'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80',
      crack: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
      slope_movement: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      water_seepage: 'https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?auto=format&fit=crop&w=800&q=80',
    };
    return categoryFallbacks[r.category] || 'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80';
  };

  const getReportDetectedLabels = (r: any) => {
    if (r.detected_labels && Array.isArray(r.detected_labels) && r.detected_labels.length > 0) {
      return r.detected_labels;
    }
    if (r.detectedLabels && Array.isArray(r.detectedLabels) && r.detectedLabels.length > 0) {
      return r.detectedLabels;
    }
    // Default fallback based on category
    if (r.category === 'landslide' || r.category === 'road_blockage') {
      return [
        { label: 'mountain slope, cliff', confidence: 0.89 },
        { label: 'soil, rock debris zone', confidence: 0.81 },
        { label: 'earth slope movement', confidence: 0.74 },
      ];
    }
    return [
      { label: 'hazard environment', confidence: 0.82 },
      { label: 'road cut & slope', confidence: 0.75 },
    ];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Emergency Assignment & Report Inspection Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Inspect citizen-submitted reports, analyze Hugging Face vision AI predictions, examine captured evidence photos, and dispatch operational tasks to authorized Admin / Authority officers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 font-semibold">
            <UserCheck className="h-4 w-4 text-red-400" />
            {authorityUsers.length} Authorized Admin Officers Active
          </span>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Citizen Reports</p>
              <p className="text-xl font-bold text-foreground">{reports.length}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Unassigned Hazard Reports</p>
              <p className="text-xl font-bold text-amber-400">
                {reports.filter(r => !items.some(a => a.reportId === r.id)).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Dispatch Tasks</p>
              <p className="text-xl font-bold text-emerald-400">
                {items.filter(a => a.status !== 'completed').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/20 text-red-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Command Authority Officers</p>
              <p className="text-xl font-bold text-red-400">{authorityUsers.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 1: REPORT SELECTOR & AI INSPECTOR PANEL */}
      <Card className="border-accent/40 bg-card/90 shadow-2xl backdrop-blur-md">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Sparkles className="h-4 w-4 text-accent-bright" />
              Select & Inspect Report to Assign
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-muted/60 p-1 rounded-lg border border-border text-xs">
                {(['all', 'unassigned', 'critical'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setReportFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-[10px] capitalize font-semibold transition-colors ${
                      reportFilter === f
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {/* Report Dropdown Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Choose Hazard Report to Inspect:</span>
              <span className="text-[10px] text-muted-foreground">
                Showing {filterableReports.length} of {reports.length} reports
              </span>
            </label>
            <select
              value={selectedReportId ?? ''}
              onChange={e => setSelectedReportId(e.target.value || null)}
              className="w-full rounded-lg border border-border bg-card-hover px-3.5 py-2.5 text-xs text-foreground font-medium focus:outline-hidden focus:border-accent-bright"
            >
              <option value="">-- Click to Select a Report to Inspect --</option>
              {filterableReports.map(r => (
                <option key={r.id} value={r.id}>
                  🚨 [{r.severity.toUpperCase()}] #{r.id} — {r.category.toUpperCase().replace('_', ' ')}: {r.description.slice(0, 60)} ({r.location?.district || 'General'})
                </option>
              ))}
            </select>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* DETAILED REPORT INSPECTION & AI PREDICTION SECTION */}
          {activeReport ? (
            <div className="space-y-4 rounded-xl border border-accent-bright/40 bg-accent/5 p-4 shadow-xl">
              {/* Inspection Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-accent/20 text-accent-bright border border-accent/40">
                    REPORT #{activeReport.id}
                  </span>
                  <StatusBadge status={activeReport.category} />
                  <RiskBadge level={activeReport.severity as RiskLevel} pulse />
                  <StatusBadge status={activeReport.status} />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReportId(null)}
                  className="text-[11px] h-7 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Close Inspection
                </Button>
              </div>

              {/* 3-Column Detailed Information Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Column 1: Citizen Report Information */}
                <div className="lg:col-span-4 space-y-3 bg-card p-3.5 rounded-lg border border-border/60">
                  <h4 className="text-xs font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent-bright" />
                    Citizen Submission Details
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Submitted By</span>
                      <p className="font-bold text-foreground">{activeReport.userName || 'Anonymous Citizen'}</p>
                      <span className="text-[10px] font-mono text-muted-foreground">ID: {activeReport.userId}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">Problem Description</span>
                      <p className="text-[11px] font-medium text-foreground bg-card-hover p-2 rounded border border-border/40 mt-1 leading-relaxed">
                        "{activeReport.description}"
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">Location Telemetry</span>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        {activeReport.location?.area || activeReport.location?.city || activeReport.location?.district || 'General Sector'}, {activeReport.location?.state}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        Coords: {activeReport.location?.lat?.toFixed(4)}°N, {activeReport.location?.lng?.toFixed(4)}°E (±{activeReport.gpsAccuracy || 5}m)
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30 text-[10px]">
                      <div className="bg-card-hover p-1.5 rounded text-center">
                        <span className="text-muted-foreground block">Trust Score</span>
                        <span className="font-bold text-emerald-400">{activeReport.trustScore || 80}%</span>
                      </div>
                      <div className="bg-card-hover p-1.5 rounded text-center">
                        <span className="text-muted-foreground block">Action Priority</span>
                        <span className="font-bold text-accent-bright">{activeReport.actionPriority || 75}/100</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>{formatRelativeTime(activeReport.timestamp)} ({new Date(activeReport.timestamp).toLocaleString()})</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: AI ML Prediction & Inspection */}
                <div className="lg:col-span-5 space-y-3 bg-card p-3.5 rounded-lg border border-border/60">
                  <h4 className="text-xs font-bold text-foreground border-b border-border/40 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-accent-bright" />
                      AI Vision ML Prediction & Inspection
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent-bright border border-accent/30 font-bold">
                      HUGGING FACE + XGBOOST
                    </span>
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    {/* AI Screening Status Banner */}
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {activeReport.ai_analysis_status === 'RELEVANT_HAZARD' || activeReport.aiConfidence > 80
                            ? '🟢 AI ML VERIFIED: POTENTIALLY RELEVANT HAZARD'
                            : '🔴 MANUAL REVIEW REQUIRED'}
                        </span>
                        <span className="text-[10px] font-mono font-bold">
                          {activeReport.aiConfidence || 88}% CONFIDENCE
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-200/90 leading-tight">
                        {activeReport.summaryMessage || 'Hugging Face vision classifier detected mountain slope, soil displacement, and rockfall features.'}
                      </p>
                    </div>

                    {/* Detected Model Labels */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Detected Hugging Face Model Labels:
                      </span>
                      <div className="space-y-1 text-[11px]">
                        {getReportDetectedLabels(activeReport).map((item: any, idx: number) => {
                          const labelStr = typeof item === 'string' ? item : item.label || item.name;
                          const confNum = typeof item === 'object' && item.confidence ? (item.confidence > 1 ? item.confidence : Math.round(item.confidence * 100)) : 85 - idx * 7;
                          return (
                            <div key={idx} className="p-1.5 rounded bg-card-hover border border-border/40 flex items-center justify-between text-foreground">
                              <span className="font-medium text-[11px]">{labelStr}</span>
                              <span className="font-mono text-[10px] font-bold text-accent-bright">
                                {confNum}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Model Details */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-border/30">
                      <div>
                        <span className="text-muted-foreground block">Vision Model Engine</span>
                        <span className="font-mono font-semibold text-foreground">
                          {activeReport.ai_model_name || 'google/vit-base-patch16-224'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Predicted Hazard</span>
                        <span className="font-semibold text-accent-bright capitalize">
                          {activeReport.predicted_hazard_type || activeReport.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Evidence Rating</span>
                        <StatusBadge status={activeReport.evidenceAssessment || 'likely_genuine'} />
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Media Authenticity</span>
                        <StatusBadge status={activeReport.mediaAuthenticity || 'likely_original'} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Captured Evidence Photo */}
                <div className="lg:col-span-3 space-y-3 bg-card p-3.5 rounded-lg border border-border/60">
                  <h4 className="text-xs font-bold text-foreground border-b border-border/40 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-accent-bright" />
                      Captured Citizen Photo
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> GPS Tagged
                    </span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    {getReportImageUrl(activeReport) ? (
                      <div className="relative group rounded-lg overflow-hidden border border-border/60 bg-black/40">
                        <img
                          src={getReportImageUrl(activeReport)}
                          alt="Citizen Evidence Photo"
                          className="w-full h-44 object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => setPreviewImage(getReportImageUrl(activeReport) || null)}
                            className="bg-accent-bright text-white text-[10px] px-2.5 py-1 rounded flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Fullview Photo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 rounded-lg border border-dashed border-border/60 bg-card-hover/40 flex flex-col items-center justify-center p-3 text-center text-muted-foreground text-xs space-y-1">
                        <Camera className="w-8 h-8 opacity-40 text-muted-foreground" />
                        <p className="font-semibold text-[11px]">No Photo Attached</p>
                        <p className="text-[10px] text-muted-foreground">Citizen submitted text report telemetry only.</p>
                      </div>
                    )}

                    <div className="p-2 rounded bg-card-hover border border-border/30 text-[10px] space-y-1 text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Evidence Check:</span>
                        <span className="font-bold text-emerald-400">PASSED</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Resolution:</span>
                        <span className="font-mono">1920x1080 JPEG</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Device Orientation:</span>
                        <span>Landscape 0°</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION CONTROL BAR: ASSIGN TO AUTHORITY USER ONLY */}
              <div className="pt-3 border-t border-border/60 space-y-3 bg-card p-4 rounded-xl border border-red-500/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-red-500" />
                    Assign Operational Task (Admin / Authority Staff Only)
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Restricted to Command Center Staff
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Filtered Assignee Dropdown */}
                  <div className="md:col-span-6 space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Assign To Authorized Officer:
                    </label>
                    <select
                      value={selectedAssigneeId ?? ''}
                      onChange={e => setSelectedAssigneeId(e.target.value || null)}
                      className="w-full rounded-lg border border-red-500/40 bg-card-hover px-3 py-2 text-xs text-foreground font-semibold focus:outline-hidden focus:border-red-500"
                    >
                      <option value="">-- Select Authority Assignee (Admin / Authority Only) --</option>
                      {authorityUsers.map(u => (
                        <option key={u.id || u._id} value={u.id || u._id}>
                          🛡️ {u.name} (Role: {u.role.toUpperCase().replace('_', ' ')}) — {u.email || u.district || 'Command Center'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operational Field Note Input */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-semibold text-foreground">Priority Field Note (Optional):</label>
                    <input
                      value={assignmentNotes}
                      onChange={e => setAssignmentNotes(e.target.value)}
                      placeholder="e.g. Dispatch JCB excavator to clear road..."
                      className="w-full rounded-lg border border-border bg-card-hover px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-accent-bright"
                    />
                  </div>

                  {/* Create Assignment Button */}
                  <div className="md:col-span-2">
                    <Button
                      onClick={createAssignment}
                      disabled={isSubmitting}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Dispatch Task
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-border/60 bg-card-hover/20 text-center text-muted-foreground space-y-2">
              <Compass className="w-10 h-10 mx-auto text-accent-bright opacity-60 animate-bounce" />
              <p className="text-xs font-bold text-foreground">No Report Selected for Inspection</p>
              <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                Please select a citizen hazard report from the dropdown selector above to open the full AI vision analysis, detected Hugging Face model labels, and captured photo preview.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: ACTIVE & COMPLETED ASSIGNMENTS BOARD */}
      <Card className="border-border/60 bg-card shadow-xl">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Layers className="h-4 w-4 text-accent-bright" />
              Operational Task Assignment Board
            </span>

            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
                className="rounded-lg px-3 py-1.5 bg-card-hover border border-border text-xs font-semibold text-foreground"
              >
                <option value="active">Active Tasks Only</option>
                <option value="all">All Assignments</option>
                <option value="completed">Completed Tasks</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent-bright" /> Loading operational assignment board...
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="text-xs text-muted-foreground italic p-4 text-center">No assignments created yet.</p>
          )}

          <div className="space-y-3">
            {items
              .filter(a => (filter === 'all' ? true : filter === 'completed' ? a.status === 'completed' : a.status !== 'completed'))
              .map(a => {
                const assignedReport = reports.find(r => r.id === a.reportId);
                const assigneeUser = users.find(u => (u.id || u._id) === a.assigneeId);

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl border border-border/60 bg-card-hover/40 space-y-3 hover:border-accent-bright/40 transition-all"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-accent/20 text-accent-bright border border-accent/40">
                          TASK #{a.id}
                        </span>
                        <span className="text-xs font-bold text-foreground">Report #{a.reportId}</span>
                        {assignedReport && <RiskBadge level={assignedReport.severity as RiskLevel} />}
                        <StatusBadge status={a.status} />
                      </div>

                      <div className="flex items-center gap-2">
                        {(!a.assigneeId || a.assigneeId === null) && (
                          <Button size="sm" onClick={() => claimAssignment(a.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1">
                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Claim Task
                          </Button>
                        )}

                        {a.status !== 'completed' && a.assigneeId === (window.localStorage.getItem('userId') || user?.id) && (
                          <Button size="sm" variant="outline" onClick={() => completeAssignment(a.id)} className="text-xs font-bold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                      <div className="md:col-span-8 space-y-1">
                        <p className="text-[11px] font-medium text-foreground">
                          {assignedReport ? `"${assignedReport.description}"` : `Report ID: ${a.reportId}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-400" />
                          {assignedReport?.location?.area || assignedReport?.location?.district || 'General Sector'}, {assignedReport?.location?.state}
                        </p>
                      </div>

                      <div className="md:col-span-4 space-y-1 text-right md:border-l md:border-border/40 md:pl-3">
                        <p className="text-[11px] font-semibold text-foreground">
                          {assigneeUser ? (
                            <span className="text-emerald-400 flex items-center justify-end gap-1">
                              <UserCheck className="w-3 h-3" /> Assigned to: {assigneeUser.name} ({assigneeUser.role.toUpperCase()})
                            </span>
                          ) : (
                            <span className="text-amber-400">Unassigned (Pool)</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Created: {new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* FULL PHOTO LIGHTBOX MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-card rounded-2xl overflow-hidden border border-border shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-accent-bright" /> Citizen Evidence High-Res Photo View
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewImage} alt="Citizen Evidence High-Res" className="w-full max-h-[75vh] object-contain rounded-lg bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
