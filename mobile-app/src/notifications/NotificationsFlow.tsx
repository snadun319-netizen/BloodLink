// src/notifications/NotificationsFlow.tsx
// Entry point of the Notification tab. App.tsx renders this for the 'Notifications' screen.
// It brings its own theme + safe-area providers so it does not depend on other modules.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../profile/theme';
import { useNotifications } from './hooks/useNotifications';
import NotificationsScreen from './screens/NotificationsScreen';

interface Props {
    onBack?: () => void;
    onViewRequest?: (requestId?: string) => void;
}

function Inner({ onBack, onViewRequest }: Props) {
    const { isDark, colors } = useTheme();
    const state = useNotifications();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <NotificationsScreen state={state} onBack={onBack} onViewRequest={onViewRequest} />
        </View>
    );
}

export default function NotificationsFlow(props: Props) {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <Inner {...props} />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}