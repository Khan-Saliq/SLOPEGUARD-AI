import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, MapPin, Upload, AlertTriangle, CheckCircle2, RefreshCw,
  Sparkles, ArrowRight, ShieldAlert, FileText, Image as ImageIcon,
  Check, XCircle, AlertCircle, Loader2, Scan, SwitchCamera, Video
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

  // Live Device Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

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

  // Stop camera tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
    setGpsStatus('Detecting City & Area location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latVal = parseFloat(pos.coords.latitude.toFixed(5));
        const lngVal = parseFloat(pos.coords.longitude.toFixed(5));
        setLat(latVal);
        setLng(lngVal);

        let area = areaName;
        let city = 'Shillong';
        let dist = district;

        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latVal}&lon=${lngVal}&format=json`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.road || area;
            city = addr.city || addr.town || addr.city_district || addr.state_district || addr.county || city;
            dist = addr.state_district || addr.county || addr.city_district || dist;
            if (area) setAreaName(area);
            if (dist) setDistrict(dist);
            if (addr.state) setState(addr.state);
          }
        } catch (e) {}

        setGpsStatus(`Location Acquired: ${area}, ${city}`);
        setFetchingGps(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGpsStatus('Location Default: Shillong Hill Sector, Shillong');
        setFetchingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // AI Inspection helper for both camera capture and file upload
  const runAiInspection = async (base64: string) => {
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

  // Start live device camera stream
  const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
    setCameraError(null);
    setIsCameraOpen(true);

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera access is not supported by your browser. Please select an image file.');
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch {
        // Fallback for laptops/desktop webcams without facingMode support
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      setCameraStream(stream);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play warning:', e));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Unable to access live camera. Please grant camera permissions in your browser or select an image file.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  // Switch between front/back cameras
  const toggleCameraFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Capture current frame from live stream
  const capturePhotoFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);

      stopCamera();
      setPhotoPreview(base64);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_hazard_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhoto(file);
        }
      }, 'image/jpeg', 0.9);

      runAiInspection(base64);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        runAiInspection(base64);
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
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <Camera className="h-4 w-4" /> Giri Raksha · Citizen Safety Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
              Report a Hazard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Upload photos or use live device camera to report landslides, rockfalls, or road damage.
            </p>
          </div>

          <Link to="/my-reports">
            <Button variant="outline" size="sm" className="gap-2 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white">
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
              <Card className="border-emerald-500/30 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Hazard Report Submitted Successfully!</h2>
                  <p className="text-xs text-slate-400 mt-1">Report ID: <span className="font-mono text-cyan-400 font-bold">{submittedReport.id}</span></p>
                </div>

                {/* AI Image Verification Summary Badge */}
                {submittedReport.aiVerification && (
                  <div className="mx-auto max-w-md rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-cyan-400" /> AI Image Verification
                      </span>
                      <Badge variant={submittedReport.aiVerification.is_relevant ? 'warning' : 'outline'}>
                        {submittedReport.aiVerification.is_relevant ? 'Relevant Hazard' : 'Uncertain / Pending'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-400 block">Confidence Score</span>
                        <span className="font-bold text-white">{Math.round(submittedReport.aiVerification.confidence * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Apparent Severity</span>
                        <span className="font-bold uppercase text-amber-400">{submittedReport.aiVerification.apparent_severity}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                      {submittedReport.aiVerification.recommendation}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
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
                    <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
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
                <div className="rounded-xl bg-red-950/80 border border-red-800 p-4 text-xs text-red-200 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Live Camera Capture or File Upload */}
              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-cyan-400" /> 1. Upload or Capture Hazard Evidence Photo
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      All Devices Supported
                    </span>
                  </div>
                </div>

                {isCameraOpen ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/60 bg-black shadow-2xl space-y-2">
                    <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => videoRef.current?.play()}
                      />

                      {/* Viewfinder HUD Overlay */}
                      <div className="absolute inset-0 pointer-events-none border-[12px] border-black/40 flex flex-col justify-between p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/40 text-[11px] text-cyan-400 font-mono font-semibold">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            LIVE DEVICE CAMERA ACTIVE ({facingMode.toUpperCase()})
                          </div>

                          {hasMultipleCameras && (
                            <button
                              type="button"
                              onClick={toggleCameraFacingMode}
                              className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-cyan-400 transition-colors"
                            >
                              <SwitchCamera className="w-4 h-4 text-cyan-400" /> Switch Camera
                            </button>
                          )}
                        </div>

                        <div className="self-center w-24 h-24 border-2 border-cyan-400/50 rounded-lg flex items-center justify-center relative">
                          <div className="w-3 h-3 border-t-2 border-l-2 border-cyan-400 absolute top-0 left-0" />
                          <div className="w-3 h-3 border-t-2 border-r-2 border-cyan-400 absolute top-0 right-0" />
                          <div className="w-3 h-3 border-b-2 border-l-2 border-cyan-400 absolute bottom-0 left-0" />
                          <div className="w-3 h-3 border-b-2 border-r-2 border-cyan-400 absolute bottom-0 right-0" />
                          <div className="w-2 h-2 rounded-full bg-cyan-400/80 animate-pulse" />
                        </div>

                        <div className="text-center text-[10px] text-cyan-300/80 font-mono bg-slate-950/70 py-1 rounded">
                          Align hazard scene in frame and press Shutter to capture
                        </div>
                      </div>

                      {cameraError && (
                        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 text-red-300 z-20">
                          <AlertCircle className="w-10 h-10 text-red-400" />
                          <p className="text-xs font-semibold">{cameraError}</p>
                          <Button size="sm" variant="outline" onClick={() => startCamera(facingMode)}>Retry Camera</Button>
                        </div>
                      )}
                    </div>

                    {/* Camera Controls Bar */}
                    <div className="p-4 bg-slate-900 flex items-center justify-between border-t border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                        className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </Button>

                      <button
                        type="button"
                        onClick={capturePhotoFromStream}
                        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/40 transition-all hover:scale-105 active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-slate-950 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-slate-950 group-hover:bg-slate-900 transition-colors" />
                        </div>
                      </button>

                      <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase">Tap Shutter</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => startCamera('environment')}
                        className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-br from-cyan-950/40 to-slate-900 hover:border-cyan-400 hover:from-cyan-950/70 transition-all p-4 text-center group shadow-lg"
                      >
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1 group-hover:scale-105 transition-transform">
                          <Video className="h-5 w-5 animate-pulse" /> Take Live Photo with Device Camera
                        </div>
                        <span className="text-[11px] text-slate-300">Opens live webcam on laptop, phone, or tablet</span>
                      </button>

                      <label className="flex items-center justify-center gap-2 h-16 border-2 border-dashed border-slate-700/80 rounded-xl cursor-pointer hover:border-cyan-400 hover:bg-slate-800/40 transition-colors p-3 text-center group">
                        <Upload className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-slate-300">Or Upload Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {photoPreview ? (
                      <div className="relative h-48 rounded-xl overflow-hidden border border-cyan-500/40 bg-black/60 shadow-xl">
                        <img src={photoPreview} alt="Evidence Preview" className="w-full h-full object-cover" />
                        
                        {/* Laser Scanner Beam Overlay during AI inspection */}
                        {hfScreening.status === 'analyzing' && (
                          <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[1px] pointer-events-none overflow-hidden">
                            <motion.div
                              initial={{ top: '0%' }}
                              animate={{ top: ['0%', '95%', '0%'] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                            />
                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

                            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/40 flex items-center justify-between text-[11px] text-cyan-300">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                <span className="font-bold tracking-wide">AI Disaster Image Scan in Progress...</span>
                              </div>
                              <Scan className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => { setPhoto(null); setPhotoPreview(null); setHfScreening({ status: 'idle' }); }}
                          className="absolute top-2 right-2 z-10 rounded-full bg-slate-950/80 text-white p-1 text-xs hover:bg-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="h-48 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center p-4 text-center text-slate-500 text-xs">
                        <ShieldAlert className="h-8 w-8 text-slate-600 mb-2 opacity-50" />
                        <span>Photo preview & AI hazard scanner will activate upon camera capture or file upload</span>
                      </div>
                    )}

                    {/* AI Vision Model Inspection Status Card */}
                    {photoPreview && (
                      <div className="col-span-1 md:col-span-2 mt-2">
                        {hfScreening.status === 'analyzing' && (
                          <div className="p-3.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                              <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                              <div>
                                <p className="font-bold text-white">AI Vision Hazard Inspection Active</p>
                                <p className="text-[11px] text-cyan-400/80">Scanning terrain gradient, geological fissures, slope stability, and disaster indicators...</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider animate-pulse shrink-0">
                              SCANNING
                            </span>
                          </div>
                        )}

                        {hfScreening.status === 'completed' && hfScreening.decision === 'accepted' && (
                          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs space-y-1 shadow-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                                <Check className="w-4 h-4" /> ACCEPTED BY AI DISASTER SCREENER
                              </span>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full uppercase font-bold border border-emerald-500/40">
                                Disaster Hazard Confirmed
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed opacity-90">{hfScreening.summary}</p>
                          </div>
                        )}

                        {hfScreening.status === 'completed' && hfScreening.decision === 'rejected' && (
                          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs space-y-1 shadow-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5 text-red-400">
                                <XCircle className="w-4 h-4" /> REJECTED BY AI DISASTER SCREENER
                              </span>
                              <span className="text-[10px] bg-red-500/20 text-red-300 px-2.5 py-0.5 rounded-full uppercase font-bold border border-red-500/40">
                                Non-Disaster Image
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed opacity-90">{hfScreening.summary}</p>
                          </div>
                        )}

                        {hfScreening.status === 'completed' && hfScreening.decision === 'unclear_manual_inspection' && (
                          <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs space-y-1 shadow-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                                <AlertCircle className="w-4 h-4" /> SENT FOR MANUAL ADMIN INSPECTION
                              </span>
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full uppercase font-bold border border-amber-500/40">
                                Requires Admin Review
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed opacity-90">{hfScreening.summary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Step 2: Location Access */}
              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-400" /> 2. Location Coordinates & Area
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFetchLocation}
                    disabled={fetchingGps}
                    className="text-xs gap-1.5 border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${fetchingGps ? 'animate-spin' : ''}`} />
                    {fetchingGps ? 'Detecting...' : 'Detect GPS'}
                  </Button>
                </div>

                {gpsStatus && (
                  <p className="text-[11px] text-cyan-300 font-mono bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/30">
                    ℹ️ {gpsStatus}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={e => setLat(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={e => setLng(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Area / Landmark</label>
                    <input
                      type="text"
                      value={areaName}
                      onChange={e => setAreaName(e.target.value)}
                      placeholder="e.g. Cherrapunji Bypass Cut"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">District / State</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                        className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
                        required
                      />
                      <input
                        type="text"
                        value={state}
                        onChange={e => setState(e.target.value)}
                        className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Step 3: Hazard Description & Category */}
              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-400" /> 3. Hazard Details & Category
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Hazard Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-800/60 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                    >
                      <option value="landslide" className="bg-slate-900 text-white">Slope Landslide / Debris Flow</option>
                      <option value="rockfall" className="bg-slate-900 text-white">Rockfall / Falling Boulders</option>
                      <option value="mudslide" className="bg-slate-900 text-white">Mudslide / Topsoil Collapse</option>
                      <option value="road_blockage" className="bg-slate-900 text-white">Road Obstruction / Damage</option>
                      <option value="crack" className="bg-slate-900 text-white">Ground Fissure / Slope Cracks</option>
                      <option value="water_seepage" className="bg-slate-900 text-white">Heavy Hillside Water Seepage</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Description of Hazard</label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe what you observed (e.g. Fresh soil displacement blocking left lane of NH-40 near km marker 14...)"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
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
                  className="w-full py-3 text-sm font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-400 gap-2 justify-center transition-all duration-200"
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
