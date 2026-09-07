/**
 * Computer Vision & AI Screening Classifier for Hazard Photo & Video Verification
 * Interfaces with Backend Hugging Face Vision API service for hazard relevance screening.
 */

export interface LabelConfidence {
  label: string;
  confidence: number;
}

export interface MLInspectionResult {
  is_hazard_environment: boolean;
  environment_type: 'hill_mountain_slope' | 'water_seepage_body' | 'rock_landslide_debris' | 'invalid_non_hazard';
  confidence: number;
  detected_features: string[];
  decision: 'sent_to_admin_for_manual_inspection' | 'rejected';
  message: string;
  recommended_severity: 'critical' | 'high' | 'moderate' | 'low';

  // Hugging Face Backend Inspection Schema
  analysisStatus?: 'COMPLETED' | 'PENDING' | 'UNAVAILABLE' | 'FAILED';
  imageRelevance?: 'RELEVANT' | 'POSSIBLY_RELEVANT' | 'POSSIBLY_IRRELEVANT' | 'IRRELEVANT' | 'UNKNOWN';
  detectedLabels?: LabelConfidence[];
  possibleHazardType?: string;
  hazardConfidence?: number;
  requiresHumanVerification?: boolean;
  modelName?: string;
  processedAt?: string;
  summaryMessage?: string;
  errorMessage?: string;
}

/**
 * Extract pixel matrix from Image URL, HTMLImageElement, HTMLVideoElement, or Video Blob URL
 */
async function extractCanvasPixels(
  imageSource: string | HTMLImageElement
): Promise<{ data: Uint8ClampedArray; width: number; height: number; base64DataUrl?: string } | null> {
  return new Promise((resolve) => {
    // 1. Video Blob or Video File URL
    if (
      typeof imageSource === 'string' &&
      (imageSource.startsWith('blob:') && (imageSource.endsWith('.webm') || imageSource.endsWith('.mp4')))
    ) {
      const video = document.createElement('video');
      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        video.crossOrigin = 'anonymous';
      }
      video.muted = true;
      video.playsInline = true;

      const timeout = setTimeout(() => {
        resolve(null);
      }, 3500);

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
        } catch (e) {
          // ignore seek error
        }
      };

      video.onseeked = () => {
        clearTimeout(timeout);
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, 384, 384);
        const base64DataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ data: ctx.getImageData(0, 0, 384, 384).data, width: 384, height: 384, base64DataUrl });
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };

      video.src = imageSource;
      video.load();
      return;
    }

    // 2. Standard Image element or Image Data URL / Blob URL
    const img = new Image();
    if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
      img.crossOrigin = 'anonymous';
    }

    const processLoadedImage = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, 384, 384);
        ctx.drawImage(img, 0, 0, 384, 384);
        const base64DataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ data: ctx.getImageData(0, 0, 384, 384).data, width: 384, height: 384, base64DataUrl });
      } catch (e) {
        resolve(null);
      }
    };

    img.onload = processLoadedImage;
    img.onerror = () => resolve(null);

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = imageSource.src;
    }
  });
}

function computeHistogram(data: Uint8ClampedArray) {
  let skin = 0, paper = 0, green = 0, earth = 0, rock = 0, water = 0;
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightness = (r + g + b) / 3;

    const rgRatio = r / (g || 1);
    const rbgRatio = (r - b) / (r - g || 1);
    const isSkin = (
      r > 80 && g > 45 && b > 25 &&
      r > g + 12 && g > b + 8 &&
      rgRatio >= 1.15 && rgRatio <= 1.45 &&
      rbgRatio >= 1.25 && rbgRatio <= 1.85
    );

    if (isSkin) skin++;
    else if (r > 195 && g > 195 && b > 195 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12) paper++;
    else if (g > r + 8 && g > b + 6 && brightness > 20) green++;
    else if (r > 50 && g > 35 && b < 130 && r > b + 8 && brightness > 20 && brightness < 180) earth++;
    else if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && brightness > 25 && brightness < 215) rock++;
    else if (b > r + 25 && b > g + 15 && b > 80 && r < 140) water++;
  }
  return { total, skin, paper, green, earth, rock, water };
}

/**
 * Call Backend Hugging Face Image Analysis Endpoint
 */
async function tryBackendHuggingFaceInspection(
  imageUrl: string,
  categoryHint: string,
  colorHistogram?: ReturnType<typeof computeHistogram>
): Promise<MLInspectionResult | null> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/inspect-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        imageUrl,
        category: categoryHint,
        colorHistogram,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || !data.success) return null;

    const isRelevant = data.imageRelevance === 'RELEVANT' || data.imageRelevance === 'POSSIBLY_RELEVANT';

    return {
      is_hazard_environment: isRelevant,
      environment_type: categoryHint === 'water_seepage' ? 'water_seepage_body' : (categoryHint === 'road_blockage' || categoryHint === 'crack' ? 'rock_landslide_debris' : 'hill_mountain_slope'),
      confidence: data.hazardConfidence || 0.85,
      detected_features: (data.detectedLabels || []).map((l: any) => `${l.label} (${Math.round((l.confidence || 0) * 100)}%)`),
      decision: 'sent_to_admin_for_manual_inspection',
      message: data.summaryMessage || 'Possible hazard environment detected. Awaiting official verification.',
      recommended_severity: 'moderate',
      analysisStatus: data.analysisStatus || 'COMPLETED',
      imageRelevance: data.imageRelevance || 'POSSIBLY_RELEVANT',
      detectedLabels: data.detectedLabels || [],
      possibleHazardType: data.possibleHazardType || 'POSSIBLE_LANDSLIDE',
      hazardConfidence: data.hazardConfidence || 0.75,
      requiresHumanVerification: true,
      modelName: data.modelName || 'google/vit-base-patch16-224',
      processedAt: data.processedAt || new Date().toISOString(),
      summaryMessage: data.summaryMessage,
      errorMessage: data.errorMessage,
    };
  } catch (e) {
    console.warn('[Backend Inspection Wrapper] Server request offline or unavailable, using fallback:', e);
    return null;
  }
}

/**
 * Analyzes an image or video blob using Backend Hugging Face AI Vision API ONLY
 */
export async function classifyHazardImage(
  imageSource: string | HTMLImageElement,
  categoryHint: string = 'landslide'
): Promise<MLInspectionResult> {
  const pixelResult = await extractCanvasPixels(imageSource);

  // 1. Send media image & color histogram to Backend Hugging Face Vision API
  if (pixelResult?.base64DataUrl) {
    const colorHistogram = pixelResult.data ? computeHistogram(pixelResult.data) : undefined;
    const backendResult = await tryBackendHuggingFaceInspection(pixelResult.base64DataUrl, categoryHint, colorHistogram);
    if (backendResult) {
      return backendResult;
    }
  } else if (typeof imageSource === 'string') {
    const backendResult = await tryBackendHuggingFaceInspection(imageSource, categoryHint);
    if (backendResult) {
      return backendResult;
    }
  }

  // 2. If Hugging Face API is unreachable/unconfigured:
  // DO NOT execute custom canvas pixel matrix algorithm.
  // Return explicit unavailable status without fake feature vector strings.
  return fallbackClassification(imageSource, categoryHint);
}

function fallbackClassification(
  _imageSource: string | HTMLImageElement,
  categoryHint: string = 'landslide'
): MLInspectionResult {
  return {
    is_hazard_environment: false,
    environment_type: categoryHint === 'water_seepage' ? 'water_seepage_body' : (categoryHint === 'road_blockage' || categoryHint === 'crack' ? 'rock_landslide_debris' : 'hill_mountain_slope'),
    confidence: 0.50,
    detected_features: ['Hugging Face Vision API Offline / Unconfigured'],
    decision: 'sent_to_admin_for_manual_inspection',
    message: 'Hugging Face AI screening is temporarily unavailable. Your report has been submitted for manual verification.',
    recommended_severity: 'moderate',
    analysisStatus: 'UNAVAILABLE',
    imageRelevance: 'UNKNOWN',
    possibleHazardType: 'UNKNOWN',
    hazardConfidence: 0,
    requiresHumanVerification: true,
  };
}
