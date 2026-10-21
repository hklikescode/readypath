import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Blobs } from './Blobs';
import { EmergencyStrip } from './EmergencyStrip';
import { PALETTES, INK, COLORS, type ModeKey, type Palette } from './theme';
import { Txt } from './ui';
import { tap } from './haptic';
import { stopSpeaking } from '../lib/speak';

import { useApp } from '../lib/store';
import { t } from '../lib/strings';

const PaletteCtx = createContext<Palette>(PALETTES.home);
export const usePalette = () => useContext(PaletteCtx);

// Lets a child scroll the screen to one of its views, or back to the top.
type ScrollApi = { scrollTo: (ref: React.RefObject<View | null>) => void; scrollToTop: () => void };
const ScrollCtx = createContext<ScrollApi>({ scrollTo: () => {}, scrollToTop: () => {} });
export const useScrollApi = () => useContext(ScrollCtx);

// Drop this where the answer will appear: when `when` becomes truthy, the screen scrolls here.
export function ScrollToHere({ when }: { when: unknown }) {
  const api = useScrollApi();
  const ref = useRef<View>(null);
  useEffect(() => {
    if (!when) return;
    const id = setTimeout(() => api.scrollTo(ref), 350);
    return () => clearTimeout(id);
  }, [when, api]);
  return <View ref={ref} collapsable={false} />;
}

type Props = {
  mode: ModeKey;
  children: React.ReactNode;
  /** red 911 strip at the bottom (kid + grandparent screens) */
  show911?: boolean;
  /** hide the back arrow (home screen) */
  noBack?: boolean;
  onBack?: () => void;
  scroll?: boolean;
};

// Every screen: colorful gradient, floating shapes, clear back button, mode indicator, home shortcut.
export function Screen({ mode, children, show911, noBack, onBack, scroll = true }: Props) {
  const router = useRouter();
  const palette = PALETTES[mode];
  const { session } = useApp();
  const lang = session?.lang ?? 'en';
  const sv = useRef<ScrollView>(null);
  const offset = useRef(0);
  const api = useMemo<ScrollApi>(() => ({
    scrollTo: (ref) => ref.current?.measureInWindow((_x, y) => sv.current?.scrollTo({ y: Math.max(0, offset.current + y - 140), animated: true })),
    scrollToTop: () => sv.current?.scrollTo({ y: 0, animated: true }),
  }), []);

  return (
    <PaletteCtx.Provider value={palette}>
    <ScrollCtx.Provider value={api}>
      <LinearGradient colors={palette.bg} style={StyleSheet.absoluteFill} />
      <Blobs colors={palette.blobs} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.header}>
          {!noBack ? (
            <MotiView from={{ opacity: 0, translateX: -12 }} animate={{ opacity: 1, translateX: 0 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(lang, 'back')}
                onPress={() => { tap(); stopSpeaking(); (onBack ?? (() => router.back()))(); }}
                style={({ pressed }) => [s.back, pressed && { transform: [{ scale: 0.94 }] }]}
              >
                <Txt size={22} weight="bold" color="#F8FAFC" style={{ marginTop: -2, marginRight: 2 }}>‹</Txt>
                <Txt size={15} weight="bold" color="#F8FAFC">{t(lang, 'back')}</Txt>
              </Pressable>
            </MotiView>
          ) : <View style={{ width: 40 }} />}

          {mode !== 'home' && (
            <View style={s.modeBadge}>
              <Txt size={13} weight="bold" color="#94A3B8">
                {mode === 'kid' ? `🧒 ${t(lang, 'kid')}` : mode === 'grandparent' ? `🧓 ${t(lang, 'grandparent')}` : `🧑 ${t(lang, 'parent')}`}
              </Txt>
            </View>
          )}

          {!noBack && mode !== 'home' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(lang, 'navHome')}
              onPress={() => { tap(); stopSpeaking(); router.push('/'); }}
              style={({ pressed }) => [s.homeBtn, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <Txt size={14}>🏠</Txt>
              <Txt size={13} weight="bold" color="#E2E8F0" style={{ marginLeft: 4 }}>{t(lang, 'navHome')}</Txt>
            </Pressable>
          ) : <View style={{ width: 40 }} />}
        </View>
        {scroll ? (
          <ScrollView
            ref={sv}
            onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.content, { flex: 1 }]}>{children}</View>
        )}
        {show911 && <EmergencyStrip />}
      </SafeAreaView>
    </ScrollCtx.Provider>
    </PaletteCtx.Provider>
  );
}

const s = StyleSheet.create({
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#15253C',
    borderWidth: 1.5,
    borderColor: '#274164',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: '#243D5C',
  },
  homeBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#15253C',
    borderWidth: 1.5,
    borderColor: '#274164',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
});

