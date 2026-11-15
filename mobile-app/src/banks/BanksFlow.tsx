// src/banks/BanksFlow.tsx
// Entry point of the Blood Banks feature. App.tsx renders this for the 'Banks' screen.
// Follows the same pattern as src/history/HistoryFlow.tsx: SafeAreaProvider + ThemeProvider.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DonorTab } from '../components/DonorBottomNav';
import { ThemeProvider, useTheme } from '../profile/theme';
import { useBloodBanks } from './hooks/useBloodBanks';
import BanksScreen from './screens/BanksScreen';

interface Props {
  onBack?: () => void;
  onNavigateTab?: (tab: DonorTab) => void;
  onNavigateToProfile?: () => void;
}

function Inner({ onBack, onNavigateTab, onNavigateToProfile }: Props) {
  const { isDark, colors } = useTheme();
  const state = useBloodBanks();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <BanksScreen
        state={state}
        onBack={onBack}
        onNavigateTab={onNavigateTab}
        onNavigateToProfile={onNavigateToProfile}
      />
    </View>
  );
}

export default function BanksFlow(props: Props) {
  return (
    <SafeAreaProvider>
      <ThemeProvider forceLight={true}>
        <Inner {...props} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
export { BanksFlow };

