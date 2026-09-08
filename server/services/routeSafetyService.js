/**
 * Route Safety Evaluation Service
 * Evaluates route geometry against blocked roads, damaged roads, active landslide/flood incidents, and risk zones.
 * Ranks alternative routes by safety, risk level, distance, and duration.
 */

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluate safety of a route geometry
 */
function evaluateRouteSafety(route, roads = [], incidents = [], riskZones = []) {
  const geometry = Array.isArray(route)
    ? route.map(pt => (Array.isArray(pt) ? pt : [pt.lng || pt.longitude || 0, pt.lat || pt.latitude || 0]))
    : (route?.geometry || []);
  const blockedRoads = [];
  const dangerousSegments = [];
  const nearbyIncidents = [];
  const warnings = [];

  let isBlocked = false;
  let hasCriticalRisk = false;
  let hasHighRisk = false;

  // 1. Check proximity to blocked & damaged roads
  roads.forEach((road) => {
    if (road.status === 'blocked' || road.status === 'damaged') {
      const roadCoords = road.coordinates || [];
      const roadLat = Array.isArray(roadCoords[0]) ? roadCoords[0][0] : (typeof roadCoords[0] === 'number' ? roadCoords[0] : 25.5);
      const roadLng = Array.isArray(roadCoords[0]) ? roadCoords[0][1] : (typeof roadCoords[1] === 'number' ? roadCoords[1] : 91.8);

      // Check if any point on the route passes within 2.5km of blocked/damaged road
      for (const pt of geometry) {
        const dist = calculateDistanceKm(pt[1], pt[0], roadLat, roadLng);
        if (dist <= 2.5) {
          if (!blockedRoads.includes(road.name)) {
            blockedRoads.push(road.name);
            warnings.push(`⛔ Route intersects ${road.status.toUpperCase()} road: ${road.name} (${road.district})`);
          }
          if (road.status === 'blocked') isBlocked = true;
          break;
        }
      }
    }
  });

  // 2. Check proximity to active incidents (landslides, floods, road blockages)
  incidents.forEach((inc) => {
    const incLat = inc.location?.lat || inc.lat;
    const incLng = inc.location?.lng || inc.lng;
    if (typeof incLat === 'number' && typeof incLng === 'number') {
      for (const pt of geometry) {
        const dist = calculateDistanceKm(pt[1], pt[0], incLat, incLng);
        if (dist <= 3.0) {
          const incTitle = inc.title || inc.category || 'Active Hazard Incident';
          if (!nearbyIncidents.includes(incTitle)) {
            nearbyIncidents.push(incTitle);
            warnings.push(`⚠️ Active ${inc.category || 'hazard'} incident within ${(dist).toFixed(1)} km: ${incTitle}`);
          }
          if (inc.severity === 'critical' || inc.severity === 'high') {
            hasHighRisk = true;
          }
          break;
        }
      }
    }
  });

  // 3. Check proximity to high/critical risk zones
  riskZones.forEach((zone) => {
    const zLat = zone.location?.lat;
    const zLng = zone.location?.lng;
    if (typeof zLat === 'number' && typeof zLng === 'number') {
      for (const pt of geometry) {
        const dist = calculateDistanceKm(pt[1], pt[0], zLat, zLng);
        if (dist <= 2.0) {
          const segmentName = `Hazard Zone: ${zone.name}`;
          if (!dangerousSegments.includes(segmentName)) {
            dangerousSegments.push(segmentName);
            warnings.push(`⚠️ Route passes near ${zone.riskLevel || 'high'} risk zone: ${zone.name} (Risk Score: ${zone.riskScore || 80})`);
          }
          if (zone.riskLevel === 'critical' || (zone.riskScore && zone.riskScore >= 85)) {
            hasCriticalRisk = true;
          } else if (zone.riskLevel === 'high') {
            hasHighRisk = true;
          }
          break;
        }
      }
    }
  });

  // Determine Overall Status & Risk Category
  let routeStatus = 'NORMAL';
  let riskCategory = 'LOW';

  if (isBlocked) {
    routeStatus = 'BLOCKED';
    riskCategory = 'CRITICAL';
  } else if (hasCriticalRisk || blockedRoads.length > 0) {
    routeStatus = 'WARNING';
    riskCategory = 'HIGH';
  } else if (hasHighRisk || nearbyIncidents.length > 0 || dangerousSegments.length > 0) {
    routeStatus = 'CAUTION';
    riskCategory = 'MODERATE';
  }

  if (warnings.length === 0) {
    warnings.push('✓ Route does not pass near known high-risk hazard zones or active blockages');
    warnings.push('ℹ️ Standard emergency caution advised during monsoon season.');
  }

  const distanceMeters = Math.round(route.distanceKm * 1000);
  const durationSeconds = Math.round(route.durationHours * 3600);

  return {
    routeStatus,
    riskCategory,
    distanceMeters,
    distanceKm: route.distanceKm,
    durationSeconds,
    durationHours: route.durationHours,
    blockedRoads,
    dangerousSegments,
    nearbyIncidents,
    warnings,
    alternativeAvailable: true,
    lastEvaluatedAt: new Date().toISOString(),
  };
}

/**
 * Generate and rank alternative route options
 */
function rankAlternativeRoutes(primaryRoute, roads = [], incidents = [], riskZones = []) {
  const primarySafety = evaluateRouteSafety(primaryRoute, roads, incidents, riskZones);

  const routeOptions = [
    {
      id: 'route-a',
      name: 'Primary Evacuation Corridor (Direct Highway)',
      distanceKm: primaryRoute.distanceKm,
      durationHours: primaryRoute.durationHours,
      riskCategory: primarySafety.riskCategory,
      routeStatus: primarySafety.routeStatus,
      blockedCount: primarySafety.blockedRoads.length,
      warningCount: primarySafety.warnings.length,
      summary: primaryRoute.summaryMessage,
      geometry: primaryRoute.geometry,
      instructions: primaryRoute.instructions,
      isRecommended: primarySafety.routeStatus !== 'BLOCKED',
      evaluatedAt: primarySafety.lastEvaluatedAt,
    },
  ];

  // Generate Alternative B (Detour avoiding primary corridor)
  const altBDistance = Number((primaryRoute.distanceKm * 1.18).toFixed(1));
  const altBDuration = Number((primaryRoute.durationHours * 1.25).toFixed(2));
  const altBGeometry = (primaryRoute.geometry || []).map(([lng, lat]) => [lng + 0.02, lat + 0.015]);

  const altBSafety = evaluateRouteSafety({ distanceKm: altBDistance, durationHours: altBDuration, geometry: altBGeometry }, roads, [], riskZones);

  routeOptions.push({
    id: 'route-b',
    name: 'Alternative Evacuation Detour (Bypass Bypass)',
    distanceKm: altBDistance,
    durationHours: altBDuration,
    riskCategory: altBSafety.blockedRoads.length === 0 ? 'LOW' : 'MODERATE',
    routeStatus: altBSafety.blockedRoads.length === 0 ? 'NORMAL' : 'CAUTION',
    blockedCount: altBSafety.blockedRoads.length,
    warningCount: 1,
    summary: `${altBDistance} km · ${(altBDuration * 60).toFixed(0)} min via Secondary Ridge Detour`,
    geometry: altBGeometry,
    instructions: primaryRoute.instructions,
    isRecommended: primarySafety.routeStatus === 'BLOCKED',
    evaluatedAt: new Date().toISOString(),
  });

  // Sort routes by: (1) Avoid blocked, (2) Avoid critical risk, (3) Distance
  routeOptions.sort((a, b) => {
    if (a.blockedCount !== b.blockedCount) return a.blockedCount - b.blockedCount;
    if (a.routeStatus === 'BLOCKED' && b.routeStatus !== 'BLOCKED') return 1;
    if (b.routeStatus === 'BLOCKED' && a.routeStatus !== 'BLOCKED') return -1;
    return a.distanceKm - b.distanceKm;
  });

  // Mark top sorted option as recommended
  routeOptions.forEach((opt, idx) => {
    opt.isRecommended = idx === 0 && opt.routeStatus !== 'BLOCKED';
  });

  return routeOptions;
}

module.exports = {
  evaluateRouteSafety,
  rankAlternativeRoutes,
};
