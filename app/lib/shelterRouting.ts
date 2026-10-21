import { communityPlaces } from './rules';
import { distanceMeters } from './student/distance';
import type { Bilingual, CommunityPlace, Crossing, PlaceCategory, ShelterRoute } from './types';

// Default home coordinate: Southwest Williamson County Regional Park on CR 175 (Leander, TX)
export const DEFAULT_HOME_COORDS = { lat: 30.5788, lon: -97.8531 };

// Offline ZIP centroid lookup for Williamson & Travis County (Central Texas TX-31)
const KNOWN_ZIPS: Record<string, { lat: number; lon: number }> = {
  '78641': { lat: 30.5788, lon: -97.8531 }, // Leander (CR 175 corridor)
  '78645': { lat: 30.4571, lon: -97.9867 }, // Lago Vista / Jonestown
  '78613': { lat: 30.5185, lon: -97.8322 }, // Cedar Park
  '78626': { lat: 30.6425, lon: -97.6745 }, // Georgetown East
  '78628': { lat: 30.6400, lon: -97.7100 }, // Georgetown West
  '78634': { lat: 30.5300, lon: -97.5500 }, // Hutto
  '78664': { lat: 30.5090, lon: -97.6780 }, // Round Rock East
  '78665': { lat: 30.5400, lon: -97.6600 }, // Round Rock North
  '78681': { lat: 30.5200, lon: -97.7200 }, // Round Rock West
  '78717': { lat: 30.4905, lon: -97.7785 }, // Austin (Kelly Reeves / Avery Ranch)
  '78726': { lat: 30.4400, lon: -97.8400 }, // Austin Four Points
  '78729': { lat: 30.4500, lon: -97.7600 }, // Austin Jollyville
  '78701': { lat: 30.2635, lon: -97.7397 }, // Austin Downtown
};

/**
 * Resolves an address or zip code to coordinates offline without internet.
 */
export function resolveAddressCoordinates(address: string): { lat: number; lon: number } {
  if (!address || !address.trim()) return DEFAULT_HOME_COORDS;

  const clean = address.trim().toLowerCase();

  // Check 5-digit zip code
  const zipMatch = clean.match(/\b(78\d{3})\b/);
  if (zipMatch && KNOWN_ZIPS[zipMatch[1]]) {
    return KNOWN_ZIPS[zipMatch[1]];
  }

  // Check known town names in Central Texas
  if (clean.includes('cedar park')) return KNOWN_ZIPS['78613'];
  if (clean.includes('georgetown')) return KNOWN_ZIPS['78626'];
  if (clean.includes('round rock')) return KNOWN_ZIPS['78664'];
  if (clean.includes('austin')) return KNOWN_ZIPS['78717'];
  if (clean.includes('leander') || clean.includes('175')) return KNOWN_ZIPS['78641'];

  return DEFAULT_HOME_COORDS;
}

/**
 * Checks if a low-water crossing lies directly on the travel corridor between origin and destination.
 * Uses geometric projection and perpendicular corridor distance.
 */
export function isCrossingOnCorridor(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  crossing: Crossing,
  corridorThresholdMeters: number = 1200
): boolean {
  const vx = destination.lon - origin.lon;
  const vy = destination.lat - origin.lat;
  const lenSq = vx * vx + vy * vy;

  if (lenSq < 1e-9) return false;

  const wx = crossing.lon - origin.lon;
  const wy = crossing.lat - origin.lat;

  // Projection ratio t along the segment
  const t = (wx * vx + wy * vy) / lenSq;

  // The crossing must lie between origin and destination (with slight 5% buffer)
  if (t < 0.05 || t > 0.95) return false;

  // Closest point on the direct corridor segment
  const projPoint = {
    lat: origin.lat + t * vy,
    lon: origin.lon + t * vx,
  };

  const distToCorridor = distanceMeters(crossing, projPoint);
  return distToCorridor <= corridorThresholdMeters;
}

/**
 * Centralized shelter routing engine:
 * Evaluates all community places (tornado, food, hurricane, warming, cooling)
 * against household location and monitored low-water crossings.
 * Computes distances, crossing risk flags, and safe detour advice in ONE single place.
 */
export function computeAllShelterRoutes(
  origin: string | { lat: number; lon: number },
  crossings: Crossing[] = [],
  routeB: Bilingual | null = null,
  places: CommunityPlace[] = communityPlaces
): ShelterRoute[] {
  const originPos = typeof origin === 'string' ? resolveAddressCoordinates(origin) : origin;

  const routes: ShelterRoute[] = places.map((place) => {
    const distM = Math.round(distanceMeters(originPos, place));

    // Check if any monitored low-water crossing is on the path to this facility
    const dangerousCrossing = crossings.find((c) =>
      isCrossingOnCorridor(originPos, place, c)
    );

    if (dangerousCrossing) {
      return {
        place,
        distanceM: distM,
        hasCrossingRisk: true,
        crossingName: dangerousCrossing.label,
        warningNote: {
          en: `⚠️ Low-water crossing on route (${dangerousCrossing.label}). Flash flood risk during heavy rain!`,
          es: `⚠️ Cruce de agua en ruta (${dangerousCrossing.label}). ¡Peligro de inundación con lluvia fuerte!`,
        },
        detourAdvice: routeB ?? {
          en: 'Turn around. Take RM 1431 West to elevated overpass and 183A Toll.',
          es: 'Dé la vuelta. Tome RM 1431 al oeste hacia el puente elevado y 183A Toll.',
        },
      };
    }

    return {
      place,
      distanceM: distM,
      hasCrossingRisk: false,
      warningNote: {
        en: '✅ Direct route clear: No monitored low-water crossings on direct path.',
        es: '✅ Ruta directa despejada: Sin cruces de agua monitoreados en la ruta directa.',
      },
      detourAdvice: undefined,
    };
  });

  // Sort by nearest distance
  return routes.sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * Filters precomputed shelter routes by category.
 */
export function filterShelterRoutes(
  allRoutes: ShelterRoute[],
  category: PlaceCategory
): ShelterRoute[] {
  return allRoutes.filter((r) => r.place.category === category);
}
