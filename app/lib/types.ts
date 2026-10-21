// Shared shapes. They match data/demoFamily.json, data/crossings.json and data/script911.json.
export type Lang = 'en' | 'es';
export type Mode = 'kid' | 'grandparent' | 'parent';
export type Role = 'parent' | 'grandparent' | 'kid';
export type Bilingual = { en: string; es?: string };

export type Person = {
  id: string;
  name: string;
  role: Role;
  age: number;
  language: Lang;
  allergies?: string;
  allergySteps?: Bilingual;
  powerDevices?: string[];
  powerBackupPlan?: string;
};

export type Contact = { name: string; label: string; phone: string; order: number; outOfTown: boolean };

export type PlanEntry = { id: string; icon?: string; title: Bilingual; keywords: string[]; text: Bilingual };

export type Crossing = { id: string; label: string; lat: number; lon: number };

export type PlaceCategory = 'tornado' | 'food' | 'hurricane' | 'warming' | 'cooling';

export type CommunityPlace = {
  id: string;
  category: PlaceCategory;
  name: string;
  address: string;
  phone?: string;
  lat: number;
  lon: number;
  description: Bilingual;
  openNote?: Bilingual;
};

export type ShelterRoute = {
  place: CommunityPlace;
  distanceM: number;
  hasCrossingRisk: boolean;
  crossingName?: string;
  warningNote?: Bilingual;
  detourAdvice?: Bilingual;
};

export type Household = {
  address: string;
  people: Person[];
  contacts: Contact[];
  supplies: { waterGallons: number; foodDays: number };
  plan: PlanEntry[];
  floodPlan: Bilingual | null;
  // added by the parent screen (the demo family loads these from crossings.json)
  crossings: Crossing[];
  noCrossingsNearMe: boolean;
  routeB: Bilingual | null;
  // saved once while online by lib/nearby.ts (the demo family leaves these empty and uses the bundled data)
  home?: { lat: number; lon: number };
  nearby?: { places: CommunityPlace[]; fetchedAt: string };
};

export type DangerRule = {
  id: string;
  action: 'call911' | 'callPoison' | 'firmNo';
  words: string[];
  message: { en: string; es: string };
};

export type ChecklistRule = {
  id: string;
  label: { en: string; es: string };
  check: string;
  fixScreen: string;
};

export type Script911 = {
  template: string;
  phrases: Record<string, string>;
  relations: Record<string, string>;
};

export const emptyHousehold = (): Household => ({
  address: '',
  people: [],
  contacts: [],
  supplies: { waterGallons: 0, foodDays: 0 },
  plan: [],
  floodPlan: null,
  crossings: [],
  noCrossingsNearMe: false,
  routeB: null,
});

// Pick the text in the person's language; fall back to English.
export const pick = (b: Bilingual | undefined | null, lang: Lang): string =>
  !b ? '' : (lang === 'es' && b.es) || b.en;
