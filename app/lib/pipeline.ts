// ONE question pipeline for everyone (kid, grandparent, adult). The guardrails are the same for all:
// 1 danger rules  2 plan notes only  3 AI with the who-is-asking wrapper  4 must say CONFIDENCE: HIGH  5 made-up-number check.
import { dangerRules } from './rules';
import { pickPlan } from './pickPlan';
import persona from '../data/persona.json';
import { buildMessages, entriesText, splitConfidence } from './prompt';
import { tryStudent } from './safe';
import { checkDanger } from './student/checkDanger';
import { checkAnswer } from './student/checkAnswer';
import { pick, type DangerRule, type Household, type Lang, type PlanEntry } from './types';
import type { Outcome } from './aiLog';

export type Ai = { ready: () => Promise<boolean>; ask: (m: ReturnType<typeof buildMessages>) => Promise<string | null> };

export type Result =
  | { kind: 'danger'; rule: DangerRule; dangerNotBuilt: false }
  | { kind: 'noplan'; dangerNotBuilt: boolean }
  | { kind: 'answer'; text: string; from: string; entries: PlanEntry[]; outcome: Outcome; systemPrompt: string; planContext: string; dangerNotBuilt: boolean; checkNotBuilt: boolean; raw?: string };

export async function runPipeline(question: string, o: { household: Household; lang: Lang; age?: number; ai: Ai; rules?: DangerRule[] }): Promise<Result> {
  const { household, lang, age, ai } = o;
  // 1. Danger words first. The AI is never called if one matches.
  const danger = tryStudent(() => checkDanger(question, o.rules ?? dangerRules));
  const dangerNotBuilt = !danger.ok && danger.notBuilt;
  if (danger.ok && danger.value) return { kind: 'danger', rule: danger.value, dangerNotBuilt: false };

  // 2. Only plan notes that match the question.
  const entries = pickPlan(question, household.plan);
  if (entries.length === 0) return { kind: 'noplan', dangerNotBuilt };
  const planContext = entriesText(entries, lang);
  const from = entries.map((e) => pick(e.title, lang)).join(' + ');
  const messages = buildMessages(entries, question, lang, age); // 3. wrapper: language + age + short + plan only
  const systemPrompt = messages[0]?.content ?? '';
  let rawOut: string | undefined; // what the model actually said (shown in the Decision log for debugging)
  const plan = (outcome: Outcome, checkNotBuilt = false): Result =>
    ({ kind: 'answer', text: planContext, from, entries, outcome, systemPrompt, planContext, dangerNotBuilt, checkNotBuilt, raw: rawOut });

  // Plan note too thin to answer from (fewer words than persona.json minPlanWords): LOW confidence, the AI is not asked.
  if (entries.some((e) => pick(e.text, lang).trim().split(/\s+/).length < persona.minPlanWords)) return plan('low-confidence');
  if (!(await ai.ready())) return plan('skipped-no-model');
  const raw = await ai.ask(messages);
  rawOut = raw ?? '(no answer: timeout or error)';
  if (!raw) return plan('skipped-timeout');
  const { text: answer, high } = splitConfidence(raw);
  if (!high || !answer) return plan('low-confidence'); // not sure -> the parent's written plan, not the AI

  // 5. Block made-up numbers (phones, doses, addresses).
  const check = tryStudent(() => checkAnswer(answer, planContext));
  if (check.ok && !check.value.ok) return plan('blocked');
  return { kind: 'answer', text: answer, from, entries, outcome: 'answered', systemPrompt, planContext, dangerNotBuilt, checkNotBuilt: !check.ok && check.notBuilt, raw: rawOut };
}
