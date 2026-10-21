import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MotiView } from 'moti';
import { COLORS, INK, R } from './theme';
import { Txt } from './ui';
import { tap } from './haptic';

type Props = {
  label: string;
  sub?: string;
  emoji?: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  /** text size and min height come from the screen's palette */
  fontSize?: number;
  height?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

// A tactile emergency action button with high-contrast typography and subtle 3D depth.
export function BigButton({
  label, sub, emoji, onPress, color = COLORS.sun, textColor, fontSize = 26, height = 84, delay = 0, style, disabled,
}: Props) {
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 2 }] }));

  // Auto-determine accessible text color if not explicitly provided
  const finalTextColor = textColor ?? (
    color === COLORS.white || color === COLORS.sun || color === COLORS.mint || color === COLORS.cream
      ? '#0F172A'
      : '#FFFFFF'
  );

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: disabled ? 0.5 : 1 }}
      transition={{ type: 'timing', duration: 120 }}
      style={[{ marginBottom: 12 }, style]}
    >
      <Pressable
        disabled={disabled}
        onPressIn={() => { press.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { press.value = withSpring(0, { damping: 20, stiffness: 400 }); }}
        onPress={() => { tap(); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={sub ? `${label}. ${sub}` : label}
      >

        <View style={[s.shadow, { minHeight: height + 5 }]}>
          <Animated.View style={[s.face, { backgroundColor: color, minHeight: height }, face]}>
            {emoji ? <Txt size={fontSize + 8} style={{ marginRight: 14 }}>{emoji}</Txt> : null}
            <View style={{ flex: 1 }}>
              <Txt size={fontSize} weight="bold" color={finalTextColor}>{label}</Txt>
              {sub ? <Txt size={Math.max(14, fontSize * 0.6)} weight="medium" color={finalTextColor} style={{ opacity: 0.9, marginTop: 2 }}>{sub}</Txt> : null}
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </MotiView>
  );
}

const s = StyleSheet.create({
  shadow: { backgroundColor: '#060C14', borderRadius: R.btn, justifyContent: 'flex-start' },
  face: {
    flexDirection: 'row', alignItems: 'center', borderRadius: R.btn, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20, paddingVertical: 14,
  },
});

