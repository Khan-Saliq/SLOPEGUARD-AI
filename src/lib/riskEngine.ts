import type { DistrictSummary, RiskLevel, RiskZone } from '../types';

const WEIGHTS = {
  rainfall: 0.3,
  soilMoisture: 0.2,
  slope: 0.2,
  historical: 0.15,
  satellite: 0.15,
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateRiskScore(zone: Pick<RiskZone, 'rainfall' | 'soilMoisture' | 'slope' | 'historicalRisk' | 'satelliteIndicator'>) {
  const rainfallNorm = clamp(zone.rainfall / 200, 0, 1) * 100;
  const slopeNorm = clamp(zone.slope / 55, 0, 1) * 100;
  return Math.round(
    WEIGHTS.rainfall * rainfallNorm +
      WEIGHTS.soilMoisture * zone.soilMoisture +
      WEIGHTS.slope * slopeNorm +
      WEIGHTS.historical * zone.historicalRisk +
      WEIGHTS.satellite * zone.satelliteIndicator,
  );
}

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  return 'low';
}

export function applyRiskToZone(zone: RiskZone): RiskZone {
  const riskScore = calculateRiskScore(zone);
  return {
    ...zone,
    riskScore,
    riskLevel: scoreToLevel(riskScore),
    lastUpdated: new Date().toISOString(),
  };
}

export function jitter(value: number, delta: number, min: number, max: number) {
  return clamp(value + (Math.random() * 2 - 1) * delta, min, max);
}

export function recalcDistricts(zones: RiskZone[], districts: DistrictSummary[] = []): DistrictSummary[] {
  const districtMap = new Map<string, DistrictSummary>();

  // Initialize from base list if provided
  districts.forEach(d => {
    districtMap.set(d.name, { ...d, totalZones: 0, critical: 0, high: 0, moderate: 0, low: 0 });
  });

  // Dynamically derive district summaries from active risk zones
  zones.forEach(z => {
    const dName = z.location.district;
    if (!districtMap.has(dName)) {
      districtMap.set(dName, {
        name: dName,
        state: z.location.state,
        totalZones: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        activeAlerts: 1,
        blockedRoads: 1,
        isolatedVillages: 1,
        center: [z.location.lat, z.location.lng],
      });
    }

    const dist = districtMap.get(dName)!;
    dist.totalZones += 1;
    if (z.riskLevel === 'critical') dist.critical += 1;
    else if (z.riskLevel === 'high') dist.high += 1;
    else if (z.riskLevel === 'moderate') dist.moderate += 1;
    else dist.low += 1;
  });

  return Array.from(districtMap.values());
}

export function computeActionPriority(
  riskScore: number,
  aiConfidence: number,
  severityScore: number,
  trustScore: number,
) {
  return Math.round(
    0.35 * riskScore + 0.25 * aiConfidence + 0.2 * severityScore + 0.15 * 70 + 0.05 * trustScore,
  );
}

export function severityToScore(level: RiskLevel) {
  return { low: 25, moderate: 50, high: 75, critical: 95 }[level];
}
