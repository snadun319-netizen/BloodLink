// src/history/HistoryFlow.tsx
// Entry point of the Donation History feature. App.tsx renders this for the 'History' screen.
// It brings its own theme + safe-area providers so it does not depend on other modules.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DonorTab } from '../components/DonorBottomNav';
import { ThemeProvider, useTheme } from '../profile/theme';
import { useDonationHistory } from './hooks/useDonationHistory';
import HistoryScreen from './screens/HistoryScreen';

interface Props {
  onBack?: () => void;
  onNavigateTab?: (tab: DonorTab) => void;
  onNavigateToProfile?: () => void;
}

function Inner({ onBack, onNavigateTab, onNavigateToProfile }: Props) {
  const { isDark, colors } = useTheme();
  const state = useDonationHistory();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <HistoryScreen
        state={state}
        onBack={onBack}
        onNavigateTab={onNavigateTab}
        onNavigateToProfile={onNavigateToProfile}
      />
    </View>
  );
}

export default function HistoryFlow(props: Props) {
  return (
    <SafeAreaProvider>
      <ThemeProvider forceLight={true}>
        <Inner {...props} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
