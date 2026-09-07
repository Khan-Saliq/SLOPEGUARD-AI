const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Hugging Face Image Analysis Backend Service
 * Uses backend-only environment variables:
 * - HUGGINGFACE_API_KEY
 * - HUGGINGFACE_IMAGE_MODEL (default: google/vit-base-patch16-224)
 * - HUGGINGFACE_API_URL (default: https://api-inference.huggingface.co/models/)
 */

// Category mapping helper
const CATEGORY_KEYWORDS = {
  LANDSLIDE: ['landslide', 'mudslide', 'rockfall', 'avalanche', 'debris', 'soil displacement', 'quarry', 'fissure', 'earthquake'],
  ROAD_BLOCKAGE: ['road blockage', 'blocked road', 'debris mass', 'rockfall on road', 'collapsed road', 'highway obstruction', 'barricade', 'wreck', 'crash'],
  WATER_SEEPAGE: ['water seepage', 'stream', 'river', 'flood', 'hydraulic', 'waterbody', 'pore-water', 'muddy water', 'seashore', 'lake', 'dam', 'geyser', 'waterfall', 'lakefront', 'seacoast'],
  CRACK: ['crack', 'fissure', 'fracture', 'road crack', 'slope fissure', 'trench', 'crevice'],
  MOUNTAIN: ['mountain', 'hill', 'alp', 'promontory', 'cliff', 'valley', 'slope', 'ridge', 'peak', 'volcano'],
  FOREST: ['forest', 'tree', 'foliage', 'vegetation', 'jungle', 'woods'],
  SOIL: ['soil', 'mud', 'dirt', 'earth', 'ground', 'sand'],
  ROCK: ['rock', 'stone', 'boulder', 'outcrop'],
  BRIDGE: ['bridge', 'viaduct', 'overpass'],
  ROAD: ['road', 'highway', 'street', 'asphalt', 'pathway', 'thoroughfare'],
  DAMAGED_INFRASTRUCTURE: ['building collapse', 'damaged wall', 'broken structure', 'ruin'],
  HUMAN_PORTRAIT: [
    'person', 'human', 'face', 'portrait', 'selfie', 'man', 'woman', 'child', 'individual',
    'groom', 'bride', 'guy', 'girl', 'boy', 'suit', 'jersey', 't-shirt', 'trench coat',
    'wig', 'sunglasses', 'bow tie', 'necktie', 'academic gown', 'scuba diver'
  ],
  INDOOR: [
    'room', 'desk', 'table', 'chair', 'paper', 'document', 'envelope', 'office', 'furniture',
    'ceiling', 'wall', 'laptop', 'screen', 'binder', 'cardboard', 'monitor', 'keyboard',
    'space heater', 'coffee mug', 'carton', 'packet', 'website', 'book jacket', 'paper towel',
    'dining table', 'folding chair', 'bookcase', 'computer', 'television', 'cellular telephone'
  ],
};

function mapLabelsToHazardType(labels, categoryHint = 'landslide') {
  let isHazard = false;
  let isHumanPortrait = false;
  let isIndoor = false;
  let isOutdoorLandscape = false;
  let topHazardScore = 0;
  let possibleHazardType = 'UNKNOWN';

  for (const item of labels) {
    const labelLower = (item.label || '').toLowerCase();
    const confidence = Number(item.confidence || item.score) || 0;

    // Check Human Portrait / Selfie
    if (CATEGORY_KEYWORDS.HUMAN_PORTRAIT.some(kw => labelLower.includes(kw))) {
      if (confidence > 0.12) isHumanPortrait = true;
    }

    // Check Indoor / Document / Object
    if (CATEGORY_KEYWORDS.INDOOR.some(kw => labelLower.includes(kw))) {
      if (confidence > 0.15) isIndoor = true;
    }

    // Check Hazard Types
    if (CATEGORY_KEYWORDS.LANDSLIDE.some(kw => labelLower.includes(kw))) {
      isHazard = true;
      if (confidence > topHazardScore) {
        topHazardScore = confidence;
        possibleHazardType = 'POSSIBLE_LANDSLIDE';
      }
    }
    if (CATEGORY_KEYWORDS.ROAD_BLOCKAGE.some(kw => labelLower.includes(kw))) {
      isHazard = true;
      if (confidence > topHazardScore) {
        topHazardScore = confidence;
        possibleHazardType = 'POSSIBLE_ROAD_BLOCKAGE';
      }
    }
    if (CATEGORY_KEYWORDS.WATER_SEEPAGE.some(kw => labelLower.includes(kw))) {
      isHazard = true;
      if (confidence > topHazardScore) {
        topHazardScore = confidence;
        possibleHazardType = 'POSSIBLE_WATER_SEEPAGE';
      }
    }
    if (CATEGORY_KEYWORDS.CRACK.some(kw => labelLower.includes(kw))) {
      isHazard = true;
      if (confidence > topHazardScore) {
        topHazardScore = confidence;
        possibleHazardType = 'POSSIBLE_CRACK';
      }
    }

    // General Mountain / Road / Forest Outdoor Landscape
    if (
      CATEGORY_KEYWORDS.MOUNTAIN.some(kw => labelLower.includes(kw)) ||
      CATEGORY_KEYWORDS.ROAD.some(kw => labelLower.includes(kw)) ||
      CATEGORY_KEYWORDS.FOREST.some(kw => labelLower.includes(kw)) ||
      CATEGORY_KEYWORDS.ROCK.some(kw => labelLower.includes(kw))
    ) {
      if (confidence > 0.05) isOutdoorLandscape = true;
    }
  }

  // If outdoor terrain detected and no specific hazard label triggered, map categoryHint
  if (!isHazard && isOutdoorLandscape && !isHumanPortrait && !isIndoor) {
    isHazard = true;
    topHazardScore = 0.70;
    if (categoryHint === 'water_seepage') possibleHazardType = 'POSSIBLE_WATER_SEEPAGE';
    else if (categoryHint === 'road_blockage') possibleHazardType = 'POSSIBLE_ROAD_BLOCKAGE';
    else if (categoryHint === 'crack') possibleHazardType = 'POSSIBLE_CRACK';
    else possibleHazardType = 'POSSIBLE_LANDSLIDE';
  }

  // Determine Image Relevance & Hazard Status
  let imageRelevance = 'UNKNOWN';
  if (isHumanPortrait) {
    imageRelevance = 'IRRELEVANT';
    possibleHazardType = 'IRRELEVANT';
  } else if (isIndoor && !isHazard) {
    imageRelevance = 'IRRELEVANT';
    possibleHazardType = 'IRRELEVANT';
  } else if (isHazard || isOutdoorLandscape) {
    imageRelevance = topHazardScore > 0.75 ? 'RELEVANT' : 'POSSIBLY_RELEVANT';
  } else {
    // If not matching outdoor landscape or hazard
    imageRelevance = 'IRRELEVANT';
    possibleHazardType = 'IRRELEVANT';
  }

  return {
    imageRelevance,
    possibleHazardType: possibleHazardType === 'UNKNOWN' && isOutdoorLandscape ? 'NORMAL_LANDSCAPE' : possibleHazardType,
    hazardConfidence: Number((topHazardScore || (isHazard ? 0.72 : 0.05)).toFixed(2)),
  };
}

async function analyzeImageWithHuggingFace(imageSource, categoryHint = 'landslide') {
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  const modelName = process.env.HUGGINGFACE_IMAGE_MODEL || 'google/vit-base-patch16-224';
  const baseUrl = process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models/';
  const processedAt = new Date().toISOString();

  // Safe Fallback if API Key is unconfigured
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    console.warn('[HuggingFace Service] HUGGINGFACE_API_KEY is not configured in backend environment.');
    return {
      analysisStatus: 'UNAVAILABLE',
      imageRelevance: 'UNKNOWN',
      detectedLabels: [],
      possibleHazardType: 'UNKNOWN',
      hazardConfidence: 0,
      requiresHumanVerification: true,
      modelName: modelName || 'unconfigured',
      processedAt,
      errorMessage: 'AI screening is temporarily unavailable. Your report has been submitted for manual verification.',
      summaryMessage: 'AI screening is temporarily unavailable. Your report has been submitted for manual verification.',
    };
  }

  try {
    let imageBuffer = null;

    // 1. If buffer passed directly
    if (Buffer.isBuffer(imageSource)) {
      imageBuffer = imageSource;
    }
    // 2. If Base64 string passed
    else if (typeof imageSource === 'string' && imageSource.startsWith('data:image/')) {
      const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    // 3. If file path on disk passed
    else if (typeof imageSource === 'string' && (fs.existsSync(imageSource) || imageSource.startsWith('/') || imageSource.includes('uploads'))) {
      const fullPath = path.isAbsolute(imageSource) ? imageSource : path.join(__dirname, '..', imageSource.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        imageBuffer = fs.readFileSync(fullPath);
      }
    }

    if (!imageBuffer) {
      console.warn('[HuggingFace Service] Unable to resolve image buffer from provided source');
      return {
        analysisStatus: 'FAILED',
        imageRelevance: 'UNKNOWN',
        detectedLabels: [],
        possibleHazardType: 'UNKNOWN',
        hazardConfidence: 0,
        requiresHumanVerification: true,
        modelName,
        processedAt,
        errorMessage: 'Unable to parse image media stream. Submitted for manual verification.',
        summaryMessage: 'AI screening is temporarily unavailable. Your report has been submitted for manual verification.',
      };
    }

    const cleanToken = apiKey.trim();
    const endpoint = `${baseUrl.replace(/\/$/, '')}/${modelName}`;

    const response = await axios.post(endpoint, imageBuffer, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/octet-stream',
      },
      timeout: 12000,
    });

    const rawData = response.data;
    if (!Array.isArray(rawData)) {
      throw new Error('Invalid response structure from Hugging Face model');
    }

    const detectedLabels = rawData.slice(0, 5).map((item) => ({
      label: String(item.label || item.name || 'unknown'),
      confidence: Number((item.score || item.confidence || 0).toFixed(2)),
    }));

    const { imageRelevance, possibleHazardType, hazardConfidence } = mapLabelsToHazardType(
      detectedLabels,
      categoryHint
    );

    let summaryMessage = 'Possible hazard environment detected. Awaiting official verification.';
    if (possibleHazardType === 'POSSIBLE_LANDSLIDE') {
      summaryMessage = 'Possible landslide detected. Awaiting official verification.';
    } else if (possibleHazardType === 'POSSIBLE_ROAD_BLOCKAGE') {
      summaryMessage = 'Possible road blockage detected. Awaiting official verification.';
    } else if (possibleHazardType === 'POSSIBLE_WATER_SEEPAGE') {
      summaryMessage = 'Possible water seepage detected. Awaiting official verification.';
    } else if (imageRelevance === 'IRRELEVANT' || possibleHazardType === 'IRRELEVANT') {
      summaryMessage = 'This image may not be related to the selected hazard. You can still submit it for review.';
    }

    return {
      analysisStatus: 'COMPLETED',
      imageRelevance,
      detectedLabels,
      possibleHazardType,
      hazardConfidence,
      requiresHumanVerification: true,
      modelName,
      processedAt,
      summaryMessage,
    };
  } catch (err) {
    console.warn(`[HuggingFace Service] API call failed: ${err.message}`);
    return {
      analysisStatus: 'UNAVAILABLE',
      imageRelevance: 'UNKNOWN',
      detectedLabels: [],
      possibleHazardType: 'UNKNOWN',
      hazardConfidence: 0,
      requiresHumanVerification: true,
      modelName,
      processedAt,
      errorMessage: `Hugging Face API request failed: ${err.message}`,
      summaryMessage: 'AI screening is temporarily unavailable. Your report has been submitted for manual verification.',
    };
  }
}

module.exports = {
  analyzeImageWithHuggingFace,
};
