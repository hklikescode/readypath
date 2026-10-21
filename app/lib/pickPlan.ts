import type { PlanEntry } from './types';

// lowercase, drop accents and punctuation: "¿Dónde está la linterna?" -> "donde esta la linterna"
export const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Choose the 1-2 plan entries whose keywords appear in the question. Simple on purpose: keyword counting.
export function pickPlan(question: string, plan: PlanEntry[], max = 2): PlanEntry[] {
  const q = ` ${normalize(question)} `;
  return plan
    .map((entry) => ({
      entry,
      score: entry.keywords.filter((k) => q.includes(` ${normalize(k)} `) || q.includes(normalize(k))).length,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.entry);
}
