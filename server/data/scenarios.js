/**
 * Predefined Realistic Environmental Test Scenarios for ML Model Simulation & Testing
 * Based on historical landslide failure records (NER & Himalayan corridors)
 * NOTE: Inputs are passed through the actual ML model pipeline. Final risk scores are NEVER hardcoded.
 */

const TEST_SCENARIOS = [
  {
    id: 'scen-live-safe',
    name: 'Normal Baseline Weather (Safe Conditions)',
    modeLabel: 'Live / Baseline',
    location: { name: 'Upper Shillong Pass', lat: 25.54, lng: 91.87, district: 'East Khasi Hills', state: 'Meghalaya' },
    rainfall_24h: 12,
    rainfall_72h: 28,
    rainfall_intensity: 1.2,
    soil_moisture: 32,
    slope: 24,
    elevation: 1480,
    historicalRisk: 40,
    satelliteIndicator: 45,
    purpose: 'Verify that safe weather conditions produce Low/Moderate ML risk without generating false alerts.',
    roadConditions: [
      { roadId: 'r1', name: 'NH-44 Shillong-Silchar Highway', status: 'operational' },
      { roadId: 'r2', name: 'SH-1 Cherrapunji Access Road', status: 'operational' }
    ]
  },
  {
    id: 'scen-heavy-rain',
    name: 'Heavy Monsoon Precipitation Spurt',
    modeLabel: 'Heavy Rainfall',
    location: { name: 'Cherrapunji Sohra Slope Cut', lat: 25.27, lng: 91.73, district: 'East Khasi Hills', state: 'Meghalaya' },
    rainfall_24h: 145,
    rainfall_72h: 240,
    rainfall_intensity: 14.5,
    soil_moisture: 78,
    slope: 38,
    elevation: 1290,
    historicalRisk: 88,
    satelliteIndicator: 75,
    purpose: 'Test ML model response to heavy 24h rainfall (>100mm) and high soil moisture saturation.',
    roadConditions: [
      { roadId: 'r1', name: 'NH-44 Shillong-Silchar Highway', status: 'vulnerable' },
      { roadId: 'r2', name: 'SH-1 Cherrapunji Access Road', status: 'operational' }
    ]
  },
  {
    id: 'scen-extreme-storm',
    name: 'Extreme Cloudburst & Soil Saturation',
    modeLabel: 'Extreme Storm',
    location: { name: 'Kamrup Bypass Hill Corridor', lat: 26.14, lng: 91.73, district: 'Kamrup Metropolitan', state: 'Assam' },
    rainfall_24h: 260,
    rainfall_72h: 420,
    rainfall_intensity: 28.0,
    soil_moisture: 92,
    slope: 45,
    elevation: 850,
    historicalRisk: 90,
    satelliteIndicator: 82,
    purpose: 'Trigger actual ML Critical Risk classification and test automatic alert generation.',
    roadConditions: [
      { roadId: 'r1', name: 'NH-44 Shillong-Silchar Highway', status: 'blocked' },
      { roadId: 'r3', name: 'NH-37 Guwahati-Jorhat Highway', status: 'vulnerable' }
    ]
  },
  {
    id: 'scen-wayanad-2024',
    name: 'Historical Failure — Wayanad Chooralmala 2024 Event',
    modeLabel: 'Historical Disaster',
    location: { name: 'Chooralmala Slope Cut', lat: 11.68, lng: 76.13, district: 'Wayanad', state: 'Kerala' },
    rainfall_24h: 310,
    rainfall_72h: 572,
    rainfall_intensity: 32.5,
    soil_moisture: 96,
    slope: 48,
    elevation: 1150,
    historicalRisk: 95,
    satelliteIndicator: 90,
    purpose: 'Validate model against actual 2024 Wayanad catastrophe parameters (extreme rainfall + steep slope + saturated soil).',
    roadConditions: [
      { roadId: 'r1', name: 'Main Wayanad Access Road', status: 'blocked' },
      { roadId: 'r2', name: 'Chooralmala Bypass', status: 'damaged' }
    ]
  },
  {
    id: 'scen-steep-slope-cut',
    name: 'High Slope Cut & Steep Gradient Risk',
    modeLabel: 'Steep Topography',
    location: { name: 'Upper Gangtok Highway Cut', lat: 27.33, lng: 88.61, district: 'Gangtok', state: 'Sikkim' },
    rainfall_24h: 110,
    rainfall_72h: 180,
    rainfall_intensity: 11.0,
    soil_moisture: 72,
    slope: 54,
    elevation: 1650,
    historicalRisk: 92,
    satelliteIndicator: 80,
    purpose: 'Evaluate how steep slope gradient (>50°) combined with moderate rain increases ML hazard rating.',
    roadConditions: [
      { roadId: 'r4', name: 'NH-10 Gangtok-Siliguri Pass', status: 'blocked' }
    ]
  },
  {
    id: 'scen-blocked-route',
    name: 'Blocked Primary Arterial Road & Corridor Closure',
    modeLabel: 'Road Blockade',
    location: { name: 'NH-44 Highway Cut Corridor', lat: 25.57, lng: 91.88, district: 'East Khasi Hills', state: 'Meghalaya' },
    rainfall_24h: 180,
    rainfall_72h: 290,
    rainfall_intensity: 18.0,
    soil_moisture: 84,
    slope: 40,
    elevation: 1350,
    historicalRisk: 85,
    satelliteIndicator: 78,
    purpose: 'Test automatic safe route recalculation when primary highway is blocked by slope failure.',
    roadConditions: [
      { roadId: 'r1', name: 'NH-44 Shillong-Silchar Highway', status: 'blocked' },
      { roadId: 'r2', name: 'SH-1 Cherrapunji Access Road', status: 'blocked' }
    ]
  },
  {
    id: 'scen-all-roads-blocked',
    name: 'Complete Corridor Isolation (No Safe Route Available)',
    modeLabel: 'Isolation Crisis',
    location: { name: 'Sohra Mountain Village Corridor', lat: 25.27, lng: 91.73, district: 'East Khasi Hills', state: 'Meghalaya' },
    rainfall_24h: 320,
    rainfall_72h: 510,
    rainfall_intensity: 35.0,
    soil_moisture: 98,
    slope: 50,
    elevation: 1200,
    historicalRisk: 98,
    satelliteIndicator: 92,
    purpose: 'Test system fallback behavior when all candidate routes are blocked and no verified safe route is available.',
    roadConditions: [
      { roadId: 'r1', name: 'NH-44 Shillong-Silchar Highway', status: 'blocked' },
      { roadId: 'r2', name: 'SH-1 Cherrapunji Access Road', status: 'blocked' },
      { roadId: 'r3', name: 'NH-37 Guwahati-Jorhat Highway', status: 'blocked' }
    ]
  }
];

module.exports = { TEST_SCENARIOS };
