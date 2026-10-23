// src/history/HistoryFlow.tsx
// Entry point of the Donation History feature. App.tsx renders this for the 'History' screen.
// It brings its own theme + safe-area providers so it does not depend on other modules.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../profile/theme';
import { useDonationHistory } from './hooks/useDonationHistory';
import HistoryScreen from './screens/HistoryScreen';

function Inner() {
  const { isDark, colors } = useTheme();
  const state = useDonationHistory();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <HistoryScreen state={state} />
    </View>
  );
}

export default function HistoryFlow() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Inner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}