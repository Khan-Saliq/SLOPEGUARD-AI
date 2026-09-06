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
 * Main routing function with automatic fallback and hazard analysis
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
    // Try OpenRouteService first (more accurate for long routes)
    if (options?.preferORS !== false) {
      try {
        route = await calculateRouteORS(start, end, options?.apiKey);
      } catch (orsError: any) {
        console.warn('OpenRouteService failed, falling back to OSRM:', orsError.message);
        route = await calculateRouteOSRM(start, end);
      }
    } else {
      route = await calculateRouteOSRM(start, end);
    }
  } catch (error: any) {
    // If both fail, throw error
    throw new Error(`Routing failed: ${error.message}`);
  }

  // Analyze route for hazards
  if (hazards.length > 0) {
    const hazardAnalysis = analyzeRouteHazards(route, hazards);

    if (hazardAnalysis.criticalCount > 0) {
      route.warnings = [
        ...(route.warnings || []),
        '⚠️ WARNING: This route passes near high-risk hazard zones',
        ...hazardAnalysis.warnings,
        '',
        '⚠️ This route may not be completely safe. Exercise extreme caution.',
        '⚠️ Check with local authorities before proceeding.',
      ];
    } else if (hazardAnalysis.warningCount > 0) {
      route.warnings = [
        ...(route.warnings || []),
        ...hazardAnalysis.warnings,
        '',
        'ℹ️ Route passes near moderate risk areas. Proceed with caution.',
      ];
    } else {
      route.warnings = [
        ...(route.warnings || []),
        '✓ Route does not pass near known high-risk zones',
        'ℹ️ However, conditions may change. Stay alert and follow local advisories.',
      ];
    }

    return {
      ...route,
      hazardAnalysis,
    };
  }

  // No hazard data available
  route.warnings = [
    ...(route.warnings || []),
    'ℹ️ Real-time hazard data unavailable',
    'ℹ️ Route shown is based on road network only',
    'ℹ️ Check with local authorities for current road conditions',
  ];

  return route;
}

/**
 * Geocode address to coordinates (simplified version)
 * For production, use a proper geocoding service like OpenRouteService geocoding API
 */
export async function geocodeAddress(address: string): Promise<RoutePoint | null> {
  try {
    // Using Nominatim (OpenStreetMap) for free geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SlopeGuard-AI-Routing/1.0',
      },
    });

    const data = await response.json();

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
