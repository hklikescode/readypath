import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { COLORS, INK } from './theme';
import { Txt } from './ui';
import { thud } from './haptic';
import { t } from '../lib/strings';
import { useApp } from '../lib/store';

// Red strip on every kid and grandparent screen. Opens the dialer with 911. NEVER auto-dials.
export function EmergencyStrip() {
  const { session } = useApp();

  return (
    <View style={s.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(session.lang, 'call911')}
        onPress={() => { thud(); Linking.openURL('tel:911'); }}
        style={({ pressed }) => [s.btn, pressed && { transform: [{ translateY: 2 }] }]}
      >
        <Txt size={22} weight="bold" color={COLORS.white}>🚨 {t(session.lang, 'call911Strip')}</Txt>
      </Pressable>
    </View>
  );
}


const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
  btn: {
    height: 60, borderRadius: 20, backgroundColor: COLORS.tomato, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5,
  },
});

