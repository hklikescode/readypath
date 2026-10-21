// Setup-time fetch with a FAKE network: address -> coordinates -> nearby places, saved for offline use.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchNearby, type FetchFn } from '../lib/nearby';

const osm = { elements: [
  { type: 'node', id: 1, lat: 30.6, lon: -97.85, tags: { name: 'Hill Country Food Bank', amenity: 'food_bank', 'addr:street': 'Lacy Dr' } },
  { type: 'way', id: 2, center: { lat: 30.58, lon: -97.86 }, tags: { name: 'City Library', amenity: 'library' } },
  { type: 'node', id: 3, lat: 30.5, lon: -97.8, tags: { amenity: 'library' } },
] };
const net = (match = true, overpassOk = true): FetchFn => async (url) => ({
  ok: url.includes('overpass') ? overpassOk : true,
  json: async () => (url.includes('census') ? { result: { addressMatches: match ? [{ coordinates: { x: -97.85, y: 30.57 } }] : [] } } : osm),
});

test('nearby: address becomes a saved home point plus food, warming and cooling places', async () => {
  const n = await fetchNearby('3005 County Road 175, Leander, TX', net(), () => new Date('2026-10-20T12:00:00Z'));
  assert.ok(n);
  assert.deepEqual(n.home, { lat: 30.57, lon: -97.85 });
  assert.deepEqual(n.places.map((p) => p.category).sort(), ['cooling', 'food', 'warming']); // library -> 2, nameless one skipped
  assert.equal(n.fetchedAt, '2026-10-20T12:00:00.000Z');
});

test('nearby: unknown address or a failed service returns null (the app keeps what it had)', async () => {
  assert.equal(await fetchNearby('zzz', net(false)), null);
  assert.equal(await fetchNearby('3005 County Road 175', net(true, false)), null);
});
