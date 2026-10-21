import type { StringKey } from './strings';
import type { Lang, Mode } from './types';

// Every question the app handles is logged on this phone, with what the AI did (or why it was skipped).
export type Outcome =
  | 'answered'          // AI answered and the made-up-number check passed
  | 'blocked'           // AI answered, but the number check blocked it -> plan text shown
  | 'low-confidence'    // AI said LOW (or no HIGH) -> plan text shown
  | 'skipped-danger'    // a danger word matched, so the AI never ran
  | 'skipped-no-plan'   // nothing in our plan matched, so the AI never ran
  | 'skipped-no-model'  // no AI model on this phone -> plan text shown
  | 'skipped-timeout'   // AI too slow or failed -> plan text shown
  | 'skipped-kid';      // Kid mode never uses the AI

export type AiLogEntry = {
  id: string;
  at: string; // ISO time
  mode: Mode;
  lang: Lang;
  question: string;
  outcome: Outcome;
  ruleId?: string;      // which danger rule matched
  entries?: string[];   // which plan entries were picked
  raw?: string;         // the model's raw reply (debug)
};

export const OUTCOME_KEY: Record<Outcome, StringKey> = {
  answered: 'outAnswered',
  blocked: 'outBlocked',
  'low-confidence': 'outLowConf',
  'skipped-danger': 'outSkipDanger',
  'skipped-no-plan': 'outSkipNoPlan',
  'skipped-no-model': 'outSkipNoModel',
  'skipped-timeout': 'outSkipTimeout',
  'skipped-kid': 'outSkipKid',
};

// "Skipped" = the AI did not produce the answer the person saw. (A blocked answer means it ran but was not shown.)
export const wasSkipped = (o: Outcome): boolean => o !== 'answered' && o !== 'blocked' && o !== 'low-confidence';

export const skippedCount = (log: AiLogEntry[]): number => log.filter((e) => wasSkipped(e.outcome)).length;

export const MAX_LOG = 200;
export const addToLog = (log: AiLogEntry[], e: AiLogEntry): AiLogEntry[] => [e, ...log].slice(0, MAX_LOG);

// Plain-text export so the log can be reviewed later (shared to email, notes, etc.).
export const logToText = (log: AiLogEntry[], label: (o: Outcome) => string): string =>
  log
    .map((e) => `${e.at} | ${e.mode} | ${label(e.outcome)} | "${e.question}"${e.ruleId ? ` | rule: ${e.ruleId}` : ''}${e.entries?.length ? ` | notes: ${e.entries.join(', ')}` : ''}`)
    .join('\n');
