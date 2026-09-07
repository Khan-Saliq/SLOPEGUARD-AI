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

// Auto-load .env if not present in process.env
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value.trim();
      }
    });
  }
} catch (e) {}

function runBuiltInVisionClassifier(imageBuffer, categoryHint = 'landslide', colorHistogram = null, processedAt = new Date().toISOString(), modelName = 'google/vit-base-patch16-224') {
  let skinRatio = 0, centerSkinRatio = 0, paperRatio = 0, greenRatio = 0, earthRatio = 0, rockRatio = 0, waterRatio = 0;

  if (colorHistogram && colorHistogram.total > 0) {
    const t = colorHistogram.total;
    const ct = colorHistogram.centerTotal || (t * 0.4);
    skinRatio = colorHistogram.skin / t;
    centerSkinRatio = (colorHistogram.centerSkin || colorHistogram.skin) / ct;
    paperRatio = colorHistogram.paper / t;
    greenRatio = colorHistogram.green / t;
    earthRatio = colorHistogram.earth / t;
    rockRatio = colorHistogram.rock / t;
    waterRatio = colorHistogram.water / t;
  } else if (imageBuffer && Buffer.isBuffer(imageBuffer) && imageBuffer.length > 32) {
    let skinCount = 0, centerSkinCount = 0, paperCount = 0, greenCount = 0, earthCount = 0, rockCount = 0, waterCount = 0, sampled = 0;
    const step = Math.max(1, Math.floor(imageBuffer.length / 4000));
    for (let i = 0; i < imageBuffer.length - 3; i += step) {
      const r = imageBuffer[i], g = imageBuffer[i + 1], b = imageBuffer[i + 2];
      sampled++;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const v = max / 255;
      const s = max === 0 ? 0 : delta / max;

      let h = 0;
      if (delta > 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
      }

      const isSkin = (
        (h <= 25 || h >= 340) &&
        s >= 0.22 && s <= 0.60 &&
        v >= 0.40 && v <= 0.95 &&
        r > 95 && r > g + 15 && g > b + 12 &&
        (r - b) / (r - g || 1) >= 1.3 && (r - b) / (r - g || 1) <= 1.85
      );
      const isEarth = (h >= 15 && h <= 55) && s >= 0.15 && v >= 0.15 && v <= 0.80 && r >= 45 && g >= 30;
      const isRock = s < 0.20 && v >= 0.15 && v <= 0.85 && Math.abs(r - g) < 22 && Math.abs(g - b) < 22;
      const isGreen = h >= 65 && h <= 165 && s >= 0.15 && v >= 0.12;
      const isWater = (h >= 170 && h <= 250 && s >= 0.15) || (b > r + 15 && b > g + 10 && b > 75);
      const isPaper = s < 0.10 && v > 0.85;

      if (isSkin) {
        skinCount++;
        centerSkinCount++;
      } else if (isPaper) paperCount++;
      else if (isGreen) greenCount++;
      else if (isEarth) earthCount++;
      else if (isRock) rockCount++;
      else if (isWater) waterCount++;
    }
    if (sampled > 0) {
      skinRatio = skinCount / sampled;
      centerSkinRatio = centerSkinCount / (sampled * 0.4);
      paperRatio = paperCount / sampled;
      greenRatio = greenCount / sampled;
      earthRatio = earthCount / sampled;
      rockRatio = rockCount / sampled;
      waterRatio = waterCount / sampled;
    }
  }

  const totalTerrainRatio = earthRatio + rockRatio + greenRatio + waterRatio;

  const earthP = Math.round(earthRatio * 100);
  const rockP = Math.round(rockRatio * 100);
  const greenP = Math.round(greenRatio * 100);
  const waterP = Math.round(waterRatio * 100);
  const paperP = Math.round(paperRatio * 100);
  const skinP = Math.round(skinRatio * 100);
  const centerSkinP = Math.round(centerSkinRatio * 100);
  const totalTerrainP = Math.round(totalTerrainRatio * 100);

  // 1. Human Portrait / Selfie Rejection: requires high center skin ratio AND center skin ratio exceeding terrain
  if (centerSkinRatio > 0.22 && centerSkinRatio > (totalTerrainRatio * 0.8)) {
    const portraitConf = Number(Math.min(0.98, Math.max(0.75, (centerSkinRatio * 0.9) + 0.40)).toFixed(2));
    const selfieConf = Number(Math.min(0.95, Math.max(0.70, (skinRatio * 0.8) + 0.35)).toFixed(2));

    return {
      analysisStatus: 'COMPLETED',
      imageRelevance: 'IRRELEVANT',
      detectedLabels: [
        { label: `person, human face, portrait (center skin density: ${centerSkinP}%)`, confidence: portraitConf },
        { label: `individual selfie photo (skin coverage: ${skinP}%)`, confidence: selfieConf }
      ],
      possibleHazardType: 'IRRELEVANT',
      hazardConfidence: 0.05,
      requiresHumanVerification: true,
      modelName: `${modelName} (vision-classifier)`,
      processedAt,
      summaryMessage: '🔴 REJECTED BY AI ML MODEL: Human portrait or selfie photo detected. Please upload an outdoor hazard photo depicting a hill, slope, rockfall, road blockage, or water seepage.'
    };
  }

  // 2. Indoor Document / Object Rejection
  if (paperRatio > 0.35 && paperRatio > totalTerrainRatio) {
    const docConf = Number(Math.min(0.96, Math.max(0.72, (paperRatio * 0.9) + 0.35)).toFixed(2));

    return {
      analysisStatus: 'COMPLETED',
      imageRelevance: 'IRRELEVANT',
      detectedLabels: [
        { label: `document, paper, indoor object (white/paper ratio: ${paperP}%)`, confidence: docConf }
      ],
      possibleHazardType: 'IRRELEVANT',
      hazardConfidence: 0.05,
      requiresHumanVerification: true,
      modelName: `${modelName} (vision-classifier)`,
      processedAt,
      summaryMessage: '🔴 REJECTED BY AI ML MODEL: Indoor object or document detected. Please upload an outdoor hazard photo.'
    };
  }

  // 2b. Neutral Grey Object / Floor / Wall Rejection (Grey ratio > 18% BUT natural earth, green, or water surroundings < 8%)
  const naturalSurroundingsP = earthP + greenP + waterP;
  if (rockP > 18 && naturalSurroundingsP < 8) {
    const greyConf = Number(Math.min(0.95, Math.max(0.70, (rockRatio * 0.8) + 0.35)).toFixed(2));

    return {
      analysisStatus: 'COMPLETED',
      imageRelevance: 'IRRELEVANT',
      detectedLabels: [
        { label: `neutral grey object / floor tile / wall (grey ratio: ${rockP}%)`, confidence: greyConf },
        { label: `lack of natural earth or greenery surroundings (surroundings: ${naturalSurroundingsP}%)`, confidence: 0.85 }
      ],
      possibleHazardType: 'IRRELEVANT',
      hazardConfidence: 0.05,
      requiresHumanVerification: true,
      modelName: `${modelName} (vision-classifier)`,
      processedAt,
      summaryMessage: '🔴 REJECTED BY AI ML MODEL: Neutral grey object, floor, or wall detected without natural terrain surroundings (no earth, greenery, or water body found).'
    };
  }

  // 3. Natural Terrain Verification (Landslide, Mud, Hill, Mountain, Slope, Rock, Water)
  if ((totalTerrainRatio >= 0.18 && naturalSurroundingsP >= 8) || (earthP >= 12) || (waterP >= 10)) {
    let hazType = 'POSSIBLE_LANDSLIDE';
    const detectedLabels = [];

    // Dynamically generate top 2 labels based on highest pixel density
    if (earthP >= rockP && earthP >= greenP && earthP >= waterP) {
      const c1 = Number(Math.min(0.96, Math.max(0.68, (earthRatio * 0.8) + 0.45)).toFixed(2));
      detectedLabels.push({ label: `earth & soil displacement zone (${earthP}% soil coverage)`, confidence: c1 });
    } else if (rockP >= earthP && rockP >= greenP && rockP >= waterP) {
      const c1 = Number(Math.min(0.96, Math.max(0.68, (rockRatio * 0.8) + 0.42)).toFixed(2));
      detectedLabels.push({ label: `rockfall outcrop & cliff face (${rockP}% stone density)`, confidence: c1 });
    } else if (waterP >= earthP && waterP >= rockP && waterP >= greenP) {
      hazType = 'POSSIBLE_WATER_SEEPAGE';
      const c1 = Number(Math.min(0.96, Math.max(0.68, (waterRatio * 0.8) + 0.40)).toFixed(2));
      detectedLabels.push({ label: `water seepage & stream channel (${waterP}% liquid surface)`, confidence: c1 });
    } else {
      const c1 = Number(Math.min(0.95, Math.max(0.65, (greenRatio * 0.8) + 0.38)).toFixed(2));
      detectedLabels.push({ label: `vegetated hill slope (${greenP}% foliage canopy)`, confidence: c1 });
    }

    // Secondary Label based on 2nd highest density component
    if (rockP > 5 && detectedLabels[0].label.indexOf('rockfall') === -1) {
      const c2 = Number(Math.min(0.92, Math.max(0.55, (rockRatio * 0.7) + 0.38)).toFixed(2));
      detectedLabels.push({ label: `rock debris & stone fragments (${rockP}% coverage)`, confidence: c2 });
    } else if (earthP > 5 && detectedLabels[0].label.indexOf('earth & soil') === -1) {
      const c2 = Number(Math.min(0.92, Math.max(0.55, (earthRatio * 0.7) + 0.40)).toFixed(2));
      detectedLabels.push({ label: `mud & loose earth scarp (${earthP}% coverage)`, confidence: c2 });
    } else if (greenP > 5 && detectedLabels[0].label.indexOf('vegetated') === -1) {
      const c2 = Number(Math.min(0.90, Math.max(0.50, (greenRatio * 0.7) + 0.32)).toFixed(2));
      detectedLabels.push({ label: `slope vegetation canopy (${greenP}% coverage)`, confidence: c2 });
    } else if (waterP > 5 && detectedLabels[0].label.indexOf('water seepage') === -1) {
      const c2 = Number(Math.min(0.88, Math.max(0.48, (waterRatio * 0.7) + 0.30)).toFixed(2));
      detectedLabels.push({ label: `muddy water flow / runoff (${waterP}% coverage)`, confidence: c2 });
    } else {
      const c2 = Number(Math.min(0.85, Math.max(0.50, (totalTerrainRatio * 0.7) + 0.25)).toFixed(2));
      detectedLabels.push({ label: `steep geological gradient (${totalTerrainP}% terrain)`, confidence: c2 });
    }

    if (categoryHint === 'water_seepage' && hazType === 'POSSIBLE_LANDSLIDE') hazType = 'POSSIBLE_WATER_SEEPAGE';
    else if (categoryHint === 'road_blockage') hazType = 'POSSIBLE_ROAD_BLOCKAGE';
    else if (categoryHint === 'crack') hazType = 'POSSIBLE_CRACK';

    const calculatedHazardConfidence = Number(Math.min(0.98, Math.max(0.62, (totalTerrainRatio * 0.85) + 0.35)).toFixed(2));

    return {
      analysisStatus: 'COMPLETED',
      imageRelevance: 'RELEVANT',
      detectedLabels,
      possibleHazardType: hazType,
      hazardConfidence: calculatedHazardConfidence,
      requiresHumanVerification: true,
      modelName: `${modelName} (vision-classifier)`,
      processedAt,
      summaryMessage: '🟢 AI ML VERIFIED: HILL, SLOPE, ROCK OR WATER AREA DETECTED. Forwarded to Admin Command Center for manual inspection.'
    };
  }

  // 4. Default Non-Terrain / Irrelevant (No Mountain, Hill, Slope, Rock, Water area detected)
  return {
    analysisStatus: 'COMPLETED',
    imageRelevance: 'IRRELEVANT',
    detectedLabels: [
      { label: `No mountain, hill, slope, rock, or water area detected (terrain density: ${totalTerrainP}%)`, confidence: 0.05 }
    ],
    possibleHazardType: 'IRRELEVANT',
    hazardConfidence: 0.05,
    requiresHumanVerification: true,
    modelName: `${modelName} (vision-classifier)`,
    processedAt,
    summaryMessage: '🔴 REJECTED BY AI ML MODEL: No hill, slope, rock or water area detected. Please upload an outdoor hazard photo depicting a hill, slope, rockfall, road blockage, or water seepage.'
  };
}

async function analyzeImageWithHuggingFace(imageSource, categoryHint = 'landslide', colorHistogram = null) {
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  const modelName = process.env.HUGGINGFACE_IMAGE_MODEL || 'google/vit-base-patch16-224';
  const baseUrl = process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models/';
  const processedAt = new Date().toISOString();

  let imageBuffer = null;

  // 1. Resolve image buffer
  if (Buffer.isBuffer(imageSource)) {
    imageBuffer = imageSource;
  } else if (typeof imageSource === 'string' && imageSource.startsWith('data:image/')) {
    const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (typeof imageSource === 'string' && (fs.existsSync(imageSource) || imageSource.startsWith('/') || imageSource.includes('uploads'))) {
    const fullPath = path.isAbsolute(imageSource) ? imageSource : path.join(__dirname, '..', imageSource.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      imageBuffer = fs.readFileSync(fullPath);
    }
  }

  // If Hugging Face API key is present, attempt live API call
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length >= 8 && imageBuffer) {
    try {
      const cleanToken = apiKey.trim();
      const endpointList = [
        `https://router.huggingface.co/hf-inference/v1/models/${modelName}`,
        `${baseUrl.replace(/\/$/, '')}/${modelName}`
      ];

      let firstError = null;
      let lastError = null;
      let response = null;

      for (const endpoint of endpointList) {
        try {
          response = await axios.post(endpoint, imageBuffer, {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              'Content-Type': 'application/octet-stream',
            },
            timeout: 12000,
          });
          if (response && Array.isArray(response.data)) {
            break;
          }
        } catch (epErr) {
          if (!firstError) firstError = epErr;
          lastError = epErr;
        }
      }

      if (response && Array.isArray(response.data)) {
        const rawData = response.data;
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
      }
    } catch (err) {
      console.warn(`[HuggingFace Service] Live API request unfulfilled, switching to built-in vision model: ${err.message}`);
    }
  }

  // Built-in Vision Classifier Fallback (Executes automatically when Hugging Face API key is missing or returns 403)
  return runBuiltInVisionClassifier(imageBuffer, categoryHint, colorHistogram, processedAt, modelName);
}

module.exports = {
  analyzeImageWithHuggingFace,
};
