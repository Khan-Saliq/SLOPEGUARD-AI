import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, MapPin, Upload, AlertTriangle, CheckCircle2, RefreshCw,
  Sparkles, ArrowRight, ShieldAlert, FileText, Image as ImageIcon,
  Check, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getApiUrl } from '../lib/utils';

interface AIResult {
  is_relevant: boolean;
  verification_category: string;
  confidence: number;
  apparent_severity: string;
  reasons: string[];
  recommendation: string;
  decision?: string;
  summaryMessage?: string;
}

interface SubmittedReport {
  id: string;
  title: string;
  category: string;
  location: {
    lat: number;
    lng: number;
    area: string;
    district: string;
    state: string;
  };
  description: string;
  photoUrl: string;
  status: string;
  createdAt: string;
  aiVerification?: AIResult;
}

export function ReportHazardPage() {
  // Form State
  const [, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('landslide');
  const [description, setDescription] = useState<string>('');
  const [areaName, setAreaName] = useState<string>('Shillong Hill Sector');
  const [district, setDistrict] = useState<string>('East Khasi Hills');
  const [state, setState] = useState<string>('Meghalaya');
  const [lat, setLat] = useState<number>(25.5788);
  const [lng, setLng] = useState<number>(91.8933);
  const [fetchingGps, setFetchingGps] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Live Hugging Face Screening State
  const [hfScreening, setHfScreening] = useState<{
    status: 'idle' | 'analyzing' | 'completed';
    decision?: 'accepted' | 'rejected' | 'unclear_manual_inspection';
    summary?: string;
    labels?: { label: string; confidence: number }[];
  }>({ status: 'idle' });

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<SubmittedReport | null>(null);

  // Auto-fetch location on mount
  useEffect(() => {
    handleFetchLocation();
  }, []);

  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by browser');
      return;
    }

    setFetchingGps(true);
    setGpsStatus('Detecting exact GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latVal = parseFloat(pos.coords.latitude.toFixed(5));
        const lngVal = parseFloat(pos.coords.longitude.toFixed(5));
        setLat(latVal);
        setLng(lngVal);
        setGpsStatus(`GPS Acquired: ${latVal}, ${lngVal} (±${Math.round(pos.coords.accuracy)}m)`);
        setFetchingGps(false);

        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latVal}&lon=${lngVal}&format=json`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || areaName;
            const dist = addr.state_district || addr.county || addr.city_district || district;
            if (area) setAreaName(area);
            if (dist) setDistrict(dist);
            if (addr.state) setState(addr.state);
          }
        } catch (e) {}
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGpsStatus('Using regional default GPS (Coordinates selectable)');
        setFetchingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);

        // Trigger Live Hugging Face AI Vision Inspection
        setHfScreening({ status: 'analyzing' });
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(getApiUrl('/api/inspect-media'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ imageUrl: base64, category })
          });
          if (res.ok) {
            const data = await res.json();
            const ai = data.ai_result || data;
            setHfScreening({
              status: 'completed',
              decision: ai.decision || (ai.imageRelevance === 'RELEVANT' ? 'accepted' : ai.imageRelevance === 'IRRELEVANT' ? 'rejected' : 'unclear_manual_inspection'),
              summary: ai.summaryMessage || data.summaryMessage,
              labels: ai.detectedLabels || data.detectedLabels
            });
          } else {
            setHfScreening({ status: 'completed', decision: 'unclear_manual_inspection', summary: 'Hugging Face API pending inspection. Sent for manual verification.' });
          }
        } catch (err) {
          setHfScreening({ status: 'completed', decision: 'unclear_manual_inspection', summary: 'AI screening server notice. Report queued for admin inspection.' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Please provide a description of the observed hazard.');
      return;
    }

    setSubmitting(true);

    try {
      const token = window.localStorage.getItem('token');

      const payload = {
        category,
        description,
        location: {
          lat: Number(lat),
          lng: Number(lng),
          area: areaName,
          district: district,
          state: state
        },
        photoBase64: photoPreview || undefined,
        captureMethod: 'citizen_portal',
        metadata: {
          captureTimestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      };

      const res = await fetch(getApiUrl('/api/reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to submit report (${res.status})`);
      }

      setSubmittedReport(data.report || data);
    } catch (err: any) {
      console.error('Submit report error:', err);
      setError(err.message || 'Report submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-main text-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-bright uppercase tracking-wider">
              <Camera className="h-4 w-4" /> Giri Raksha · Citizen Safety Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-main mt-1">
              Report a Hazard
            </h1>
            <p className="text-xs sm:text-sm text-dim mt-1">
              Upload photos & details of landslides, rockfalls, or damaged roads for AI image verification & admin action.
            </p>
          </div>

          <Link to="/my-reports">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" /> My Reports
            </Button>
          </Link>
        </div>

        {/* Confirmation Screen after successful submission */}
        <AnimatePresence mode="wait">
          {submittedReport ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <Card className="border-accent/40 bg-accent/10 p-6 sm:p-8 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent-bright">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-main">Hazard Report Submitted Successfully!</h2>
                  <p className="text-xs text-dim mt-1">Report ID: <span className="font-mono text-accent-bright font-bold">{submittedReport.id}</span></p>
                </div>

                {/* AI Image Verification Summary Badge */}
                {submittedReport.aiVerification && (
                  <div className="mx-auto max-w-md rounded-xl bg-card border border-border p-4 text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-bold text-main flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-accent-bright" /> AI Image Verification
                      </span>
                      <Badge variant={submittedReport.aiVerification.is_relevant ? 'warning' : 'outline'}>
                        {submittedReport.aiVerification.is_relevant ? 'Relevant Hazard' : 'Uncertain / Pending'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-dim block">Confidence Score</span>
                        <span className="font-bold text-main">{Math.round(submittedReport.aiVerification.confidence * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-dim block">Apparent Severity</span>
                        <span className="font-bold uppercase text-accent-warm">{submittedReport.aiVerification.apparent_severity}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-dim border-t border-border/40 pt-2">
                      {submittedReport.aiVerification.recommendation}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmittedReport(null);
                      setPhoto(null);
                      setPhotoPreview(null);
                      setDescription('');
                    }}
                  >
                    Submit Another Report
                  </Button>
                  <Link to="/my-reports">
                    <Button className="gap-2">
                      View My Reports <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmitReport}
              className="space-y-6"
            >
              {error && (
                <div className="rounded-xl bg-critical/10 border border-critical/30 p-4 text-xs text-critical flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Photo Upload */}
              <Card className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-main flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-accent-bright" /> 1. Upload Hazard Evidence Photo
                  </h3>
                  <span className="text-[10px] text-dim font-mono uppercase bg-accent/10 px-2 py-0.5 rounded">Required</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent-bright hover:bg-card-hover/40 transition-colors p-4 text-center">
                    <Upload className="h-8 w-8 text-accent-bright mb-2" />
                    <span className="text-xs font-semibold text-main">Click to upload photo or take picture</span>
                    <span className="text-[10px] text-dim mt-1">Supports JPG, PNG, WEBP up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>

                  {photoPreview ? (
                    <div className="relative h-48 rounded-xl overflow-hidden border border-border bg-black/40">
                      <img src={photoPreview} alt="Evidence Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setPhoto(null); setPhotoPreview(null); setHfScreening({ status: 'idle' }); }}
                        className="absolute top-2 right-2 rounded-full bg-black/70 text-white p-1 text-xs hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-48 rounded-xl border border-border/50 bg-card-hover/20 flex flex-col items-center justify-center p-4 text-center text-dim text-xs">
                      <ShieldAlert className="h-8 w-8 text-dim mb-2 opacity-50" />
                      <span>Photo preview & Hugging Face AI inspection will appear here</span>
                    </div>
                  )}

                  {/* Hugging Face AI Screening Live Preview Banner */}
                  {photoPreview && (
                    <div className="col-span-1 md:col-span-2 mt-2">
                      {hfScreening.status === 'analyzing' && (
                        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                          <span className="font-semibold">Hugging Face AI inspecting photo (google/vit-base-patch16-224)...</span>
                        </div>
                      )}

                      {hfScreening.status === 'completed' && hfScreening.decision === 'accepted' && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                              <Check className="w-4 h-4" /> ACCEPTED BY HUGGING FACE AI
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase font-bold border border-emerald-500/30">
                              Disaster Hazard
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed opacity-90">{hfScreening.summary}</p>
                        </div>
                      )}

                      {hfScreening.status === 'completed' && hfScreening.decision === 'rejected' && (
                        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5 text-red-400">
                              <XCircle className="w-4 h-4" /> REJECTED BY HUGGING FACE AI
                            </span>
                            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded uppercase font-bold border border-red-500/30">
                              Non-Disaster Image
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed opacity-90">{hfScreening.summary}</p>
                        </div>
                      )}

                      {hfScreening.status === 'completed' && hfScreening.decision === 'unclear_manual_inspection' && (
                        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5 text-amber-400">
                              <AlertCircle className="w-4 h-4" /> SENT FOR MANUAL INSPECTION
                            </span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded uppercase font-bold border border-amber-500/30">
                              Requires Admin Review
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed opacity-90">{hfScreening.summary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Step 2: Location Access */}
              <Card className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-main flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent-bright" /> 2. Location Coordinates & Area
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFetchLocation}
                    disabled={fetchingGps}
                    className="text-xs gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${fetchingGps ? 'animate-spin' : ''}`} />
                    {fetchingGps ? 'Detecting...' : 'Detect GPS'}
                  </Button>
                </div>

                {gpsStatus && (
                  <p className="text-[11px] text-accent-bright font-mono bg-accent/10 p-2 rounded-lg border border-accent/20">
                    ℹ️ {gpsStatus}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-dim block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={e => setLat(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-dim block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={e => setLng(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-dim block mb-1">Area / Landmark</label>
                    <input
                      type="text"
                      value={areaName}
                      onChange={e => setAreaName(e.target.value)}
                      placeholder="e.g. Cherrapunji Bypass Cut"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-dim block mb-1">District / State</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                        className="w-1/2 px-3 py-2 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                        required
                      />
                      <input
                        type="text"
                        value={state}
                        onChange={e => setState(e.target.value)}
                        className="w-1/2 px-3 py-2 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                        required
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Step 3: Hazard Description & Category */}
              <Card className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-main flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent-bright" /> 3. Hazard Details & Category
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-dim block mb-1">Hazard Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                    >
                      <option value="landslide">Slope Landslide / Debris Flow</option>
                      <option value="rockfall">Rockfall / Falling Boulders</option>
                      <option value="mudslide">Mudslide / Topsoil Collapse</option>
                      <option value="road_blockage">Road Obstruction / Damage</option>
                      <option value="crack">Ground Fissure / Slope Cracks</option>
                      <option value="water_seepage">Heavy Hillside Water Seepage</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-dim block mb-1">Description of Hazard</label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe what you observed (e.g. Fresh soil displacement blocking left lane of NH-40 near km marker 14...)"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-main outline-none focus:border-accent"
                      required
                    />
                  </div>
                </div>
              </Card>

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-sm font-bold bg-accent hover:bg-accent-bright text-slate-950 shadow-lg gap-2 justify-center"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Running AI Verification & Submitting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Submit Report for AI Verification
                    </>
                  )}
                </Button>
              </div>

            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
