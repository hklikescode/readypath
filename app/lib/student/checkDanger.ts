import type { DangerRule } from '../types';

/**
 * Normalizes text for fair comparison:
 * 1. Converts to lowercase
 * 2. Strips accents (e.g. 'garáje' -> 'garaje')
 * 3. Replaces punctuation with spaces so whole phrases match cleanly
 */
function cleanText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡?!.,;:"'()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safety rules run BEFORE the AI ever sees the question.
 * Loops through the rules in priority order. If any trigger phrase appears,
 * returns that DangerRule immediately. If safe, returns null.
 */
export function checkDanger(text: string, rules: DangerRule[]): DangerRule | null {
  const cleaned = cleanText(text);

  for (const rule of rules) {
    for (const rawWord of rule.words) {
      const cleanedWord = cleanText(rawWord);
      if (cleanedWord && cleaned.includes(cleanedWord)) {
        return rule;
      }
    }
  }

  return null;
}
