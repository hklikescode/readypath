// The JSON files in data/ are copied here by scripts/sync-data.js.
import dangerJson from '../data/danger_rules.json';
import checklistJson from '../data/checklist_rules.json';
import scriptJson from '../data/script911.json';
import crossingsJson from '../data/crossings.json';
import demoJson from '../data/demoFamily.json';
import communityJson from '../data/community.json';
import { emptyHousehold, type ChecklistRule, type DangerRule, type Household, type Script911, type Crossing, type Bilingual, type CommunityPlace } from './types';

// Drive check warns this far from a saved crossing: 450 m is about 1,500 ft.
export const WARN_RADIUS_M = 450;
export const warnRadiusFt = () => Math.round((WARN_RADIUS_M * 3.28084) / 100) * 100;

// The red NO card already says "NO!" as its heading, so drop the "NO." the rule text starts with.
export const cardText = (rule: DangerRule, lang: 'en' | 'es'): string =>
  rule.action === 'firmNo' ? rule.message[lang].replace(/^¡?NO[.!]\s*/i, '') : rule.message[lang];

export const dangerRules = dangerJson.rules as DangerRule[];
export const checklistRules = checklistJson.rules as ChecklistRule[];
export const script911 = scriptJson as unknown as Script911;
export const testDrive = crossingsJson.testDrive as { lat: number; lon: number }[];
export const communityPlaces = communityJson.places as CommunityPlace[];

export function demoHousehold(): Household {
  const d = demoJson as unknown as Partial<Household>;
  return {
    ...emptyHousehold(),
    address: d.address ?? '',
    people: d.people ?? [],
    contacts: d.contacts ?? [],
    supplies: d.supplies ?? { waterGallons: 0, foodDays: 0 },
    plan: d.plan ?? [],
    floodPlan: (d.floodPlan as Bilingual | null) ?? null,
    crossings: crossingsJson.crossings as Crossing[],
    routeB: crossingsJson.routeB as Bilingual,
  };
}
