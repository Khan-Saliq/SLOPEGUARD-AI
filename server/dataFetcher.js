/**
 * Environmental Data Fetching Service
 * Fetches real weather, rainfall, and terrain data for monitored locations
 */

const axios = require('axios');

/**
 * Fetch weather data from Open-Meteo API (free, no API key required)
 * https://open-meteo.com/en/docs
 */
async function fetchWeatherData(latitude, longitude) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast`;
    const params = {
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,precipitation,rain',
      hourly: 'precipitation,rain,soil_moisture_0_to_1cm',
      past_days: 3,
      timezone: 'auto'
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    // Calculate 24h and 72h cumulative rainfall
    const hourlyPrecip = data.hourly.precipitation || [];
    const last24h = hourlyPrecip.slice(-24);
    const last72h = hourlyPrecip.slice(-72);

    const rainfall_24h = last24h.reduce((sum, val) => sum + (val || 0), 0);
    const rainfall_72h = last72h.reduce((sum, val) => sum + (val || 0), 0);

    // Calculate rainfall intensity (mm/hour for last 24h)
    const rainfall_intensity = rainfall_24h / 24;

    // Get latest soil moisture reading
    const soilMoistureData = data.hourly.soil_moisture_0_to_1cm || [];
    const latestSoilMoisture = soilMoistureData[soilMoistureData.length - 1] || 50;
    // Convert from m³/m³ to percentage (approximately)
    const soil_moisture = Math.min(100, latestSoilMoisture * 100 * 2.5);

    return {
      rainfall_24h: parseFloat(rainfall_24h.toFixed(2)),
      rainfall_72h: parseFloat(rainfall_72h.toFixed(2)),
      rainfall_intensity: parseFloat(rainfall_intensity.toFixed(2)),
      soil_moisture: parseFloat(soil_moisture.toFixed(2)),
      temperature: data.current.temperature_2m || 22,
      humidity: data.current.relative_humidity_2m || 75,
      fetched_at: new Date().toISOString(),
      data_source: 'open-meteo'
    };
  } catch (error) {
    console.error(`Weather fetch error for (${latitude}, ${longitude}):`, error.message);
    return null;
  }
}

/**
 * Fetch elevation data from Open-Elevation API (free, no API key)
 * https://open-elevation.com/
 */
async function fetchElevationData(latitude, longitude) {
  try {
    const url = `https://api.open-elevation.com/api/v1/lookup`;
    const response = await axios.get(url, {
      params: {
        locations: `${latitude},${longitude}`
      }
    });

    const elevation = response.data.results[0].elevation;
    return {
      elevation: parseFloat(elevation.toFixed(1)),
      data_source: 'open-elevation'
    };
  } catch (error) {
    console.error(`Elevation fetch error for (${latitude}, ${longitude}):`, error.message);
    return null;
  }
}

/**
 * Calculate slope from elevation data of nearby points
 * Uses a simple 4-point gradient approximation
 */
async function calculateSlope(latitude, longitude, elevationData) {
  try {
    // If we already have slope data, return it
    if (elevationData && elevationData.slope !== undefined) {
      return elevationData.slope;
    }

    // Fetch elevation at 4 nearby points (~100m offset in each direction)
    const offset = 0.001; // approximately 100m
    const points = [
      { lat: latitude + offset, lng: longitude },
      { lat: latitude - offset, lng: longitude },
      { lat: latitude, lng: longitude + offset },
      { lat: latitude, lng: longitude - offset }
    ];

    const elevations = await Promise.all(
      points.map(p => fetchElevationData(p.lat, p.lng))
    );

    const centerElev = elevationData ? elevationData.elevation : 0;
    const validElevs = elevations.filter(e => e !== null).map(e => e.elevation);

    if (validElevs.length < 2) {
      // Cannot calculate slope, return default based on region
      return 30; // Default moderate slope for hilly regions
    }

    // Calculate max elevation difference
    const maxElev = Math.max(...validElevs, centerElev);
    const minElev = Math.min(...validElevs, centerElev);
    const elevDiff = maxElev - minElev;

    // Calculate slope in degrees
    const distance = 100; // meters (approximate)
    const slopeRadians = Math.atan(elevDiff / distance);
    const slopeDegrees = slopeRadians * (180 / Math.PI);

    return parseFloat(Math.min(75, slopeDegrees).toFixed(2));
  } catch (error) {
    console.error(`Slope calculation error:`, error.message);
    return 30; // Default fallback
  }
}

/**
 * Fetch complete environmental data for a location
 */
async function fetchEnvironmentalData(location) {
  const { lat, lng, historicalRisk = 50, satelliteIndicator = 50 } = location;

  console.log(`Fetching data for location: (${lat}, ${lng})`);

  // Fetch weather and elevation in parallel
  const [weatherData, elevationData] = await Promise.all([
    fetchWeatherData(lat, lng),
    fetchElevationData(lat, lng)
  ]);

  if (!weatherData || !elevationData) {
    console.error(`Failed to fetch complete data for location (${lat}, ${lng})`);
    return null;
  }

  // Calculate slope
  const slope = await calculateSlope(lat, lng, elevationData);

  return {
    latitude: lat,
    longitude: lng,
    elevation: elevationData.elevation,
    slope,
    rainfall_24h: weatherData.rainfall_24h,
    rainfall_72h: weatherData.rainfall_72h,
    rainfall_intensity: weatherData.rainfall_intensity,
    soil_moisture: weatherData.soil_moisture,
    satellite_indicator: satelliteIndicator,
    historical_landslide_occurrence: historicalRisk,
    temperature: weatherData.temperature,
    humidity: weatherData.humidity,
    fetched_at: weatherData.fetched_at,
    data_sources: {
      weather: 'open-meteo',
      elevation: 'open-elevation',
      slope: 'calculated',
      historical: 'database',
      satellite: 'database'
    }
  };
}

/**
 * Fetch environmental data for multiple locations (batch)
 */
async function fetchEnvironmentalDataBatch(locations, delayMs = 500) {
  const results = [];

  for (const location of locations) {
    const data = await fetchEnvironmentalData(location);
    if (data) {
      results.push({ ...location, environmentalData: data });
    }
    // Rate limiting to avoid API throttling
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

module.exports = {
  fetchWeatherData,
  fetchElevationData,
  calculateSlope,
  fetchEnvironmentalData,
  fetchEnvironmentalDataBatch
};
