import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_LOG, OUTCOME_KEY, addToLog, logToText, skippedCount, wasSkipped, type AiLogEntry, type Outcome } from '../lib/aiLog';
import { STRINGS } from '../lib/strings';

const e = (outcome: Outcome, n = 0): AiLogEntry => ({ id: `${n}`, at: '2026-10-18T12:00:00Z', mode: 'grandparent', lang: 'en', question: 'q', outcome });

test('log: skipped means the AI did not give the answer shown', () => {
  assert.equal(wasSkipped('answered'), false);
  assert.equal(wasSkipped('blocked'), false);
  for (const o of ['skipped-danger', 'skipped-no-plan', 'skipped-no-model', 'skipped-timeout', 'skipped-kid'] as Outcome[]) assert.equal(wasSkipped(o), true);
});
test('log: skippedCount', () => {
  assert.equal(skippedCount([e('answered'), e('skipped-danger'), e('skipped-kid'), e('blocked')]), 2);
});
test('log: newest first, capped at MAX_LOG', () => {
  let l: AiLogEntry[] = [];
  for (let i = 0; i < MAX_LOG + 5; i++) l = addToLog(l, e('answered', i));
  assert.equal(l.length, MAX_LOG);
  assert.equal(l[0].id, String(MAX_LOG + 4));
});
test('log: every outcome has an English and Spanish label', () => {
  for (const k of Object.values(OUTCOME_KEY)) assert.ok(STRINGS.en[k] && STRINGS.es[k]);
});
test('log: text export has one line per entry with the reason', () => {
  const txt = logToText([{ ...e('skipped-danger'), ruleId: 'car-garage' }], (o) => STRINGS.en[OUTCOME_KEY[o]]);
  assert.match(txt, /AI skipped: danger word found/);
  assert.match(txt, /rule: car-garage/);
});
