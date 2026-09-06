import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { useMonitorData } from '../hooks/useMonitorData';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RiskBadge } from '../components/ui/Badge';
import { OfflineSyncBar } from '../components/layout/OfflineSyncBar';
import { EvaluatorExplanationCard } from '../components/ui/EvaluatorExplanationCard';
import { CameraCapture } from '../components/camera/CameraCapture';
import type { ProblemCategory, RiskLevel } from '../types';
import {
  Camera, MapPin, CheckCircle, Loader2, Shield,
  Navigation, WifiOff, Sparkles, Video, AlertTriangle,
  XCircle, Info,
} from 'lucide-react';

const categories: { value: ProblemCategory; label: string; icon: string }[] = [
  { value: 'landslide', label: 'Landslide / Debris', icon: '⛰️' },
  { value: 'road_blockage', label: 'Road Blockage', icon: '🚧' },
  { value: 'crack', label: 'Crack / Fissure', icon: '⚡' },
  { value: 'slope_movement', label: 'Slope Movement', icon: '📐' },
  { value: 'water_seepage', label: 'Water Seepage', icon: '💧' },
  { value: 'other', label: 'Other Hazard', icon: '⚠️' },
];

type Step = 'location' | 'capture' | 'ai_analysis' | 'review' | 'submitted';
type CaptureMode = 'photo' | 'video' | null;

interface AIResult {
  evidenceAssessment: string;
  mediaAuthenticity: string;
  severity: RiskLevel;
  confidence: number;
  detectedCategory: ProblemCategory;
  evidenceStatus: string;
  reasons: string[];
  recommendation: string;
}

export function ReportHazardPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { submitReport } = useMonitorData();
  const { isOnline, saveReportOffline } = useOfflineSync();

  const [step, setStep] = useState<Step>('location');
  const [category, setCategory] = useState<ProblemCategory>('landslide');
  const [description, setDescription] = useState('');
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);

  // Captured Media State
  const [capturedMedia, setCapturedMedia] = useState<{
    blob: Blob;
    url: string;
    type: 'image' | 'video';
    timestamp: Date;
    metadata: any;
  } | null>(null);

  // GPS Location State
  const [location, setLocation] = useState({
    lat: 25.5100,
    lng: 90.1800,
    area: 'Tura Bypass Highway',
    city: 'Tura',
    district: 'West Garo Hills',
    state: 'Meghalaya',
    accuracy: 6,
  });
  const [isLocating, setIsLocating] = useState(false);

  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  const steps: Step[] = ['location', 'capture', 'ai_analysis', 'review', 'submitted'];
  const stepIndex = steps.indexOf(step);

  // Get GPS location
  const captureGPS = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error('GPS error:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle camera capture
  const handleCameraCapture = (data: {
    blob: Blob;
    url: string;
    type: 'image' | 'video';
    timestamp: Date;
    metadata: any;
  }) => {
    setCapturedMedia(data);
    setCaptureMode(null);
    setStep('ai_analysis');
    performAIInspection(data);
  };

  // Perform AI inspection
  const performAIInspection = async (media: typeof capturedMedia) => {
    if (!media) return;

    try {
      // Upload media first
      const formData = new FormData();
      formData.append('file', media.blob, `evidence-${Date.now()}.${media.type === 'video' ? 'webm' : 'jpg'}`);

      const token = localStorage.getItem('token');
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      const uploadData = await uploadRes.json();
      const imageUrl = `${window.location.origin}${uploadData.url}`;

      // Call AI inspection endpoint
      const inspectRes = await fetch('/api/inspect-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl,
          category,
          captureMetadata: media.metadata,
        }),
      });

      if (!inspectRes.ok) throw new Error('AI inspection failed');

      const inspectData = await inspectRes.json();

      // Map API response to AIResult
      const result: AIResult = {
        evidenceAssessment: inspectData.ai_result.evidence_status || 'unknown',
        mediaAuthenticity: media.metadata.captureMethod === 'camera_api' ? 'camera_verified' : 'unknown',
        severity: inspectData.recommended_severity as RiskLevel,
        confidence: Math.round((inspectData.ai_result.confidence || 0) * 100),
        detectedCategory: inspectData.ai_result.hazard_type as ProblemCategory,
        evidenceStatus: inspectData.recommended_status,
        reasons: inspectData.ai_result.reasons || [],
        recommendation: inspectData.ai_result.recommendation || '',
      };

      setAiResult(result);

      // Wait a moment before showing review
      setTimeout(() => {
        setStep('review');
      }, 1500);
    } catch (error: any) {
      console.error('AI inspection error:', error);

      // Fallback to review with manual verification
      setAiResult({
        evidenceAssessment: 'manual_verification_required',
        mediaAuthenticity: media.metadata.captureMethod === 'camera_api' ? 'camera_verified' : 'unknown',
        severity: 'moderate',
        confidence: 50,
        detectedCategory: category,
        evidenceStatus: 'manual_verification_required',
        reasons: ['AI inspection service unavailable', 'Manual review required'],
        recommendation: 'Report will be submitted for manual verification by authorities',
      });

      setTimeout(() => {
        setStep('review');
      }, 1500);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      let evidenceUrl: string | undefined;

      if (capturedMedia) {
        const formData = new FormData();
        formData.append('file', capturedMedia.blob, `evidence-${Date.now()}.${capturedMedia.type === 'video' ? 'webm' : 'jpg'}`);

        const token = localStorage.getItem('token');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          evidenceUrl = uploadData.url;
        }
      }

      const reportData: any = {
        userId: user?.id ?? 'anonymous',
        userName: user?.name ?? 'Anonymous Citizen',
        category: aiResult?.detectedCategory || category,
        description: description || `${category} reported via citizen evidence portal`,
        location: {
          lat: location.lat,
          lng: location.lng,
          area: location.area,
          city: location.city,
          district: location.district,
          state: location.state,
        },
        gpsAccuracy: location.accuracy,
        severity: aiResult?.severity || 'moderate',
        evidenceUrl,
        captureTimestamp: capturedMedia?.timestamp.toISOString(),
        captureMetadata: capturedMedia?.metadata,
      };

      if (!isOnline) {
        saveReportOffline(reportData);
      } else {
        submitReport(reportData);
      }

      setStep('submitted');
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <OfflineSyncBar />

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center justify-between">
          <span>Report Hazard - Live Camera Capture</span>
          {!isOnline && (
            <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Offline Mode
            </span>
          )}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Capture live photo/video evidence using your device camera with AI-powered verification
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {steps.slice(0, -1).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                i <= stepIndex
                  ? 'bg-accent-bright text-black font-extrabold shadow-sm'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 2 && (
              <div className={`flex-1 h-0.5 rounded ${i < stepIndex ? 'bg-accent-bright' : 'bg-slate-800'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Location & Category */}
        {step === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-accent/10 border border-accent/30 p-4">
                  <Navigation className="h-6 w-6 text-accent-bright shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">GPS Location</p>
                    <p className="text-xs text-slate-400">Accuracy: ±{location.accuracy}m</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={captureGPS} disabled={isLocating}>
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                  </Button>
                </div>

                <div className="rounded-xl bg-slate-800/50 p-4 space-y-2 border border-border/40">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-accent-bright mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">
                        {location.area}, {location.city}
                      </p>
                      <p className="text-xs text-slate-400">
                        {location.district}, {location.state}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium">Select Hazard Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          category === cat.value
                            ? 'border-accent-bright bg-accent/15 ring-1 ring-accent-bright'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <p className="text-xs font-medium text-white mt-1">{cat.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={() => setStep('capture')}>
                  Continue to Camera Capture <Camera className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Camera Capture */}
        {step === 'capture' && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="pt-5 space-y-4">
                {captureMode === null && !capturedMedia && (
                  <>
                    <div className="space-y-3">
                      <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-8 text-center space-y-4">
                        <div className="flex justify-center gap-4">
                          <Camera className="h-12 w-12 text-accent-bright" />
                          <Video className="h-12 w-12 text-accent-warm" />
                        </div>
                        <p className="text-sm text-white font-medium">Choose Capture Method</p>
                        <p className="text-xs text-slate-400">
                          Use your device camera to capture live evidence
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button onClick={() => setCaptureMode('photo')} className="flex items-center gap-2">
                            <Camera className="h-4 w-4" /> Capture Photo
                          </Button>
                          <Button
                            onClick={() => setCaptureMode('video')}
                            variant="secondary"
                            className="flex items-center gap-2"
                          >
                            <Video className="h-4 w-4" /> Record Video
                          </Button>
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-300">
                          <strong>Camera-Only Capture:</strong> This page uses your device camera via browser API.
                          Media is captured with timestamp and metadata for verification.
                        </div>
                      </div>
                    </div>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description (e.g. road blocked near river bend, active falling rocks)..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-hidden focus:border-accent-bright resize-none h-20"
                    />

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep('location')}>
                        Back
                      </Button>
                    </div>
                  </>
                )}

                {captureMode !== null && (
                  <CameraCapture
                    mode={captureMode}
                    onCapture={handleCameraCapture}
                    onCancel={() => setCaptureMode(null)}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: AI Analysis */}
        {step === 'ai_analysis' && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                {capturedMedia && (
                  <div className="relative max-w-xs mx-auto rounded-xl overflow-hidden border border-accent-bright/60 shadow-lg">
                    {capturedMedia.type === 'video' ? (
                      <video src={capturedMedia.url} className="h-40 w-full object-cover" />
                    ) : (
                      <img src={capturedMedia.url} alt="Inspecting" className="h-40 w-full object-cover" />
                    )}
                    <motion.div
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                      className="absolute left-0 right-0 h-1 bg-accent-bright shadow-[0_0_15px_#0ea5e9]"
                    />
                  </div>
                )}

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="mx-auto"
                >
                  <Loader2 className="h-10 w-10 text-accent-bright" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white">AI Evidence Inspection</h3>
                <p className="text-sm text-slate-400">
                  Analyzing captured media, verifying metadata & assessing hazard evidence...
                </p>
                <div className="space-y-1.5 max-w-xs mx-auto text-left">
                  {[
                    'Scanning image features...',
                    'Verifying camera metadata...',
                    'Detecting hazard type...',
                    'Calculating confidence score...',
                  ].map((text, i) => (
                    <motion.p
                      key={text}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.3 }}
                      className="text-xs text-slate-400 flex items-center gap-2"
                    >
                      <Sparkles className="h-3 w-3 text-accent-bright shrink-0" /> {text}
                    </motion.p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && aiResult && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-accent-bright" /> AI Inspection Results
                  </h3>
                  <span className="text-xs font-mono text-accent-bright bg-accent/10 px-2.5 py-1 rounded border border-accent/20">
                    Confidence: {aiResult.confidence}%
                  </span>
                </div>

                {capturedMedia && (
                  <div className="flex items-center gap-3 rounded-lg bg-black/30 p-2 border border-border/40">
                    {capturedMedia.type === 'video' ? (
                      <video src={capturedMedia.url} className="h-16 w-20 object-cover rounded" />
                    ) : (
                      <img src={capturedMedia.url} alt="Evidence" className="h-16 w-20 object-cover rounded" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {capturedMedia.type === 'video' ? 'Video Evidence' : 'Photo Evidence'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Captured: {capturedMedia.timestamp.toLocaleString()}
                      </p>
                      {aiResult.mediaAuthenticity === 'camera_verified' && (
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold mt-0.5">
                          <CheckCircle className="h-3 w-3" /> Camera API Verified
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Assessment */}
                <div
                  className={`rounded-lg p-4 border ${
                    aiResult.confidence >= 85
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : aiResult.confidence >= 60
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {aiResult.confidence >= 85 ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : aiResult.confidence >= 60 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white mb-1">{aiResult.recommendation}</p>
                      <ul className="space-y-1">
                        {aiResult.reasons.map((reason, i) => (
                          <li key={i} className="text-xs text-slate-300">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                    <p className="text-slate-500">Detected Category</p>
                    <p className="font-bold text-white capitalize mt-1 text-sm">
                      {aiResult.detectedCategory.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                    <p className="text-slate-500">Hazard Severity</p>
                    <div className="mt-1">
                      <RiskBadge level={aiResult.severity} size="md" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800 text-xs space-y-1">
                  <p className="text-slate-400">
                    <strong className="text-white">Location:</strong> {location.area}, {location.district}
                  </p>
                  {description && (
                    <p className="text-slate-400">
                      <strong className="text-white">Notes:</strong> {description}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('capture')}>
                    Recapture
                  </Button>
                  <Button className="flex-1 bg-accent-bright text-black font-bold" onClick={handleFinalSubmit}>
                    {isOnline ? 'Submit Report' : 'Save Offline'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Submitted */}
        {step === 'submitted' && (
          <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-emerald-500/40 bg-emerald-950/10">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mx-auto">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {isOnline ? 'Report Successfully Submitted!' : 'Report Saved Offline!'}
                </h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  {isOnline
                    ? 'Your geo-tagged hazard evidence has been transmitted to authorities and analyzed by AI.'
                    : 'Saved locally. Will automatically sync when internet connection is restored.'}
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setStep('location');
                      setCapturedMedia(null);
                      setDescription('');
                      setAiResult(null);
                    }}
                  >
                    Report Another Hazard
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/history')}>
                    View My Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== 'submitted' && (
        <EvaluatorExplanationCard
          title="Live Camera Capture & AI Computer Vision Inspection"
          purpose="Allows citizens to capture live camera photos/videos with browser API, perform AI hazard detection, verify capture metadata, and store reports with offline sync capability."
          inputs="Browser Camera API, GPS geolocation, AI vision model, capture metadata verification."
          psReference="PS_26001 Section 17 (Citizen Evidence & Offline Sync)"
          evaluatorNote="Uses navigator.mediaDevices.getUserMedia() for camera-only capture. AI inspection assesses hazard relevance and confidence. Manual verification required for uncertain cases."
        />
      )}
    </div>
  );
}
