// src/history/screens/HistoryScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DonorBottomNav, { DonorTab } from '../../components/DonorBottomNav';
import { useAuth } from '../../context/AuthContext';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
import { getInitials } from '../../profile/utils/format';
import { DonationCard, ImpactCard } from '../components';
import { HistoryState } from '../hooks/useDonationHistory';
import { fetchDonorRecordUrl } from '../services/historyService';
import { DonationRecord } from '../types/history';

interface Props {
    state: HistoryState;
    onBack?: () => void;
    onNavigateTab?: (tab: DonorTab) => void;
    onNavigateToProfile?: () => void;
}

async function openUrl(url: string) {
    try {
        await Linking.openURL(url);
    } catch {
        Alert.alert('Could not open the link', 'Please try again later.');
    }
}

export default function HistoryScreen({ state, onBack, onNavigateTab, onNavigateToProfile }: Props) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { data, loading, refreshing, error } = state;
    const [downloading, setDownloading] = useState(false);

    const initials = user?.fullName?.trim() ? getInitials(user.fullName) : null;

    const handleViewCertificate = (record: DonationRecord) => {
        if (!record.certificateUrl) {
            Alert.alert(
                'Certificate not available',
                record.status === 'pending'
                    ? 'This donation is still waiting for verification.'
                    : 'The certificate for this donation is not available yet.',
            );
            return;
        }
        openUrl(record.certificateUrl);
    };

    const handleDownloadRecord = async () => {
        setDownloading(true);
        try {
            const url = await fetchDonorRecordUrl();
            if (!url) {
                Alert.alert('Not available yet', 'Your official donor record will be available once it is generated.');
                return;
            }
            await openUrl(url);
        } catch (e) {
            Alert.alert('Download failed', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <View style={styles.titleRow}>
                <Text style={styles.title} maxFontSizeMultiplier={1.2}>History</Text>
                <TouchableOpacity
                    style={styles.avatar}
                    accessibilityRole="button"
                    accessibilityLabel="Open your profile"
                    activeOpacity={0.8}
                    onPress={() => {
                        if (onNavigateToProfile) {
                            onNavigateToProfile();
                        } else if (onNavigateTab) {
                            onNavigateTab('Profile');
                        }
                    }}
                >
                    {initials ? (
                        <Text style={styles.avatarText} maxFontSizeMultiplier={1.2}>
                            {initials}
                        </Text>
                    ) : (
                        <Ionicons name="person" size={20} color={colors.onPrimary} />
                    )}
                </TouchableOpacity>
            </View>

            {loading && !data ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error && !data ? (
                <View style={styles.center}>
                    <Text style={styles.errorTitle} maxFontSizeMultiplier={1.2}>Could not load your history</Text>
                    <Text style={styles.errorText} maxFontSizeMultiplier={1.2}>{error}</Text>
                    <Pressable style={styles.retry} onPress={state.reload} accessibilityRole="button">
                        <Text style={styles.retryText} maxFontSizeMultiplier={1.2}>Try again</Text>
                    </Pressable>
                </View>
            ) : data ? (
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={state.refresh} tintColor={colors.primary} />
                    }
                >
                    <ImpactCard summary={data.summary} />

                    <View style={styles.logHeader}>
                        <Text style={styles.logTitle} maxFontSizeMultiplier={1.2}>DONATION LOG</Text>
                        <Text style={styles.logCount} maxFontSizeMultiplier={1.2}>{data.records.length} recorded</Text>
                    </View>

                    {data.records.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="water-outline" size={36} color={colors.textMuted} />
                            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>No donations recorded yet</Text>
                            <Text style={styles.emptyText} maxFontSizeMultiplier={1.2}>
                                Your verified donations will appear here after you donate at a blood bank.
                            </Text>
                        </View>
                    ) : (
                        data.records.map((record) => (
                            <DonationCard key={record.id} record={record} onViewCertificate={handleViewCertificate} />
                        ))
                    )}

                    <Pressable
                        onPress={handleDownloadRecord}
                        disabled={downloading}
                        style={[styles.downloadButton, downloading && { opacity: 0.6 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Download official donor record as PDF"
                    >
                        {downloading ? (
                            <ActivityIndicator color={colors.text} />
                        ) : (
                            <>
                                <Ionicons name="document-text-outline" size={20} color={colors.text} />
                                <Text style={styles.downloadText} maxFontSizeMultiplier={1.2}>
                                    Download Official Donor Record (PDF)
                                </Text>
                            </>
                        )}
                    </Pressable>
                </ScrollView>
            ) : null}

            <DonorBottomNav
                activeTab="History"
                onSelect={(tab) => {
                    if (tab === 'Home') {
                        if (onBack) onBack();
                        else if (onNavigateTab) onNavigateTab('Home');
                    } else if (tab !== 'History') {
                        if (onNavigateTab) onNavigateTab(tab);
                    }
                }}
                colors={{
                    card: colors.card,
                    border: colors.border,
                    textMuted: colors.textMuted,
                    primary: colors.primary,
                    primarySoft: colors.primarySoft,
                }}
            />
        </SafeAreaView>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        titleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 18,
            paddingTop: 8,
            paddingBottom: 12,
        },
        title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: c.text },
        avatar: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: { color: c.onPrimary, fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
        content: { paddingHorizontal: 18, paddingBottom: 28, gap: 14 },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
        errorTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 6 },
        errorText: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginBottom: 16 },
        retry: { backgroundColor: c.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
        retryText: { color: c.onPrimary, fontWeight: '700' },
        logHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            paddingHorizontal: 4,
        },
        logTitle: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: 0.5 },
        logCount: { fontSize: 13, color: c.textMuted },
        empty: {
            alignItems: 'center',
            backgroundColor: c.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: c.border,
            padding: 24,
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 2,
            elevation: 1,
        },
        emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text },
        emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center' },
        downloadButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: c.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
            height: 52,
            marginTop: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 2,
            elevation: 1,
        },
        downloadText: { fontSize: 14, fontWeight: '700', color: c.text },
    });
