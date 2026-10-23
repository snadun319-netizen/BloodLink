// src/requests/RequestsFlow.tsx
// Entry point of the Blood Requests feature. App.tsx renders this for the 'Requests' screen.
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DonorTab } from '../components/DonorBottomNav';
import { RequestsScreen } from './screens/RequestsScreen';
import { RequestTabType } from './types/requests';

interface RequestsFlowProps {
  initialTab?: RequestTabType;
  onBack?: () => void;
  onNavigateTab?: (tab: DonorTab) => void;
  onNavigateToProfile?: () => void;
}

export default function RequestsFlow({
  initialTab = 'alerts',
  onBack,
  onNavigateTab,
  onNavigateToProfile,
}: RequestsFlowProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="dark" />
      <RequestsScreen
        initialTab={initialTab}
        onNavigateTab={(tab) => {
          if (tab === 'Home' && onBack) {
            onBack();
          } else if (onNavigateTab) {
            onNavigateTab(tab);
          }
        }}
        onNavigateToProfile={onNavigateToProfile}
      />
    </View>
  );
}
export { RequestsFlow };
