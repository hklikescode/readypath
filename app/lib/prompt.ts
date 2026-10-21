import persona from '../data/persona.json';
import { pick, type Lang, type PlanEntry } from './types';

export type ChatMessage = { role: 'system' | 'user'; content: string };

// The text the AI is allowed to use (and the text checkAnswer compares numbers against).
export const entriesText = (entries: PlanEntry[], lang: Lang): string =>
  entries.map((e) => `${pick(e.title, lang)}: ${pick(e.text, lang)}`).join('\n\n');

// Who is asking decides how the AI writes: their language (below) and their age (data/persona.json).
type Level = { name: 'kid' | 'tween' | 'adult'; maxAge?: number; rule: string };
const levels = persona.levels as Level[];
export type ReaderLevel = Level['name'];
const levelFor = (age?: number): Level =>
  (age !== undefined && age > 0 ? levels.find((l) => l.maxAge === undefined || age <= l.maxAge) : undefined) ?? levels[levels.length - 1];
export const readerLevel = (age?: number): ReaderLevel => levelFor(age).name;
export const readerRule = (age?: number): string => levelFor(age).rule.replace('{age}', String(age));

// The AI must end with "CONFIDENCE: HIGH" or "CONFIDENCE: LOW". Anything but a clear HIGH counts as LOW.
export function splitConfidence(raw: string): { text: string; high: boolean } {
  // Small models often bold the marker ("**CONFIDENCE:** HIGH"). Strip markdown, then read the LAST marker.
  const clean = raw.replace(/[*_`#]/g, '');
  const marks = [...clean.matchAll(/confidence\s*[:\-]?\s*(high|low)/gi)];
  const high = marks.length > 0 && marks[marks.length - 1][1].toLowerCase() === 'high';
  return { text: clean.replace(/\n?\s*confidence\s*[:\-]?\s*(high|low)\W*$/i, '').trim(), high };
}

// Builds the prompt from ONLY the picked entries. Nothing else from the family data goes in.
export function buildMessages(entries: PlanEntry[], question: string, lang: Lang, age?: number): ChatMessage[] {
  const language = lang === 'es' ? 'Spanish' : 'English';
  return [
    {
      role: 'system',
      content:
        `${persona.base} Answer in ${language}. ${readerRule(age)} ${persona.confidence}\n\nFAMILY PLAN:\n${entriesText(entries, lang)}`,
    },
    { role: 'user', content: question },
  ];
}
