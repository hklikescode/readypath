import * as Speech from 'expo-speech';
import type { Lang } from './types';

// Reads text aloud on this phone (no internet). The 911 sentence is always read in English.
export function speak(text: string, lang: Lang, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: lang === 'es' ? 'es-US' : 'en-US',
    rate: 0.9,
    pitch: 1.05,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export const stopSpeaking = () => Speech.stop();
