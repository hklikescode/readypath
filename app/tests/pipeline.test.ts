// The same guardrails run for everyone (kid, grandparent, adult). The AI is faked here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline, type Ai } from '../lib/pipeline';
import { demo } from './helpers';

const fake = (reply: string | null, ready = true) => {
  const calls: string[] = [];
  const ai: Ai = { ready: async () => ready, ask: async (m) => { calls.push(m[0].content); return reply; } };
  return { ai, calls };
};

test('pipeline: danger question never reaches the AI (kid, age 6)', async () => {
  const { ai, calls } = fake('x');
  const r = await runPipeline('Can we turn on the car in the garage?', { household: demo, lang: 'en', age: 6, ai });
  assert.equal(r.kind, 'danger');
  assert.equal(calls.length, 0);
});

test('pipeline: question outside the plan never reaches the AI', async () => {
  const { ai, calls } = fake('x');
  const r = await runPipeline('What is the capital of France?', { household: demo, lang: 'en', age: 6, ai });
  assert.equal(r.kind, 'noplan');
  assert.equal(calls.length, 0);
});

test('pipeline: plan question uses the wrapper for the reader (kid 6 EN, grandma 68 ES)', async () => {
  const kid = fake('Go to the closet. Cover your head.\nCONFIDENCE: HIGH');
  const a = await runPipeline('Where is our tornado safe spot?', { household: demo, lang: 'en', age: 6, ai: kid.ai });
  assert.ok(a.kind === 'answer' && a.outcome === 'answered' && a.text.startsWith('Go to the closet'));
  assert.ok(kid.calls[0].includes('6-year-old') && kid.calls[0].includes('English') && kid.calls[0].includes('ONLY the family plan'));
  const gran = fake('Vaya al baño interior.\nCONFIDENCE: HIGH');
  await runPipeline('¿Dónde está el lugar seguro para tornados?', { household: demo, lang: 'es', age: 68, ai: gran.ai });
  assert.ok(gran.calls[0].includes('Spanish') && gran.calls[0].includes('plain, simple words') && !gran.calls[0].includes('year-old'));
});

test('pipeline: made-up phone number is blocked, plan text shown instead', async () => {
  const { ai } = fake('Call 512-555-0199 now.\nCONFIDENCE: HIGH');
  const r = await runPipeline('Where is our tornado safe spot?', { household: demo, lang: 'en', age: 9, ai });
  assert.ok(r.kind === 'answer' && r.outcome === 'blocked' && r.text === r.planContext);
});

test('pipeline: no model or timeout falls back to the plan text', async () => {
  const none = await runPipeline('Where is our tornado safe spot?', { household: demo, lang: 'en', age: 6, ai: fake('x', false).ai });
  assert.ok(none.kind === 'answer' && none.outcome === 'skipped-no-model' && none.text === none.planContext);
  const slow = await runPipeline('Where is our tornado safe spot?', { household: demo, lang: 'en', age: 6, ai: fake(null).ai });
  assert.ok(slow.kind === 'answer' && slow.outcome === 'skipped-timeout');
});

test('pipeline: LOW confidence, or no confidence line, falls back to the plan text', async () => {
  for (const reply of ['Maybe go outside?\nCONFIDENCE: LOW', 'Go to the closet.']) {
    const r = await runPipeline('Where is our tornado safe spot?', { household: demo, lang: 'en', age: 6, ai: fake(reply).ai });
    assert.ok(r.kind === 'answer' && r.outcome === 'low-confidence' && r.text === r.planContext);
  }
  const ok = await runPipeline('Where is our tornado safe spot?', { household: demo, lang: 'en', age: 6, ai: fake('Go to the closet.\nCONFIDENCE: HIGH').ai });
  assert.ok(ok.kind === 'answer' && ok.outcome === 'answered' && !ok.text.includes('CONFIDENCE'));
});

test('pipeline: a too-thin plan note is LOW confidence and the AI is never asked', async () => {
  const { ai, calls } = fake('x\nCONFIDENCE: HIGH');
  const r = await runPipeline('What do we do in an earthquake?', { household: demo, lang: 'en', age: 30, ai });
  assert.ok(r.kind === 'answer' && r.outcome === 'low-confidence' && r.text.includes('Plan not finished'));
  assert.equal(calls.length, 0);
});
