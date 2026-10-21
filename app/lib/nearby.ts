// Online ONCE, when the plan is created: find the home on the map and save nearby help places on the phone.
// After that the app works with no internet. Free public services, no API keys:
//   US Census geocoder (address -> lat/lon), OpenStreetMap Overpass (places near that point).
import type { CommunityPlace } from './types';

export type FetchFn = (url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => Promise<{ ok: boolean; json: () => Promise<any> }>;
export type Nearby = { home: { lat: number; lon: number }; places: CommunityPlace[]; fetchedAt: string };

const CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
export const RADIUS_M = 16000; // about 10 miles

export async function geocode(address: string, f: FetchFn): Promise<{ lat: number; lon: number } | null> {
  const r = await f(`${CENSUS}?benchmark=Public_AR_Current&format=json&address=${encodeURIComponent(address)}`);
  if (!r.ok) return null;
  const c = (await r.json())?.result?.addressMatches?.[0]?.coordinates;
  return c && typeof c.x === 'number' && typeof c.y === 'number' ? { lat: c.y, lon: c.x } : null;
}

// OpenStreetMap tags -> our categories. Libraries and community centres are common cooling/warming spots.
// Official tornado and hurricane shelters are NOT reliably in open maps, so we do not guess them.
const QUERY = (lat: number, lon: number) =>
  `[out:json][timeout:25];(` +
  ['amenity=food_bank', 'social_facility=food_bank', 'amenity=library', 'amenity=community_centre']
    .map((t) => { const [k, v] = t.split('='); return `nwr(around:${RADIUS_M},${lat},${lon})["${k}"="${v}"]["name"];`; })
    .join('') +
  `);out center 60;`;

export function toPlaces(osm: any): CommunityPlace[] {
  const out: CommunityPlace[] = [];
  for (const e of osm?.elements ?? []) {
    const tags = e.tags ?? {};
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (!tags.name || typeof lat !== 'number' || typeof lon !== 'number') continue;
    const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ');
    const cats: CommunityPlace['category'][] =
      tags.amenity === 'food_bank' || tags.social_facility === 'food_bank' ? ['food'] : ['warming', 'cooling'];
    for (const category of cats) {
      out.push({
        id: `osm-${e.type}-${e.id}-${category}`, category, name: tags.name,
        address: address || 'Address not listed: use the map',
        phone: tags.phone || tags['contact:phone'],
        lat, lon,
        description: {
          en: 'Found on OpenStreetMap near your home. Not verified: call first to check it is open and available.',
          es: 'Encontrado en OpenStreetMap cerca de su casa. No verificado: llame primero para confirmar que está abierto.',
        },
      });
    }
  }
  return out;
}

export async function fetchNearby(address: string, f: FetchFn, now = () => new Date()): Promise<Nearby | null> {
  const home = await geocode(address, f);
  if (!home) return null;
  const r = await f(OVERPASS, { method: 'POST', body: `data=${encodeURIComponent(QUERY(home.lat, home.lon))}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) return null;
  return { home, places: toPlaces(await r.json()), fetchedAt: now().toISOString() };
}
