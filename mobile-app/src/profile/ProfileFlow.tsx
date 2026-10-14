
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useProfile } from './hooks/useProfile';
import EditProfileScreen from './screens/EditProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import { ThemeProvider, useTheme } from './theme';

interface Props {
    onSignOut: () => void;
}

function Inner({ onSignOut }: Props) {
    const { isDark, colors } = useTheme();
    const profileState = useProfile(); // shared by Profile and Edit screens
    const [screen, setScreen] = useState<'profile' | 'edit'>('profile');

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {screen === 'edit' && profileState.profile ? (
                <EditProfileScreen
                    profile={profileState.profile}
                    onSave={profileState.saveProfile}
                    onClose={() => setScreen('profile')}
                />
            ) : (
                <ProfileScreen state={profileState} onEdit={() => setScreen('edit')} onSignOut={onSignOut} />
            )}
        </View>
    );
}

export default function ProfileFlow(props: Props) {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <Inner {...props} />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}