import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { COLORS, INK, INK_DARK } from './theme';
import { Txt } from './ui';
import { tap } from './haptic';
import { speak, stopSpeaking } from '../lib/speak';
import { t } from '../lib/strings';
import type { Lang } from '../lib/types';

// 🔊 "Read to me". `lang` is the language the TEXT is in (the 911 sentence is always 'en').
export function SpeakButton({ text, lang, uiLang = lang, size = 20, color = COLORS.sky }: {
  text: string; lang: Lang; uiLang?: Lang; size?: number; color?: string;
}) {
  const [on, setOn] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        if (on) { stopSpeaking(); setOn(false); return; }
        setOn(true);
        speak(text, lang, () => setOn(false));
      }}
      style={({ pressed }) => [s.btn, { backgroundColor: color }, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <Txt size={size} weight="bold" color={INK_DARK}>{on ? '⏹' : '🔊'} {on ? t(uiLang, 'stopReading') : t(uiLang, 'readToMe')}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99,
    borderWidth: 3, borderColor: INK, marginVertical: 6,
  },
});
