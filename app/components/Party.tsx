import React from 'react';
import { StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

// Confetti burst. Render it when something good happens (reached family, checklist done).
export function Party({ fire }: { fire: boolean }) {
  if (!fire) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ConfettiCannon
        count={90}
        origin={{ x: -10, y: -10 }}
        fadeOut
        fallSpeed={2600}
        colors={['#FF5D5D', '#FFC233', '#35D6A0', '#4DB6FF', '#9B6BFF', '#FF7EB6']}
      />
    </View>
  );
}
