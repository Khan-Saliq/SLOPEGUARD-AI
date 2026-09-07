const axios = require('axios');

/**
 * Directions Service (Backend Proxy for OpenRouteService)
 * Proxies OpenRouteService API securely without exposing OPENROUTESERVICE_API_KEY to frontend.
 * Fallbacks automatically to OSRM or straight-line road segments if ORS is unconfigured or fails.
 */

async function getDirectionsORS(start, end, apiKey) {
  const orsKey = apiKey || process.env.OPENROUTESERVICE_API_KEY || process.env.VITE_ORS_API_KEY;
  if (!orsKey) {
    throw new Error('OpenRouteService API key not configured on backend');
  }

  const endpoint = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

  const response = await axios.post(
    endpoint,
    {
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ],
      elevation: false,
      instructions: true,
      units: 'km',
    },
    {
      headers: {
        Authorization: orsKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  if (!response.data || !response.data.features || response.data.features.length === 0) {
    throw new Error('OpenRouteService returned no route features');
  }

  const feature = response.data.features[0];
  const properties = feature.properties || {};
  const summary = properties.summary || {};
  const segment = (properties.segments && properties.segments[0]) || {};

  const distanceKm = summary.distance || 0;
  const durationHours = (summary.duration || 0) / 3600;
  const geometry = feature.geometry?.coordinates || [];

  const instructions = (segment.steps || []).map((step) => ({
    text: step.instruction || 'Proceed along designated route',
    distance: Number(((step.distance || 0)).toFixed(2)),
    duration: Number(((step.duration || 0) / 60).toFixed(1)),
    type: String(step.type || 'continue'),
  }));

  return {
    provider: 'OpenRouteService',
    distanceKm: Number(distanceKm.toFixed(2)),
    durationHours: Number(durationHours.toFixed(2)),
    geometry, // [lng, lat] array
    instructions,
    summaryMessage: `${distanceKm.toFixed(1)} km · ${(durationHours * 60).toFixed(0)} min via OpenRouteService`,
  };
}

async function getDirectionsOSRM(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&steps=true&geometries=geojson`;

  const response = await axios.get(url, { timeout: 8000 });
  if (!response.data || response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
    throw new Error('OSRM routing engine returned no route');
  }

  const route = response.data.routes[0];
  const distanceKm = (route.distance || 0) / 1000;
  const durationHours = (route.duration || 0) / 3600;
  const geometry = route.geometry?.coordinates || [];

  const instructions = (route.legs?.[0]?.steps || []).map((step) => ({
    text: step.maneuver?.instruction || `Drive ${(step.distance / 1000).toFixed(1)} km`,
    distance: Number(((step.distance || 0) / 1000).toFixed(2)),
    duration: Number(((step.duration || 0) / 60).toFixed(1)),
    type: String(step.maneuver?.type || 'turn'),
  }));

  return {
    provider: 'OSRM',
    distanceKm: Number(distanceKm.toFixed(2)),
    durationHours: Number(durationHours.toFixed(2)),
    geometry,
    instructions,
    summaryMessage: `${distanceKm.toFixed(1)} km · ${(durationHours * 60).toFixed(0)} min via OSRM Engine`,
  };
}

function getDirectionsFallback(start, end) {
  const R = 6371; // Earth radius in km
  const dLat = ((end.lat - start.lat) * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start.lat * Math.PI) / 180) *
      Math.cos((end.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Number((R * c * 1.35).toFixed(2)); // 1.35 winding factor
  const durationHours = Number((distanceKm / 35).toFixed(2)); // 35 km/h mountain speed

  // Generate 5 interpolated geometry points between start and end
  const geometry = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = start.lat + (end.lat - start.lat) * ratio;
    const lng = start.lng + (end.lng - start.lng) * ratio;
    geometry.push([lng, lat]);
  }

  return {
    provider: 'FallbackGeodesic',
    distanceKm,
    durationHours,
    geometry,
    instructions: [
      { text: `Depart from origin (${start.lat.toFixed(3)}, ${start.lng.toFixed(3)})`, distance: 0, duration: 0, type: 'depart' },
      { text: `Proceed along mountain corridor towards destination`, distance: distanceKm, duration: durationHours * 60, type: 'continue' },
      { text: `Arrive at destination (${end.lat.toFixed(3)}, ${end.lng.toFixed(3)})`, distance: 0, duration: 0, type: 'arrive' },
    ],
    summaryMessage: `${distanceKm} km · ${(durationHours * 60).toFixed(0)} min (Direct Segment)`,
  };
}

async function calculateDirections(start, end, options = {}) {
  if (!start || !end || typeof start.lat !== 'number' || typeof start.lng !== 'number' || typeof end.lat !== 'number' || typeof end.lng !== 'number') {
    throw new Error('Invalid start or end coordinates provided');
  }

  // 1. Try OpenRouteService
  try {
    return await getDirectionsORS(start, end, options.apiKey);
  } catch (orsErr) {
    console.warn(`[DirectionsService] OpenRouteService unfulfilled (${orsErr.message}), trying OSRM fallback...`);
  }

  // 2. Try OSRM
  try {
    return await getDirectionsOSRM(start, end);
  } catch (osrmErr) {
    console.warn(`[DirectionsService] OSRM unfulfilled (${osrmErr.message}), switching to geodesic fallback...`);
  }

  // 3. Fallback
  return getDirectionsFallback(start, end);
}

module.exports = {
  calculateDirections,
};
