import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { AppProvider, useApp } from '../lib/store';
import { loadModelIfInstalled } from '../lib/ai';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { loaded } = useApp();
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });

  useEffect(() => {
    if (loaded && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, fontsLoaded]);

  // Load the AI model once, in the background, at app start (not on every Ask screen).
  useEffect(() => { loadModelIfInstalled(); }, []);

  if (!loaded || !fontsLoaded) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0E1A2B' } }} />
    </>

  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Gate />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
