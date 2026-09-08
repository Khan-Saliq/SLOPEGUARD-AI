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
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000, proxy: false });
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
      timeout: 5000,
      proxy: false
    });

    return {
      ...res.data,
      source: 'xgboost_ml_model'
    };
  } catch (err) {
    console.warn(`[ML Client] Prediction service unavailable: ${err.message}`);
    return {
      status: 'offline',
      prediction_available: false,
      message: 'AI prediction service is not configured',
      risk_score: null,
      risk_category: null,
      confidence: null
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
      timeout: 8000,
      proxy: false
    });

    return res.data;
  } catch (err) {
    console.warn(`[ML Client] Batch prediction unavailable: ${err.message}`);
    return {
      status: 'offline',
      prediction_available: false,
      message: 'AI prediction service is not configured',
      predictions: locations.map(loc => ({
        id: loc.id || loc.name,
        risk_level: null,
        risk_category: null,
        risk_score: null,
        confidence: null
      })),
      model_version: 'none',
      prediction_timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  checkMLHealth,
  predictRisk,
  predictBatch
};
