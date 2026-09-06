/**
 * ML Service Client
 * Communicates with the Python Flask XGBoost ML Service
 */

const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000';

/**
 * Check ML Service Health
 */
async function checkMLHealth() {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
    return res.data;
  } catch (err) {
    return { status: 'offline', model_loaded: false, error: err.message };
  }
}

/**
 * Predict risk from environmental features using XGBoost ML model
 *
 * Expected input:
 * {
 *   elevation: number,
 *   slope: number,
 *   rainfall_24h: number,
 *   rainfall_72h: number,
 *   rainfall_intensity: number,
 *   soil_moisture: number,
 *   satellite_indicator: number,
 *   historical_landslide_occurrence: number
 * }
 */
async function predictRisk(features) {
  try {
    const payload = {
      elevation: Number(features.elevation || 1000),
      slope: Number(features.slope || 35),
      rainfall_24h: Number(features.rainfall_24h || 0),
      rainfall_72h: Number(features.rainfall_72h || (features.rainfall_24h ? features.rainfall_24h * 1.5 : 0)),
      rainfall_intensity: Number(features.rainfall_intensity || (features.rainfall_24h ? features.rainfall_24h / 24 : 0)),
      soil_moisture: Number(features.soil_moisture || 50),
      satellite_indicator: Number(features.satellite_indicator || 50),
      historical_landslide_occurrence: Number(features.historical_landslide_occurrence || 50)
    };

    const res = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    return {
      ...res.data,
      source: 'xgboost_ml_model'
    };
  } catch (err) {
    console.warn(`[ML Client] Prediction service failed: ${err.message}. Using calibrated fallback.`);

    // Calibrated scientific fallback formula (replicates the physical susceptibility model)
    const slope = features.slope || 35;
    const rain24 = features.rainfall_24h || 0;
    const rain72 = features.rainfall_72h || rain24 * 1.5;
    const soil = features.soil_moisture || 50;
    const hist = features.historical_landslide_occurrence || 50;
    const sat = features.satellite_indicator || 50;

    const slopeNorm = Math.min(1, Math.max(0, slope / 55)) * 100;
    const rainNorm = Math.min(1, Math.max(0, rain24 / 200)) * 100;
    const rain72Norm = Math.min(1, Math.max(0, rain72 / 300)) * 100;

    const score = Math.round(
      0.25 * rainNorm +
      0.15 * rain72Norm +
      0.22 * soil +
      0.18 * slopeNorm +
      0.10 * hist +
      0.10 * sat
    );

    let risk_category = 'low';
    let risk_level = 0;
    if (score >= 80) { risk_category = 'critical'; risk_level = 3; }
    else if (score >= 60) { risk_category = 'high'; risk_level = 2; }
    else if (score >= 40) { risk_category = 'moderate'; risk_level = 1; }

    return {
      risk_level,
      risk_category,
      risk_score: score,
      confidence: 0.85,
      probabilities: {
        low: risk_level === 0 ? 0.85 : 0.05,
        moderate: risk_level === 1 ? 0.85 : 0.05,
        high: risk_level === 2 ? 0.85 : 0.05,
        critical: risk_level === 3 ? 0.85 : 0.05
      },
      model_version: 'fallback_v1.0.0',
      prediction_timestamp: new Date().toISOString(),
      source: 'calibrated_formula_fallback'
    };
  }
}

/**
 * Batch predict for multiple zones/locations
 */
async function predictBatch(locations) {
  try {
    const payload = {
      locations: locations.map(loc => ({
        id: loc.id || loc.name,
        elevation: Number(loc.elevation || 1000),
        slope: Number(loc.slope || 35),
        rainfall_24h: Number(loc.rainfall_24h || loc.rainfall || 0),
        rainfall_72h: Number(loc.rainfall_72h || (loc.rainfall ? loc.rainfall * 1.5 : 0)),
        rainfall_intensity: Number(loc.rainfall_intensity || (loc.rainfall ? loc.rainfall / 24 : 0)),
        soil_moisture: Number(loc.soilMoisture || loc.soil_moisture || 50),
        satellite_indicator: Number(loc.satelliteIndicator || loc.satellite_indicator || 50),
        historical_landslide_occurrence: Number(loc.historicalRisk || loc.historical_landslide_occurrence || 50)
      }))
    };

    const res = await axios.post(`${ML_SERVICE_URL}/predict/batch`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });

    return res.data;
  } catch (err) {
    console.warn(`[ML Client] Batch prediction failed: ${err.message}`);
    // Fall back to individual predictions
    const predictions = await Promise.all(locations.map(async loc => {
      const p = await predictRisk(loc);
      return {
        id: loc.id || loc.name,
        risk_level: p.risk_level,
        risk_category: p.risk_category,
        risk_score: p.risk_score,
        confidence: p.confidence
      };
    }));

    return {
      predictions,
      model_version: 'fallback_v1.0.0',
      prediction_timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  checkMLHealth,
  predictRisk,
  predictBatch
};
