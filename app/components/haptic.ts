import * as Haptics from 'expo-haptics';

// Tiny buzzes make buttons feel alive. Never crash if the phone can't do it.
export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const thud = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
export const warn = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
export const yay = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
