import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAddressCoordinates,
  isCrossingOnCorridor,
  computeAllShelterRoutes,
  filterShelterRoutes,
  DEFAULT_HOME_COORDS,
} from '../lib/shelterRouting';
import type { Crossing } from '../lib/types';

test('shelterRouting: resolves zip codes and cities offline', () => {
  const leander = resolveAddressCoordinates('3005 County Road 175, Leander, TX 78641');
  assert.equal(leander.lat, 30.5788);
  assert.equal(leander.lon, -97.8531);

  const cpZip = resolveAddressCoordinates('1435 Main St, 78613');
  assert.equal(cpZip.lat, 30.5185);

  const gtTown = resolveAddressCoordinates('Morrow St, Georgetown, Texas');
  assert.equal(gtTown.lat, 30.6425);

  const fallback = resolveAddressCoordinates('');
  assert.deepEqual(fallback, DEFAULT_HOME_COORDS);
});

test('shelterRouting: detects low-water crossing on route corridor', () => {
  const home = { lat: 30.5788, lon: -97.8531 };
  const cr175Crossing: Crossing = {
    id: 'cr175',
    label: 'CR 175 at Brushy Creek',
    lat: 30.575207,
    lon: -97.837449,
  };

  // Rouse High School is to the southeast along CR 175 corridor
  const rouseSchool = { lat: 30.5615, lon: -97.8398 };
  assert.equal(isCrossingOnCorridor(home, rouseSchool, cr175Crossing), true);

  // Leander Public Library is to the west (opposite direction of CR 175 crossing)
  const leanderLibrary = { lat: 30.5694, lon: -97.8631 };
  assert.equal(isCrossingOnCorridor(home, leanderLibrary, cr175Crossing), false);
});

test('shelterRouting: computeAllShelterRoutes precomputes all 14 facilities with distance and flood risk', () => {
  const cr175Crossing: Crossing = {
    id: 'cr175',
    label: 'CR 175 at Brushy Creek',
    lat: 30.575207,
    lon: -97.837449,
  };
  const routeB = {
    en: 'Turn around. Take RM 1431 West to 183A Toll.',
    es: 'Dé la vuelta. Tome RM 1431 al oeste hacia 183A Toll.',
  };

  const routes = computeAllShelterRoutes(DEFAULT_HOME_COORDS, [cr175Crossing], routeB);

  // All 14 facilities loaded
  assert.equal(routes.length, 14);

  // Sorted by distance ascending
  for (let i = 1; i < routes.length; i++) {
    assert.ok(routes[i].distanceM >= routes[i - 1].distanceM);
  }

  // Covers all 5 categories
  const categories = new Set(routes.map((r) => r.place.category));
  assert.deepEqual(
    Array.from(categories).sort(),
    ['cooling', 'food', 'hurricane', 'tornado', 'warming']
  );

  // At least one facility along CR 175 corridor has crossing risk flagged
  const flagged = routes.filter((r) => r.hasCrossingRisk);
  assert.ok(flagged.length > 0);
  assert.equal(flagged[0].crossingName, 'CR 175 at Brushy Creek');
  assert.ok(flagged[0].detourAdvice?.en.includes('RM 1431'));

  // Filtering by category returns expected subset
  const tornadoRoutes = filterShelterRoutes(routes, 'tornado');
  assert.equal(tornadoRoutes.length, 4);
  assert.ok(tornadoRoutes.every((r) => r.place.category === 'tornado'));

  const warmingRoutes = filterShelterRoutes(routes, 'warming');
  assert.equal(warmingRoutes.length, 2);

  const coolingRoutes = filterShelterRoutes(routes, 'cooling');
  assert.equal(coolingRoutes.length, 2);
});
