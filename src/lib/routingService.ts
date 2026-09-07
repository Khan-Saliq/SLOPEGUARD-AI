/**
 * Routing Service Integration
 * Uses OpenRouteService API for road-based routing calculations
 * Fallback to OSRM if ORS is unavailable
 */

export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteResult {
  distance: number; // kilometers
  duration: number; // hours
  geometry: [number, number][]; // [lng, lat] pairs for map display
  instructions?: RouteInstruction[];
  summary: string;
  warnings?: string[];
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  type: string;
}

export interface HazardZone {
  lat: number;
  lng: number;
  radius: number; // meters
  severity: string;
  name: string;
}

/**
 * Calculate route using OpenRouteService
 * Free tier: 2000 requests/day
 * Register at: https://openrouteservice.org/dev/#/signup
 */
async function calculateRouteORS(
  start: RoutePoint,
  end: RoutePoint,
  apiKey?: string
): Promise<RouteResult> {
  const ORS_API_KEY = apiKey || import.meta.env.VITE_ORS_API_KEY;
  if (!ORS_API_KEY) throw new Error('OpenRouteService is not configured');

  const url = 'https://api.openrouteservice.org/v2/directions/driving-car?geometry_format=geojson';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': ORS_API_KEY,
    },
    body: JSON.stringify({
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ],
      instructions: true,
      units: 'km',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouteService error: ${response.status}`);
  }

  const data = await response.json();
  const route = data.routes[0];
  const segment = route.segments[0];
  const geometry = route.geometry?.coordinates;
  if (!Array.isArray(geometry) || geometry.length < 2) {
    throw new Error('Routing service returned no usable route geometry');
  }

  return {
    distance: route.summary.distance, // in km
    duration: route.summary.duration / 3600, // convert seconds to hours
    geometry, // [lng, lat] pairs
    instructions: segment.steps?.map((step: any) => ({
      text: step.instruction,
      distance: step.distance,
      duration: step.duration,
      type: step.type,
    })),
    summary: `${route.summary.distance.toFixed(1)} km, ${(route.summary.duration / 3600).toFixed(1)} hours`,
    warnings: [],
  };
}

/**
 * Calculate route using OSRM (fallback)
 * Free public instance with no API key required
 */
async function calculateRouteOSRM(start: RoutePoint, end: RoutePoint): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&steps=true&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }

  const route = data.routes[0];

  return {
    distance: route.distance / 1000, // meters to km
    duration: route.duration / 3600, // seconds to hours
    geometry: route.geometry.coordinates, // [lng, lat] pairs
    instructions: route.legs[0]?.steps?.map((step: any) => ({
      text: step.maneuver.instruction || `${step.maneuver.type} for ${(step.distance / 1000).toFixed(1)} km`,
      distance: step.distance / 1000,
      duration: step.duration / 3600,
      type: step.maneuver.type,
    })),
    summary: `${(route.distance / 1000).toFixed(1)} km, ${(route.duration / 3600).toFixed(1)} hours`,
    warnings: [],
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if route passes near hazard zones
 */
function analyzeRouteHazards(route: RouteResult, hazards: HazardZone[]): {
  warningCount: number;
  criticalCount: number;
  warnings: string[];
  affectedSegments: number[];
} {
  const warnings: string[] = [];
  const affectedSegments: number[] = [];
  let warningCount = 0;
  let criticalCount = 0;

  // Check each route point against hazard zones
  route.geometry.forEach((point, index) => {
    const routePoint = { lat: point[1], lng: point[0] };

    hazards.forEach((hazard) => {
      const distance = calculateDistance(routePoint, hazard) * 1000; // convert to meters

      if (distance <= hazard.radius) {
        affectedSegments.push(index);

        if (hazard.severity === 'critical' || hazard.severity === 'high') {
          criticalCount++;
          if (!warnings.includes(hazard.name)) {
            warnings.push(`⚠️ Route passes near ${hazard.severity} risk zone: ${hazard.name}`);
          }
        } else {
          warningCount++;
        }
      }
    });
  });

  return {
    warningCount,
    criticalCount,
    warnings,
    affectedSegments,
  };
}

/**
 * Calculate route via backend OpenRouteService Proxy
 */
async function calculateRouteBackend(
  start: RoutePoint,
  end: RoutePoint
): Promise<RouteResult> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/routes/directions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ start, end }),
  });

  if (!response.ok) {
    throw new Error(`Backend directions service error: ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data.success || !Array.isArray(data.geometry)) {
    throw new Error(data.message || 'Routing service returned no geometry');
  }

  return {
    distance: data.distanceKm,
    duration: data.durationHours,
    geometry: data.geometry,
    instructions: data.instructions || [],
    summary: data.summaryMessage || `${data.distanceKm} km, ${data.durationHours} hours`,
    warnings: [],
  };
}

/**
 * Fetch alternative ranked routes from backend
 */
export async function fetchAlternativeRoutes(start: RoutePoint, end: RoutePoint) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/routes/alternatives', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ start, end }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (data && data.success && Array.isArray(data.routes)) {
      return data.routes;
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Main routing function with backend proxy, automatic fallback, and hazard analysis
 */
export async function calculateSafeRoute(
  start: RoutePoint,
  end: RoutePoint,
  hazards: HazardZone[] = [],
  options?: {
    preferORS?: boolean;
    apiKey?: string;
  }
): Promise<RouteResult & { hazardAnalysis?: ReturnType<typeof analyzeRouteHazards> }> {
  let route: RouteResult;

  try {
    // 1. Try Backend OpenRouteService Proxy
    route = await calculateRouteBackend(start, end);
  } catch (backendErr: any) {
    console.warn('[RoutingService] Backend proxy unfulfilled, falling back to direct client routing:', backendErr.message);

    try {
      if (options?.preferORS !== false) {
        route = await calculateRouteORS(start, end, options?.apiKey);
      } else {
        route = await calculateRouteOSRM(start, end);
      }
    } catch (clientErr: any) {
      console.warn('[RoutingService] Direct client routing failed, using OSRM fallback:', clientErr.message);
      route = await calculateRouteOSRM(start, end);
    }
  }

  // Analyze route for hazards
  if (hazards.length > 0) {
    const hazardAnalysis = analyzeRouteHazards(route, hazards);

    if (hazardAnalysis.criticalCount > 0) {
      route.warnings = [
        ...(route.warnings || []),
        '⚠️ WARNING: This route passes near high-risk hazard zones or active blockages',
        ...hazardAnalysis.warnings,
        '⚠️ Check with local emergency authorities before proceeding.',
      ];
    } else if (hazardAnalysis.warningCount > 0) {
      route.warnings = [
        ...(route.warnings || []),
        ...hazardAnalysis.warnings,
        'ℹ️ Route passes near moderate risk areas. Proceed with caution.',
      ];
    } else {
      route.warnings = [
        ...(route.warnings || []),
        '✓ Route does not pass near known high-risk zones or active road blockages',
        'ℹ️ Stay alert and follow local emergency advisories.',
      ];
    }

    return {
      ...route,
      hazardAnalysis,
    };
  }

  return route;
}

/**
 * Geocode address to coordinates (simplified version)
 * For production, use a proper geocoding service like OpenRouteService geocoding API
 */
export async function geocodeAddress(address: string): Promise<RoutePoint | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
