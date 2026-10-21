import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

// Subtle emergency radar and signal wave rings in the background
function RadarPulse({ delay = 0, size = 320, left = '50%', top = '20%' }: { delay?: number; size?: number; left?: `${number}%` | string; top?: `${number}%` | string }) {
  const pulse = useSharedValue(0.9);
  const opacity = useSharedValue(0.12);

  useEffect(() => {
    pulse.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1.08, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.92, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ), -1
    ));
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.18, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.08, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ), -1
    ));
  }, [delay, pulse, opacity]);

  const st = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: left as any, top: top as any, marginLeft: -size / 2, marginTop: -size / 2 }, st]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle cx="100" cy="100" r="90" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4 6" />
        <Circle cx="100" cy="100" r="60" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
        <Circle cx="100" cy="100" r="30" fill="none" stroke="#38BDF8" strokeWidth="1" />
      </Svg>
    </Animated.View>
  );
}

export function Blobs({ colors: _colors }: { colors: string[] }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <RadarPulse delay={0} size={420} left="85%" top="12%" />
      <RadarPulse delay={1600} size={340} left="15%" top="75%" />
    </View>
  );
}

