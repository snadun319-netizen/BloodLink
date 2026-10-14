
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DonorBottomNav, { DonorTab } from '../../components/DonorBottomNav';
import { ProfileHeaderCard, StatCard, VerificationSection } from '../components';
import { ProfileState } from '../hooks/useProfile';
import { ColorPalette, radius, useTheme } from '../theme';
import { estimateLivesSaved, getEligibility } from '../utils/eligibility';
import { formatDate } from '../utils/format';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

interface Props {
    state: ProfileState;
    onBack: () => void;
    onNavigateTab: (tab: DonorTab) => void;
    onEdit: () => void;
    onSignOut: () => Promise<void>;
}

export default function ProfileScreen({ state, onBack, onNavigateTab, onEdit, onSignOut }: Props) {
    const { colors, isDark, toggleTheme } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { profile, loading, refreshing, uploading, error } = state;

    const handleToggleAvailability = async (value: boolean) => {
        try {
            await state.toggleAvailability(value);
        } catch {
            Alert.alert('Could not update availability', 'Please check your connection and try again.');
        }
    };

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ALLOWED_TYPES,
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];
            const size = asset.size ?? 0;
            const mimeType = asset.mimeType ?? 'application/octet-stream';

            if (!ALLOWED_TYPES.includes(mimeType)) {
                Alert.alert('Unsupported file', 'Please upload a PDF, JPG or PNG file.');
                return;
            }
            if (size > MAX_FILE_BYTES) {
                Alert.alert('File too large', 'The document must be 5 MB or smaller.');
                return;
            }

            await state.uploadDocument({ uri: asset.uri, name: asset.name, size, mimeType });
            Alert.alert('Document submitted', 'An administrator will review it shortly.');
        } catch (e) {
            Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.');
        }
    };

    const confirmSignOut = () => {
        Alert.alert('Sign out', 'Do you want to sign out of BloodLink?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out', style: 'destructive',
                onPress: () => {
                    void onSignOut().catch(() => Alert.alert('Could not sign out', 'Please try again.'));
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <View style={styles.titleRow}>
                <Text style={styles.title}>Profile</Text>
                <Pressable
                    onPress={toggleTheme}
                    style={styles.themeButton}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle light and dark theme"
                    accessibilityState={{ selected: isDark }}
                >
                    <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.text} />
                </Pressable>
            </View>

            {loading && !profile ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error && !profile ? (
                <View style={styles.center}>
                    <Text style={styles.errorTitle}>Could not load your profile</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retry} onPress={state.reload} accessibilityRole="button">
                        <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                </View>
            ) : profile ? (
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={state.refresh} tintColor={colors.primary} />
                    }
                >
                    <ProfileHeaderCard
                        profile={profile}
                        onToggleAvailability={handleToggleAvailability}
                        onEdit={onEdit}
                    />

                    <View style={styles.grid}>
                        <StatCard
                            label="Donations"
                            value={String(profile.totalDonations)}
                            caption="Lifetime verified"
                            icon={<Ionicons name="water" size={18} color={colors.primary} />}
                            iconBackground={colors.primarySoft}
                        />
                        <StatCard
                            label="Lives saved"
                            value={`${estimateLivesSaved(profile.totalDonations)}+`}
                            caption="Patients touched"
                            icon={<Ionicons name="heart" size={18} color={colors.primary} />}
                            iconBackground={colors.primarySoft}
                        />
                    </View>

                    <View style={styles.grid}>
                        <LastDonationCard profile={profile} />
                        <EligibilityCard lastDonationDate={profile.lastDonationDate} />
                    </View>

                    <Text style={styles.disclaimer}>
                        Eligibility is a reminder only. Final eligibility is decided by qualified blood bank staff.
                    </Text>

                    <VerificationSection profile={profile} uploading={uploading} onUpload={handleUpload} />

                    <Pressable onPress={confirmSignOut} style={styles.signOut} accessibilityRole="button">
                        <Ionicons name="log-out-outline" size={20} color={colors.text} />
                        <Text style={styles.signOutText}>Sign out</Text>
                    </Pressable>

                    <Text style={styles.footer}>
                        BloodLink v1.0 • Protected under the Personal Data Protection Act No. 9 of 2022
                    </Text>
                </ScrollView>
            ) : null}
            <DonorBottomNav
                activeTab="Profile"
                colors={colors}
                onSelect={(tab) => {
                    if (tab === 'Home') onBack();
                    else if (tab !== 'Profile') onNavigateTab(tab);
                }}
            />
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------- sub cards
function LastDonationCard({ profile }: { profile: NonNullable<ProfileState['profile']> }) {
    const { colors } = useTheme();
    return (
        <StatCard
            compact
            label="Last donation"
            value={profile.lastDonationDate ? formatDate(profile.lastDonationDate) : 'No donations yet'}
            caption={profile.lastDonationPlace ?? undefined}
            icon={<Ionicons name="time-outline" size={18} color={colors.textMuted} />}
            iconBackground={colors.background}
        />
    );
}

function EligibilityCard({ lastDonationDate }: { lastDonationDate: string | null }) {
    const { colors } = useTheme();
    const result = getEligibility(lastDonationDate);

    const dot = (
        <View
            style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: result.eligible ? colors.success : colors.warning,
            }}
        />
    );

    return (
        <StatCard
            compact
            label="Eligibility"
            value={result.eligible ? 'Eligible now' : `In ${result.daysRemaining} day${result.daysRemaining === 1 ? '' : 's'}`}
            valueColor={result.eligible ? colors.success : colors.warning}
            caption={
                result.eligible
                    ? 'Ready to save lives'
                    : result.nextEligibleDate
                        ? `Next: ${formatDate(result.nextEligibleDate)}`
                        : undefined
            }
            right={dot}
        />
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        titleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
        },
        title: { fontSize: 22, lineHeight: 30, fontWeight: '600', color: c.text },
        themeButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
        grid: { flexDirection: 'row', gap: 14 },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
        errorTitle: { fontSize: 18, fontWeight: '600', color: c.text, marginBottom: 6 },
        errorText: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginBottom: 16 },
        retry: { backgroundColor: c.primary, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 },
        retryText: { color: c.onPrimary, fontWeight: '700' },
        disclaimer: { fontSize: 12, lineHeight: 18, color: c.textMuted, textAlign: 'center', paddingHorizontal: 8 },
        signOut: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            height: 56,
        },
        signOutText: { fontSize: 14, fontWeight: '600', color: c.text },
        footer: { fontSize: 11, lineHeight: 17, color: c.textMuted, textAlign: 'center' },
    });
