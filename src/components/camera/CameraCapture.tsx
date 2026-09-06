import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Check, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface CameraCaptureProps {
  onCapture: (data: { blob: Blob; url: string; type: 'image'; timestamp: Date; metadata: CaptureMetadata }) => void;
  onCancel: () => void;
}

interface CaptureMetadata {
  captureMethod: 'camera_api';
  captureTimestamp: string;
  deviceInfo: string;
  cameraBrand?: string;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<'requesting' | 'active' | 'denied' | 'unsupported' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  useEffect(() => {
    if (status === 'active' && videoRef.current && mediaStreamRef.current) {
      const video = videoRef.current;
      video.srcObject = mediaStreamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch(e => console.warn('Video auto-play deferred:', e));
      };
      video.play().catch(() => {});
    }
  }, [status]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('unsupported');
        setErrorMessage('Camera access is not supported in this browser. Please use Chrome, Firefox, or Safari.');
        return;
      }

      setStatus('requesting');

      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      mediaStreamRef.current = stream;
      setStatus('active');
    } catch (error: any) {
      console.error('Camera access error:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMessage('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setStatus('error');
        setErrorMessage('No camera found on this device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setStatus('error');
        setErrorMessage('Camera is in use by another app. Please close other apps using the camera.');
      } else {
        setStatus('error');
        setErrorMessage(`Camera error: ${error.message || 'Unknown error occurred'}`);
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setCapturedPhoto(url);
    }, 'image/jpeg', 0.92);
  };

  const confirmPhoto = () => {
    if (!capturedPhoto) return;

    fetch(capturedPhoto)
      .then(res => res.blob())
      .then(blob => {
        const captureMetadata: CaptureMetadata = {
          captureMethod: 'camera_api',
          captureTimestamp: new Date().toISOString(),
          deviceInfo: navigator.userAgent,
        };

        onCapture({
          blob,
          url: capturedPhoto,
          type: 'image',
          timestamp: new Date(),
          metadata: captureMetadata
        });
      });
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Permission denied or unsupported UI
  if (status === 'denied' || status === 'unsupported' || status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative w-full h-[400px] bg-slate-900 rounded-xl border-2 border-red-500/50 flex flex-col items-center justify-center p-6"
      >
        <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">
          {status === 'denied' && 'Camera Permission Denied'}
          {status === 'unsupported' && 'Camera Not Supported'}
          {status === 'error' && 'Camera Error'}
        </h3>
        <p className="text-sm text-slate-300 text-center max-w-md mb-4">
          {errorMessage}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {status === 'denied' && (
            <Button onClick={() => window.location.reload()}>
              Reload & Retry
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // Requesting permission UI
  if (status === 'requesting') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative w-full h-[400px] bg-slate-900 rounded-xl border-2 border-accent-bright/50 flex flex-col items-center justify-center"
      >
        <Loader2 className="h-12 w-12 text-accent-bright animate-spin mb-4" />
        <p className="text-sm text-slate-300">Requesting camera access...</p>
        <p className="text-xs text-slate-500 mt-2">Please allow camera permission when prompted</p>
      </motion.div>
    );
  }

  // Photo preview (after capture, before confirmation)
  if (capturedPhoto) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative w-full"
      >
        <div className="relative w-full h-[400px] bg-black rounded-xl overflow-hidden border-2 border-accent-bright/50">
          <img
            src={capturedPhoto}
            alt="Captured Hazard"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={retakePhoto}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Photo
          </Button>
          <Button className="flex-1 bg-accent-bright text-black font-bold" onClick={confirmPhoto}>
            <Check className="h-4 w-4 mr-2" />
            Use This Photo
          </Button>
        </div>
      </motion.div>
    );
  }

  // Active camera view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full"
    >
      <div className="relative w-full h-[400px] bg-black rounded-xl overflow-hidden border-2 border-accent-bright/50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Camera controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-white">
              <X className="h-5 w-5" />
            </Button>

            <Button
              onClick={capturePhoto}
              className="h-16 w-16 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center shadow-lg"
            >
              <Camera className="h-8 w-8 text-black" />
            </Button>

            <Button variant="ghost" size="sm" onClick={switchCamera} className="text-white">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-400">
        <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
        <span>Camera Active — Photo Capture Mode</span>
      </div>
    </motion.div>
  );
}

