// Behavioral specifications for the five decision functions. Run: npm test
// Red = not done. Green = done. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDanger } from '../lib/student/checkDanger';
import { checkAnswer } from '../lib/student/checkAnswer';
import { runChecklist } from '../lib/student/checklist';
import { distanceMeters, nearCrossing } from '../lib/student/distance';
import { build911Sentence } from '../lib/student/sentence911';
import { checklistRules, dangerRules, script911 } from '../lib/rules';
import type { DangerRule } from '../lib/types';
import { demo, person } from './helpers';

// ---------------- checkDanger ----------------
const tiny: DangerRule[] = [
  { id: 'car-garage', action: 'firmNo', words: ['car in the garage', 'carro en el garaje'], message: { en: 'NO', es: 'NO' } },
  { id: 'not-breathing', action: 'call911', words: ['not breathing', 'no respira'], message: { en: '911', es: '911' } },
  { id: 'swelling', action: 'call911', words: ['throat', 'garganta'], message: { en: '911', es: '911' } },
];

test('checkDanger: finds a word in a sentence', () => {
  assert.equal(checkDanger('Can we turn on the car in the garage to get warm?', tiny)?.id, 'car-garage');
});
test('checkDanger: ignores UPPERCASE and punctuation', () => {
  assert.equal(checkDanger('GRANDPA IS NOT BREATHING!!!', tiny)?.id, 'not-breathing');
});
test('checkDanger: ignores accents (garáje = garaje)', () => {
  assert.equal(checkDanger('¿Podemos prender el carro en el garáje?', tiny)?.id, 'car-garage');
});
test('checkDanger: Spanish word matches', () => {
  assert.equal(checkDanger('Mi esposo no respira', tiny)?.id, 'not-breathing');
});
test('checkDanger: nothing matches -> null', () => {
  assert.equal(checkDanger('Where is the flashlight?', tiny), null);
});
test('checkDanger: two rules match -> the first rule in the list wins', () => {
  assert.equal(checkDanger('She is not breathing and her throat hurts', tiny)?.id, 'not-breathing');
});
test('checkDanger (your rules file): car in the garage -> car-garage', () => {
  assert.equal(checkDanger('Can we turn on the car in the garage to get warm?', dangerRules)?.id, 'car-garage');
});
test('checkDanger (your rules file): Spanish car in the garage', () => {
  assert.equal(checkDanger('¿Podemos prender el carro en el garaje?', dangerRules)?.id, 'car-garage');
});
test('checkDanger (your rules file): throat swelling is call911', () => {
  assert.equal(checkDanger('My throat is SWELLING!!', dangerRules)?.action, 'call911');
});
test('checkDanger (your rules file): flashlight is safe', () => {
  assert.equal(checkDanger('Where is the flashlight?', dangerRules), null);
});

// ---------------- checkAnswer ----------------
const allowed =
  'Our warm room is the living room. Call Mom at 555-0101 or Dad at 555-0102. The generator stays 20 feet from windows.';

test('checkAnswer: an honest answer with no numbers passes', () => {
  assert.deepEqual(checkAnswer('Stay in the warm room and wear layers.', allowed), { ok: true, badNumbers: [] });
});
test('checkAnswer: a phone number that IS in the plan passes', () => {
  assert.equal(checkAnswer('Call Mom at 555-0101', allowed).ok, true);
});
test('checkAnswer: a plan number like 20 feet passes', () => {
  assert.equal(checkAnswer('Keep the generator 20 feet from windows.', allowed).ok, true);
});
test('checkAnswer: "Give 2 pills" with no 2 in the plan is blocked', () => {
  const r = checkAnswer('Give 2 pills', 'Mia is allergic to peanuts. Call Mom.');
  assert.equal(r.ok, false);
  assert.deepEqual(r.badNumbers, ['2']);
});
// HINT for the 10 below: "5" is hiding inside "555", and "2" inside "20". Comparing pieces of TEXT is not enough.
// Compare whole NUMBERS: list the numbers in the answer, list the numbers in the plan, then compare the lists.
const fakeAnswers = [
  'Call Grandma at 555-0177.',
  'Give Mia 5 mg of medicine.',
  'Take 3 tablets now.',
  'Go to 456 Oak Street for shelter.',
  'Call 1-800-555-0188 for help.',
  'Keep the generator 50 feet from windows.',
  'Use 2 puffs of the inhaler.',
  'Call Dad at 555-0192.',
  'The shelter opens at 7 pm.',
  'Give 10 ml every 4 hours.',
];
fakeAnswers.forEach((a, i) =>
  test(`checkAnswer: made-up number ${i + 1}/10 is blocked ("${a}")`, () => {
    const r = checkAnswer(a, allowed);
    assert.equal(r.ok, false);
    assert.ok(r.badNumbers.length > 0);
  }),
);

// ---------------- runChecklist ----------------
test('runChecklist: demo family is missing the oxygen backup-power check', () => {
  const r = runChecklist(demo, checklistRules);
  assert.ok(r.missing.includes('power-backup'));
});
test('runChecklist: once Frank has a backup plan, that check is ready', () => {
  const fixed = {
    ...demo,
    people: demo.people.map((p) => (p.id === 'frank' ? { ...p, powerBackupPlan: 'Battery backup + call the power company' } : p)),
  };
  assert.ok(runChecklist(fixed, checklistRules).ready.includes('power-backup'));
});
test('runChecklist: every rule ends up in ready OR missing, never both', () => {
  const r = runChecklist(demo, checklistRules);
  assert.equal(r.ready.length + r.missing.length, checklistRules.length);
  assert.equal(r.ready.filter((id) => r.missing.includes(id)).length, 0);
});

// ---------------- distance ----------------
test('distanceMeters: same point is 0', () => {
  assert.equal(distanceMeters({ lat: 30.5, lon: -97.8 }, { lat: 30.5, lon: -97.8 }), 0);
});
test('distanceMeters: 1 km north-south is about 1000 m', () => {
  const d = distanceMeters({ lat: 30.5788, lon: -97.85 }, { lat: 30.5788 + 1000 / 111320, lon: -97.85 });
  assert.ok(Math.abs(d - 1000) <= 10, `got ${d}`);
});
const cr = [{ id: 'cr175', label: 'CR 175 low-water crossing (demo)', lat: 30.575207, lon: -97.837449 }];
test('nearCrossing: a point 300 m away (limit 500) -> that crossing', () => {
  const pos = { lat: cr[0].lat + 300 / 111320, lon: cr[0].lon };
  assert.equal(nearCrossing(pos, cr, 500)?.id, 'cr175');
});
test('nearCrossing: a point 900 m away (limit 500) -> null', () => {
  const pos = { lat: cr[0].lat + 900 / 111320, lon: cr[0].lon };
  assert.equal(nearCrossing(pos, cr, 500), null);
});

// ---------------- build911Sentence ----------------
const addr = '123 Demo Street, Leander, TX 78641';
test('build911Sentence: Elena (grandparent) for Mia (allergic)', () => {
  assert.equal(
    build911Sentence(person('elena'), person('mia'), 'allergic', addr, script911),
    'My grandchild, Mia, age 9, is having a serious allergic reaction at 123 Demo Street, Leander, TX 78641.',
  );
});
test('build911Sentence: Mia (kid) for Elena (grandparent)', () => {
  assert.equal(
    build911Sentence(person('mia'), person('elena'), 'not-breathing', addr, script911),
    'My grandparent, Elena, age 68, is not breathing at 123 Demo Street, Leander, TX 78641.',
  );
});
test('build911Sentence: parent for kid uses "child"', () => {
  assert.match(build911Sentence(person('ana'), person('leo'), 'fall', addr, script911), /^My child, Leo, age 6, fell and is hurt at /);
});
test('build911Sentence: unknown situation uses the default phrase', () => {
  assert.match(build911Sentence(person('ana'), person('leo'), 'volcano', addr, script911), /needs emergency help at /);
});
