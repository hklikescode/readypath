import React from 'react';
import { Pressable, View } from 'react-native';
import { MotiView } from 'moti';
import { Card, Txt } from '../ui';
import { tap } from '../haptic';

// Tap the header to open or close. Opening bounces in gently.
export function Section({ emoji, title, open, onToggle, children, delay = 0 }: {
  emoji: string; title: string; open: boolean; onToggle: () => void; children: React.ReactNode; delay?: number;
}) {
  return (
    <Card delay={delay} style={{ padding: 0 }}>
      <Pressable onPress={() => { tap(); onToggle(); }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
          <Txt size={28} style={{ marginRight: 12 }}>{emoji}</Txt>
          <Txt size={22} weight="bold" style={{ flex: 1 }}>{title}</Txt>
          <MotiView animate={{ rotate: open ? '90deg' : '0deg' }} transition={{ type: 'spring', damping: 14 }}>
            <Txt size={28} weight="bold">›</Txt>
          </MotiView>
        </View>
      </Pressable>
      {open && (
        <MotiView from={{ opacity: 0, translateY: -8 }} animate={{ opacity: 1, translateY: 0 }} style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {children}
        </MotiView>
      )}
    </Card>
  );
}
