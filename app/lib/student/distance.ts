import type { Crossing } from '../types';

// 1 degree of latitude is approx 111,320 meters on Earth.
const METERS_PER_DEGREE_LAT = 111320;

export function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (b.lat - a.lat) * METERS_PER_DEGREE_LAT;
  // Longitude lines converge at the poles, so multiply by cos(avg latitude in radians)
  const avgLatRad = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLon = (b.lon - a.lon) * METERS_PER_DEGREE_LAT * Math.cos(avgLatRad);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

export function nearCrossing(
  pos: { lat: number; lon: number },
  crossings: Crossing[],
  limitM: number,
): Crossing | null {
  for (const crossing of crossings) {
    const dist = distanceMeters(pos, crossing);
    if (dist <= limitM) {
      return crossing;
    }
  }
  return null;
}
