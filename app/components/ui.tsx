import React from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, FONT, INK, R } from './theme';
import { tap } from './haptic';

type Weight = 'regular' | 'medium' | 'semi' | 'bold';

// Text that always uses the rounded Fredoka font.
export function Txt({
  children, size = 18, weight = 'semi', color = INK, align, style, numberOfLines,
}: {
  children: React.ReactNode; size?: number; weight?: Weight; color?: string; align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: FONT[weight], fontSize: size, color, textAlign: align, lineHeight: size * 1.25 }, style]}>
      {children}
    </Text>
  );
}

// A high-contrast emergency card: elevated dark surface with subtle border.
export function Card({ children, color = COLORS.navyCard, borderColor = COLORS.navyBorder, style }: {
  children: React.ReactNode; color?: string; borderColor?: string; style?: StyleProp<ViewStyle>; delay?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 150 }}
      style={[s.cardShadow]}
    >
      <View style={[s.card, { backgroundColor: color, borderColor }, style]}>{children}</View>
    </MotiView>
  );
}


export function Chip({ label, selected, onPress, color = COLORS.sun, emoji, size = 15, style }: {
  label: string; selected?: boolean; onPress: () => void; color?: string; emoji?: string; size?: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        s.chip,
        {
          backgroundColor: selected ? color : 'rgba(255, 255, 255, 0.08)',
          borderColor: selected ? color : COLORS.navyBorder,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        style,
      ]}
    >
      <Txt size={size} weight={selected ? 'bold' : 'medium'} color={selected ? (color === COLORS.white || color === COLORS.sun ? '#0F172A' : '#FFFFFF') : '#E2E8F0'}>
        {emoji ? `${emoji} ` : ''}{label}
      </Txt>
    </Pressable>
  );
}

export function Field({ label, wrapRef, inputRef, ...props }: { label: string; wrapRef?: React.Ref<View>; inputRef?: React.Ref<TextInput> } & TextInputProps) {
  return (
    <View ref={wrapRef} collapsable={false} style={{ marginBottom: 12 }}>
      <Txt size={14} weight="medium" color="#94A3B8" style={{ marginBottom: 6 }}>{label}</Txt>
      <TextInput
        ref={inputRef}
        placeholderTextColor="#64748B"
        {...props}
        style={[s.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

// Small amber badge shown while a decision function is still a stub.
export function NotBuilt({ label = 'Not built yet' }: { label?: string }) {
  return (
    <View style={s.notBuilt}>
      <Txt size={13} weight="semi" color="#FCD34D">🚧 {label}</Txt>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  cardShadow: { backgroundColor: '#070E18', borderRadius: R.card, paddingBottom: 4, marginBottom: 14 },
  card: { borderRadius: R.card, borderWidth: 1.5, borderColor: COLORS.navyBorder, padding: 18, marginBottom: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.chip, borderWidth: 1.5, borderColor: COLORS.navyBorder },
  input: {
    backgroundColor: '#0D1826', borderWidth: 1.5, borderColor: '#2B4468', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONT.medium, fontSize: 18, color: '#FFFFFF',
  },
  notBuilt: {
    alignSelf: 'flex-start', backgroundColor: '#261F12', borderWidth: 1.5, borderColor: '#F59E0B', borderStyle: 'dashed',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginVertical: 6,
  },
});
