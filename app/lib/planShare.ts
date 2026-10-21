// Share a family plan as text and import it on another phone. Pure functions, no network.
// The PIN and the AI log are not part of Household, so they are never in the code.
import { emptyHousehold, type Household } from './types';

const HEADER = 'READYPATH-PLAN v1';

export type ShareOptions = { leaveOutAddress?: boolean };

export function encodePlan(h: Household, opts: ShareOptions = {}): string {
  const { home: _home, ...rest } = h; // saved GPS point is private too
  const out: Household = opts.leaveOutAddress ? { ...(rest as Household), address: '' } : (rest as Household);
  return `${HEADER}\n${JSON.stringify(out)}`;
}

// Returns the household, or an error string a parent can read.
export function decodePlan(text: string): { ok: true; household: Household } | { ok: false; error: string } {
  const s = (text ?? '').trim();
  if (!s.startsWith(HEADER)) return { ok: false, error: 'This is not a ReadyPath plan. Paste the whole message you were sent.' };
  let raw: any;
  try { raw = JSON.parse(s.slice(HEADER.length)); } catch { return { ok: false, error: 'The plan is cut off. Copy the whole message and try again.' }; }
  if (!raw || !Array.isArray(raw.people) || !Array.isArray(raw.contacts) || !Array.isArray(raw.plan)) {
    return { ok: false, error: 'This plan is incomplete.' };
  }
  return { ok: true, household: { ...emptyHousehold(), ...raw } };
}
