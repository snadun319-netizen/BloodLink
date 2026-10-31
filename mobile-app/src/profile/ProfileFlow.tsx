import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DonorTab } from '../components/DonorBottomNav';
import { useProfile } from './hooks/useProfile';
import EditProfileScreen from './screens/EditProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import { ThemeProvider, useTheme } from './theme';

interface Props {
    onBack: () => void;
    onNavigateTab: (tab: DonorTab) => void;
    onSignOut: () => void;
    onSignIn?: () => void;
}

function Inner({ onBack, onNavigateTab, onSignOut, onSignIn }: Props) {
    const { signOut, isAuthenticated } = useAuth();
    const { isDark, colors } = useTheme();
    const profileState = useProfile(isAuthenticated); // shared by Profile and Edit screens
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
                <ProfileScreen
                    state={profileState}
                    onBack={onBack}
                    onNavigateTab={onNavigateTab}
                    onEdit={() => setScreen('edit')}
                    onSignOut={async () => {
                        await signOut();
                        onSignOut();
                    }}
                    isAuthenticated={isAuthenticated}
                    onSignIn={onSignIn}
                />
            )}
        </View>
    );
}

export default function ProfileFlow(props: Props) {
    return (
        <ThemeProvider>
            <Inner {...props} />
        </ThemeProvider>
    );
}
