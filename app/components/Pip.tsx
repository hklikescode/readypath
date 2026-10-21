import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { COLORS } from './theme';
import { Txt } from './ui';

// ReadyPath Assistant Beacon: A calm, reassuring emergency compass / shield beacon
export function Pip({ size = 52, color = COLORS.sky, mood = 'happy' }: { size?: number; color?: string; mood?: 'happy' | 'worried' }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const beaconColor = mood === 'worried' ? COLORS.tomato : color;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View
        style={[
          s.outerRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: beaconColor,
          },
          ringStyle,
        ]}
      />
      <View
        style={[
          s.innerShield,
          {
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: (size * 0.76) / 2,
            backgroundColor: beaconColor,
          },
        ]}
      >
        <Txt size={size * 0.42}>{mood === 'worried' ? '⚠️' : '🛡️'}</Txt>
      </View>
    </View>
  );
}

// Reassuring Emergency Assistant card with high-contrast text
export function PipSays({ text, color = COLORS.sky, mood = 'happy', size = 50 }: { text: string; color?: string; mood?: 'happy' | 'worried'; size?: number }) {
  return (
    <View style={s.row}>
      <Pip size={size} color={color} mood={mood} />
      <View style={s.bubbleWrap}>
        <View style={[s.bubble, mood === 'worried' && { borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
          <Txt size={16} weight="semi" color="#F8FAFC">{text}</Txt>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.4,
  },
  innerShield: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 4 },
  bubbleWrap: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  bubble: {
    backgroundColor: '#15253C',
    borderWidth: 1.5,
    borderColor: '#2B4366',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

