import test from 'node:test';
import assert from 'node:assert/strict';
import { decodePlan, encodePlan } from '../lib/planShare';
import { demoHousehold } from '../lib/rules';

test('plan code round-trips and can leave out the address', () => {
  const h = demoHousehold();
  const r = decodePlan(encodePlan(h));
  assert.ok(r.ok && r.household.people.length === h.people.length && r.household.address === h.address);
  const r2 = decodePlan(encodePlan(h, { leaveOutAddress: true }));
  assert.ok(r2.ok && r2.household.address === '');
  assert.equal(decodePlan('hello').ok, false);
  assert.equal(decodePlan(encodePlan(h).slice(0, 60)).ok, false);
});
