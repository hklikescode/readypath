// Tests for the supporting app behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pickPlan, normalize } from '../lib/pickPlan';
import { buildMessages, entriesText } from '../lib/prompt';
import { STRINGS, t } from '../lib/strings';
import { tryStudent } from '../lib/safe';
import { emptyHousehold, pick } from '../lib/types';
import { checklistRules, dangerRules, demoHousehold, script911, testDrive } from '../lib/rules';
import { demo } from './helpers';

// ---- No internet code (Evidence test 4) ----
function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js)$/.test(f.name)) out.push(p);
  }
  return out;
}
test('no internet: no fetch( or XMLHttpRequest anywhere in app/, lib/ or components/', () => {
  const root = path.resolve(__dirname, '..');
  const bad: string[] = [];
  for (const d of ['app', 'lib', 'components']) {
    for (const file of walk(path.join(root, d))) {
      const src = fs.readFileSync(file, 'utf8');
      if (/\bfetch\s*\(/.test(src) || /XMLHttpRequest/.test(src) || /\baxios\b/.test(src) || /from ['"]https?:/.test(src)) bad.push(path.relative(root, file));
    }
  }
  assert.deepEqual(bad, []);
});

// ---- pickPlan ----
test('normalize: lowercase, no accents, no punctuation', () => {
  assert.equal(normalize('¿Dónde está la LINTERNA?!'), 'donde esta la linterna');
});
test('pickPlan: water shut-off -> freeze plan', () => {
  assert.equal(pickPlan('Where is the water shut-off?', demo.plan)[0]?.id, 'freeze');
});
test('pickPlan: Spanish flashlight -> heat plan', () => {
  assert.equal(pickPlan('¿Dónde están las linternas?', demo.plan)[0]?.id, 'heat');
});
test('pickPlan: Spanish power out and cold -> freeze plan', () => {
  assert.equal(pickPlan('Se fue la luz y hace mucho frío. ¿Qué hacemos?', demo.plan)[0]?.id, 'freeze');
});
test('pickPlan: unrelated question -> no entries', () => {
  assert.deepEqual(pickPlan('What is the capital of France?', demo.plan), []);
});
test('pickPlan: never more than 2 entries', () => {
  assert.ok(pickPlan('cold heat power flashlight tornado generator Mia alone', demo.plan).length <= 2);
});

// ---- prompt ----
test('prompt: only the picked entries go into the prompt', () => {
  const picked = pickPlan('Where is the water shut-off?', demo.plan);
  const [sys] = buildMessages(picked, 'Where is the water shut-off?', 'en');
  assert.ok(sys.content.includes('water shut-off'));
  assert.ok(!sys.content.includes('EpiPen'), 'allergy plan must not leak into a freeze question');
  assert.ok(sys.content.includes('ONLY the family plan'));
});
test('prompt: asks for Spanish when lang is es', () => {
  const m = buildMessages(demo.plan.slice(0, 1), 'hola', 'es');
  assert.ok(m[0].content.includes('Spanish'));
  assert.equal(m[1].content, 'hola');
});
test('prompt: the wrapper changes with the reader (language + age)', () => {
  const e = demo.plan.slice(0, 1);
  const kid = buildMessages(e, 'q', 'en', 6)[0].content;
  assert.ok(kid.includes('6-year-old') && kid.includes('2 very short steps'));
  const tween = buildMessages(e, 'q', 'en', 10)[0].content;
  assert.ok(tween.includes('10-year-old') && tween.includes('3 short steps'));
  const gran = buildMessages(e, 'q', 'es', 68)[0].content;
  assert.ok(gran.includes('Spanish') && gran.includes('plain, simple words') && !gran.includes('year-old'));
  assert.ok(buildMessages(e, 'q', 'en')[0].content.includes('plain, simple words'), 'no age = adult wording');
});
test('prompt: entriesText uses the Spanish text in Spanish', () => {
  assert.ok(entriesText(demo.plan.slice(0, 1), 'es').includes('cuarto caliente'));
});

// ---- strings ----
test('strings: English and Spanish have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.es).sort(), Object.keys(STRINGS.en).sort());
});
test('strings: no empty text, and {placeholders} match in both languages', () => {
  for (const k of Object.keys(STRINGS.en) as (keyof typeof STRINGS.en)[]) {
    assert.ok(STRINGS.en[k].length > 0 && STRINGS.es[k].length > 0, k);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    assert.equal(ph(STRINGS.en[k]), ph(STRINGS.es[k]), `placeholders differ in ${k}`);
  }
});
test('strings: t() fills in {name}', () => {
  assert.equal(t('en', 'kidHi', { name: 'Mia' }), 'Hi Mia!');
  assert.equal(t('es', 'kidHi', { name: 'Mia' }), '¡Hola Mia!');
});

// ---- tryStudent ----
test('tryStudent: a TODO(implementation) error is "notBuilt"', () => {
  const r = tryStudent(() => { throw new Error('TODO(implementation)'); });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.notBuilt, true);
});
test('tryStudent: a normal error is NOT "notBuilt"', () => {
  const r = tryStudent(() => { throw new Error('boom'); });
  assert.equal(!r.ok && r.notBuilt, false);
});
test('tryStudent: returns the value when it works', () => {
  assert.deepEqual(tryStudent(() => 5), { ok: true, value: 5 });
});

// ---- data ----
test('data: demo family loads with people, contacts, plan, a crossing and Route B', () => {
  const d = demoHousehold();
  assert.equal(d.people.length, 6);
  assert.equal(d.contacts.length, 2);
  assert.ok(d.crossings.length >= 1);
  assert.ok(pick(d.routeB, 'es').startsWith('Dé la vuelta'));
});
test('data: pick() falls back to English', () => {
  assert.equal(pick({ en: 'hi' }, 'es'), 'hi');
  assert.equal(pick(null, 'en'), '');
});
test('data: rule files and test drive are well formed', () => {
  assert.ok(dangerRules.length >= 1 && checklistRules.length >= 1);
  assert.ok(dangerRules.every((r) => r.words.length > 0 && r.message.en && r.message.es));
  assert.ok(testDrive.length > 10);
  assert.ok(script911.template.includes('{relation}'));
  assert.equal(emptyHousehold().people.length, 0);
});
