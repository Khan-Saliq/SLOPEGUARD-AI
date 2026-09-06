import type { RiskZone } from '../types';

export function lookupPlaceName(lat: number, lng: number): {
  name: string;
  area: string;
  city: string;
  district: string;
  state: string;
  isSafe: boolean;
  score: number;
  rainfall: number;
  soilMoisture: number;
  slope: number;
  historicalRisk: number;
  satelliteIndicator: number;
  population: number;
  infra: number;
} {
  // 1. Kashmir & Northern Himalayan Belt Check (Lat 32.5 - 35.5, Lng 73.5 - 77.0)
  if (lat >= 32.5 && lat <= 35.5 && lng >= 73.5 && lng <= 77.0) {
    // Pahalgam & Anantnag sector
    if (lat >= 33.8 && lat <= 34.3 && lng >= 75.0 && lng <= 75.6) {
      return {
        name: 'Pahalgam Valley & Lidder Sector',
        area: 'Pahalgam Lidder Valley',
        city: 'Pahalgam',
        district: 'Anantnag',
        state: 'Jammu & Kashmir',
        isSafe: true,
        score: 12,
        rainfall: 8,
        soilMoisture: 22,
        slope: 24,
        historicalRisk: 14,
        satelliteIndicator: 10,
        population: 12800,
        infra: 8,
      };
    }
    // Gulmarg & Baramulla sector
    if (lat >= 34.0 && lat <= 34.3 && lng >= 74.2 && lng <= 74.8) {
      return {
        name: 'Gulmarg Meadow & Affarwat Slope',
        area: 'Gulmarg Highlands',
        city: 'Gulmarg',
        district: 'Baramulla',
        state: 'Jammu & Kashmir',
        isSafe: true,
        score: 16,
        rainfall: 14,
        soilMoisture: 28,
        slope: 32,
        historicalRisk: 18,
        satelliteIndicator: 14,
        population: 4200,
        infra: 6,
      };
    }
    // Srinagar & Dal Lake sector
    if (lat >= 34.0 && lat <= 34.2 && lng >= 74.7 && lng <= 75.0) {
      return {
        name: 'Srinagar Urban Basin',
        area: 'Dal Lake Slope',
        city: 'Srinagar',
        district: 'Srinagar',
        state: 'Jammu & Kashmir',
        isSafe: true,
        score: 14,
        rainfall: 10,
        soilMoisture: 24,
        slope: 18,
        historicalRisk: 15,
        satelliteIndicator: 12,
        population: 125000,
        infra: 45,
      };
    }
    // Sonamarg / Zojila Pass sector
    if (lat >= 34.2 && lat <= 34.5 && lng >= 75.1 && lng <= 75.6) {
      return {
        name: 'Sonamarg Zojila Pass Corridor',
        area: 'Sonamarg Pass',
        city: 'Sonamarg',
        district: 'Ganderbal',
        state: 'Jammu & Kashmir',
        isSafe: true,
        score: 24,
        rainfall: 18,
        soilMoisture: 32,
        slope: 38,
        historicalRisk: 25,
        satelliteIndicator: 20,
        population: 3100,
        infra: 5,
      };
    }
    // Generic Kashmir Valley fallback
    return {
      name: `Kashmir Sector (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      area: 'Kashmir Hill Corridor',
      city: 'Kashmir Valley',
      district: 'Anantnag / Baramulla Sector',
      state: 'Jammu & Kashmir',
      isSafe: true,
      score: 15,
      rainfall: 12,
      soilMoisture: 25,
      slope: 26,
      historicalRisk: 16,
      satelliteIndicator: 12,
      population: 15000,
      infra: 10,
    };
  }

  // 2. Ladakh High Altitude Cold Desert (Lat 33.0 - 36.0, Lng 76.5 - 79.5)
  if (lat >= 33.0 && lat <= 36.0 && lng >= 76.5 && lng <= 79.5) {
    return {
      name: `Leh Ladakh Pass (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      area: 'High Altitude Plateau',
      city: 'Leh',
      district: 'Leh Ladakh',
      state: 'Ladakh',
      isSafe: true,
      score: 10,
      rainfall: 4,
      soilMoisture: 16,
      slope: 28,
      historicalRisk: 10,
      satelliteIndicator: 8,
      population: 9200,
      infra: 5,
    };
  }

  // 3. Himachal Pradesh Sector (Lat 30.5 - 33.2, Lng 75.5 - 79.0)
  if (lat >= 30.5 && lat <= 33.2 && lng >= 75.5 && lng <= 79.0) {
    return {
      name: `Himachal Hill Sector (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      area: 'Kullu / Shimla Valley',
      city: 'Manali / Shimla Corridor',
      district: 'Himachal Pradesh Region',
      state: 'Himachal Pradesh',
      isSafe: true,
      score: 22,
      rainfall: 20,
      soilMoisture: 35,
      slope: 34,
      historicalRisk: 22,
      satelliteIndicator: 18,
      population: 12000,
      infra: 11,
    };
  }

  // 4. Uttarakhand Sector (Lat 28.5 - 31.5, Lng 77.5 - 81.5)
  if (lat >= 28.5 && lat <= 31.5 && lng >= 77.5 && lng <= 81.5) {
    return {
      name: `Uttarakhand Valley Sector (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      area: 'Garhwal / Kumaon Corridor',
      city: 'Nainital / Mussoorie Pass',
      district: 'Uttarakhand Region',
      state: 'Uttarakhand',
      isSafe: true,
      score: 20,
      rainfall: 18,
      soilMoisture: 32,
      slope: 32,
      historicalRisk: 20,
      satelliteIndicator: 16,
      population: 14500,
      infra: 12,
    };
  }

  // 5. Western Ghats Sector (Lat 8.0 - 16.0, Lng 73.0 - 77.5)
  if (lat >= 8.0 && lat <= 16.0 && lng >= 73.0 && lng <= 77.5) {
    return {
      name: `Western Ghats Hill Corridor (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      area: 'High Range Slope',
      city: 'Munnar / Wayanad Pass',
      district: 'Western Ghats Sector',
      state: 'Kerala / Tamil Nadu',
      isSafe: true,
      score: 18,
      rainfall: 16,
      soilMoisture: 36,
      slope: 28,
      historicalRisk: 18,
      satelliteIndicator: 15,
      population: 9800,
      infra: 8,
    };
  }

  // 6. Generic Fallback for ANY clicked location on Earth
  return {
    name: `Monitored Location (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
    area: `Coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
    city: 'Local Hill Sector',
    district: 'Monitored Region',
    state: 'India Spatial Sector',
    isSafe: true,
    score: 15,
    rainfall: 12,
    soilMoisture: 26,
    slope: 22,
    historicalRisk: 14,
    satelliteIndicator: 12,
    population: 6500,
    infra: 6,
  };
}

export function createDynamicRiskZone(lat: number, lng: number): RiskZone {
  const placeInfo = lookupPlaceName(lat, lng);
  return {
    id: `click-zone-${lat.toFixed(3)}-${lng.toFixed(3)}`,
    name: placeInfo.name,
    location: {
      lat,
      lng,
      area: placeInfo.area,
      city: placeInfo.city,
      district: placeInfo.district,
      state: placeInfo.state,
    },
    riskLevel: placeInfo.isSafe ? 'low' : 'moderate',
    riskScore: placeInfo.score,
    rainfall: placeInfo.rainfall,
    soilMoisture: placeInfo.soilMoisture,
    slope: placeInfo.slope,
    historicalRisk: placeInfo.historicalRisk,
    satelliteIndicator: placeInfo.satelliteIndicator,
    population: placeInfo.population,
    infrastructureCount: placeInfo.infra,
    lastUpdated: new Date().toISOString(),
  };
}
