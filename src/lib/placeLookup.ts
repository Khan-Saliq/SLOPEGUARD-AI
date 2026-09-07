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
  // 0. North Eastern Region (NER) Major Cities & Vulnerable Districts Check
  if (lat >= 21.5 && lat <= 29.5 && lng >= 88.0 && lng <= 97.5) {
    // Shillong & East Khasi Hills (Meghalaya)
    if (lat >= 25.4 && lat <= 25.8 && lng >= 91.7 && lng <= 92.1) {
      return {
        name: 'Shillong Urban & East Khasi Slope',
        area: 'Laitlum & Shillong Ridge',
        city: 'Shillong',
        district: 'East Khasi Hills',
        state: 'Meghalaya',
        isSafe: false,
        score: 78,
        rainfall: 210,
        soilMoisture: 84,
        slope: 42,
        historicalRisk: 80,
        satelliteIndicator: 75,
        population: 143000,
        infra: 38,
      };
    }
    // Cherrapunji (Sohra) / Mawsynram (Meghalaya)
    if (lat >= 25.1 && lat <= 25.4 && lng >= 91.6 && lng <= 91.9) {
      return {
        name: 'Cherrapunji Sohra Cliff Sector',
        area: 'Nohkalikai & Mawsynram Belt',
        city: 'Cherrapunji',
        district: 'East Khasi Hills',
        state: 'Meghalaya',
        isSafe: false,
        score: 88,
        rainfall: 340,
        soilMoisture: 92,
        slope: 48,
        historicalRisk: 90,
        satelliteIndicator: 85,
        population: 18500,
        infra: 12,
      };
    }
    // Guwahati & Kamrup Metro (Assam)
    if (lat >= 26.0 && lat <= 26.3 && lng >= 91.5 && lng <= 92.0) {
      return {
        name: 'Guwahati City & Nilachal Hill Belt',
        area: 'Kamakhya & Khanapara Slopes',
        city: 'Guwahati',
        district: 'Kamrup Metro',
        state: 'Assam',
        isSafe: false,
        score: 64,
        rainfall: 135,
        soilMoisture: 68,
        slope: 34,
        historicalRisk: 62,
        satelliteIndicator: 60,
        population: 950000,
        infra: 120,
      };
    }
    // Gangtok & East Sikkim
    if (lat >= 27.2 && lat <= 27.5 && lng >= 88.5 && lng <= 88.8) {
      return {
        name: 'Gangtok Ridge & National Highway 10',
        area: 'Deorali & Tathangchen Slope',
        city: 'Gangtok',
        district: 'East Sikkim',
        state: 'Sikkim',
        isSafe: false,
        score: 82,
        rainfall: 195,
        soilMoisture: 88,
        slope: 46,
        historicalRisk: 85,
        satelliteIndicator: 80,
        population: 100000,
        infra: 28,
      };
    }
    // Aizawl & Central Mizoram
    if (lat >= 23.6 && lat <= 23.9 && lng >= 92.6 && lng <= 92.9) {
      return {
        name: 'Aizawl Ridge & Laipuitlang Slope',
        area: 'Chaltlang & Tuirial Corridor',
        city: 'Aizawl',
        district: 'Aizawl',
        state: 'Mizoram',
        isSafe: false,
        score: 72,
        rainfall: 160,
        soilMoisture: 74,
        slope: 44,
        historicalRisk: 70,
        satelliteIndicator: 68,
        population: 290000,
        infra: 45,
      };
    }
    // Kohima & Nagaland Highlands
    if (lat >= 25.5 && lat <= 25.8 && lng >= 94.0 && lng <= 94.3) {
      return {
        name: 'Kohima Bypass & Dzüko Valley Slope',
        area: 'Phesama & Kohima Town',
        city: 'Kohima',
        district: 'Kohima',
        state: 'Nagaland',
        isSafe: false,
        score: 68,
        rainfall: 145,
        soilMoisture: 72,
        slope: 40,
        historicalRisk: 66,
        satelliteIndicator: 62,
        population: 115000,
        infra: 22,
      };
    }
    // Imphal & Manipur Valley/Hills
    if (lat >= 24.7 && lat <= 25.0 && lng >= 93.8 && lng <= 94.2) {
      return {
        name: 'Imphal West & Kangchup Slope',
        area: 'Langol Hills & NH-37 Corridor',
        city: 'Imphal',
        district: 'Imphal West',
        state: 'Manipur',
        isSafe: false,
        score: 65,
        rainfall: 140,
        soilMoisture: 70,
        slope: 36,
        historicalRisk: 64,
        satelliteIndicator: 60,
        population: 265000,
        infra: 32,
      };
    }
    // Agartala & West Tripura
    if (lat >= 23.7 && lat <= 24.0 && lng >= 91.1 && lng <= 91.5) {
      return {
        name: 'Agartala Urban & Baramura Hill',
        area: 'Baramura Ridge Sector',
        city: 'Agartala',
        district: 'West Tripura',
        state: 'Tripura',
        isSafe: true,
        score: 28,
        rainfall: 85,
        soilMoisture: 42,
        slope: 22,
        historicalRisk: 25,
        satelliteIndicator: 20,
        population: 400000,
        infra: 65,
      };
    }
    // Itanagar / Tawang (Arunachal Pradesh)
    if (lat >= 27.0 && lat <= 27.8 && lng >= 91.8 && lng <= 93.8) {
      return {
        name: 'Itanagar Capital & Sela Pass Sector',
        area: 'Papum Pare & Tawang Highway',
        city: 'Itanagar',
        district: 'Papum Pare',
        state: 'Arunachal Pradesh',
        isSafe: false,
        score: 75,
        rainfall: 180,
        soilMoisture: 80,
        slope: 45,
        historicalRisk: 72,
        satelliteIndicator: 70,
        population: 60000,
        infra: 18,
      };
    }
  }

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
