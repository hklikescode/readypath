import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { demoHousehold } from './rules';
import { addToLog, type AiLogEntry } from './aiLog';
import { emptyHousehold, type Household, type Lang, type Mode, type Person, type ShelterRoute } from './types';
import { computeAllShelterRoutes, resolveAddressCoordinates } from './shelterRouting';

const HOUSEHOLD_KEY = 'readypath.v2.household';
const SESSION_KEY = 'readypath.v2.session';
const LOG_KEY = 'readypath.v2.aiLog';

export type Session = { mode: Mode | null; personId: string | null; lang: Lang };
const emptySession: Session = { mode: null, personId: null, lang: 'en' };

type Ctx = {
  loaded: boolean;
  household: Household;
  session: Session;
  person: Person | null;
  homeCoords: { lat: number; lon: number };
  shelterRoutes: ShelterRoute[];
  log: AiLogEntry[];
  addLog: (e: Omit<AiLogEntry, 'id' | 'at'>) => void;
  clearLog: () => void;
  updateHousehold: (fn: (h: Household) => Household) => void;
  setSession: (s: Partial<Session>) => void;
  loadDemo: () => void;
  resetAll: () => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [household, setHousehold] = useState<Household>(emptyHousehold());
  const [session, setSessionState] = useState<Session>(emptySession);
  const [log, setLog] = useState<AiLogEntry[]>([]);
  const logRef = useRef(log);
  const hRef = useRef(household);
  hRef.current = household;

  useEffect(() => {
    (async () => {
      try {
        const [h, s, l] = await Promise.all([AsyncStorage.getItem(HOUSEHOLD_KEY), AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(LOG_KEY)]);
        if (l) { logRef.current = JSON.parse(l); setLog(logRef.current); }
        if (h) {
          const parsed = JSON.parse(h);
          // If stored data has old "Demo Street" placeholder, upgrade to current demo household
          if (!parsed.address || parsed.address.includes('Demo Street')) {
            const demo = demoHousehold();
            setHousehold(demo);
            saveHousehold(demo);
          } else {
            setHousehold({ ...emptyHousehold(), ...parsed });
          }
        }
        if (s) setSessionState({ ...emptySession, ...JSON.parse(s) });
      } catch {
        // first run or unreadable: start empty
      }
      setLoaded(true);
    })();
  }, []);

  const saveHousehold = (h: Household) => AsyncStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(h)).catch(() => {});

  const updateHousehold = useCallback((fn: (h: Household) => Household) => {
    const next = fn(hRef.current);
    hRef.current = next;
    setHousehold(next);
    saveHousehold(next);
  }, []);

  const setSession = useCallback((s: Partial<Session>) => {
    setSessionState((prev) => {
      const next = { ...prev, ...s };
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addLog = useCallback((e: Omit<AiLogEntry, 'id' | 'at'>) => {
    const now = new Date();
    logRef.current = addToLog(logRef.current, { ...e, id: `${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`, at: now.toISOString() });
    setLog(logRef.current);
    AsyncStorage.setItem(LOG_KEY, JSON.stringify(logRef.current)).catch(() => {});
  }, []);
  const clearLog = useCallback(() => {
    logRef.current = [];
    setLog([]);
    AsyncStorage.removeItem(LOG_KEY).catch(() => {});
  }, []);

  const loadDemo = useCallback(() => updateHousehold(() => demoHousehold()), [updateHousehold]);
  const resetAll = useCallback(() => {
    updateHousehold(() => emptyHousehold());
    setSession({ mode: null, personId: null });
    clearLog();
  }, [updateHousehold, setSession, clearLog]);

  const person = useMemo(
    () => household.people.find((p) => p.id === session.personId) ?? null,
    [household.people, session.personId],
  );

  const homeCoords = useMemo(
    () => household.home ?? resolveAddressCoordinates(household.address),
    [household.home, household.address],
  );

  const shelterRoutes = useMemo(
    () => computeAllShelterRoutes(homeCoords, household.crossings, household.routeB, household.nearby?.places),
    [homeCoords, household.crossings, household.routeB, household.nearby],
  );

  const value: Ctx = {
    loaded,
    household,
    session,
    person,
    homeCoords,
    shelterRoutes,
    log,
    addLog,
    clearLog,
    updateHousehold,
    setSession,
    loadDemo,
    resetAll,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}
