import type { Mode } from '../lib/types';

export const INK = '#F8FAFC'; // Crisp high-contrast light slate text for dark backgrounds
export const INK_MUTED = '#94A3B8'; // Slate muted subtext
export const INK_DARK = '#0F172A'; // Deep text for bright buttons

export const COLORS = {
  tomato: '#EF4444', // vibrant red for 911 & danger
  sun: '#F59E0B',    // safety amber for alerts & checks
  orange: '#F97316', // warning orange for flood crossings
  mint: '#10B981',   // emerald rescue green for safe/family
  sky: '#38BDF8',    // sky blue for assistant / info
  grape: '#6366F1',  // indigo for parent / plan
  pink: '#EC4899',   // pink for medical / allergy
  white: '#FFFFFF',
  cream: '#FFFBEB',
  navyBg: '#0E1A2B',      // primary civic navy
  navyCard: '#15253C',    // elevated card surface
  navyCardLight: '#1C314E',
  navyBorder: '#274164',  // subtle border
  borderLight: '#3A5A85',
  accentGold: '#FBBF24',
};

export type ModeKey = Mode | 'home';

export type Palette = {
  bg: [string, string, ...string[]];
  blobs: string[];
  text: string;
  textSoft: string;
  card: string;
  cardBorder: string;
  /** body text size, button label size, button min height */
  body: number;
  btnText: number;
  btnH: number;
};

export const PALETTES: Record<ModeKey, Palette> = {
  // Welcome screen: Authoritative Texas emergency navy
  home: {
    bg: ['#0A1320', '#0E1A2B', '#14243B'],
    blobs: ['rgba(56, 189, 248, 0.08)', 'rgba(245, 158, 11, 0.08)', 'rgba(16, 185, 129, 0.08)'],
    text: '#F8FAFC',
    textSoft: '#94A3B8',
    card: '#15253C',
    cardBorder: '#274164',
    body: 20,
    btnText: 24,
    btnH: 84,
  },
  // Kid: high-contrast dark navy with cheerful safety amber & rescue emerald
  kid: {
    bg: ['#0C1626', '#112239', '#19304F'],
    blobs: ['rgba(245, 158, 11, 0.12)', 'rgba(16, 185, 129, 0.12)', 'rgba(56, 189, 248, 0.12)'],
    text: '#FFFFFF',
    textSoft: '#FCD34D',
    card: '#162840',
    cardBorder: '#2D4B73',
    body: 22,
    btnText: 26,
    btnH: 84,
  },
  // Grandparent: deep calm midnight blue, ultra-high contrast, extra-large text
  grandparent: {
    bg: ['#08121E', '#0D1C30', '#132845'],
    blobs: ['rgba(56, 189, 248, 0.12)', 'rgba(255, 255, 255, 0.08)', 'rgba(16, 185, 129, 0.1)'],
    text: '#FFFFFF',
    textSoft: '#93C5FD',
    card: '#14253E',
    cardBorder: '#2C4970',
    body: 28,
    btnText: 32,
    btnH: 96,
  },
  // Parent: clean, structured, elevated slate-navy command center
  parent: {
    bg: ['#09111C', '#0E1A2B', '#15243A'],
    blobs: ['rgba(99, 102, 241, 0.08)', 'rgba(16, 185, 129, 0.08)', 'rgba(56, 189, 248, 0.08)'],
    text: '#F8FAFC',
    textSoft: '#94A3B8',
    card: '#152439',
    cardBorder: '#253B57',
    body: 18,
    btnText: 20,
    btnH: 60,
  },
};

export const FONT = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semi: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};

export const R = { card: 20, btn: 20, chip: 99 };

