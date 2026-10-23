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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
import { getInitials } from '../../profile/utils/format';
import { DonationCard, ImpactCard } from '../components';
import { HistoryState } from '../hooks/useDonationHistory';
import { fetchDonorRecordUrl } from '../services/historyService';
import { DonationRecord } from '../types/history';

interface Props {
    state: HistoryState;
}

async function openUrl(url: string) {
    try {
        await Linking.openURL(url);
    } catch {
        Alert.alert('Could not open the link', 'Please try again later.');
    }
}

export default function HistoryScreen({ state }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { data, loading, refreshing, error } = state;
    const [downloading, setDownloading] = useState(false);

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
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.titleRow}>
                <Text style={styles.title}>History</Text>
                {data && (
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(data.donorName)}</Text>
                    </View>
                )}
            </View>

            {loading && !data ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error && !data ? (
                <View style={styles.center}>
                    <Text style={styles.errorTitle}>Could not load your history</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retry} onPress={state.reload} accessibilityRole="button">
                        <Text style={styles.retryText}>Try again</Text>
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
                        <Text style={styles.logTitle}>DONATION LOG</Text>
                        <Text style={styles.logCount}>{data.records.length} recorded</Text>
                    </View>

                    {data.records.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="water-outline" size={36} color={colors.textMuted} />
                            <Text style={styles.emptyTitle}>No donations recorded yet</Text>
                            <Text style={styles.emptyText}>
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
                                <Text style={styles.downloadText}>Download Official Donor Record (PDF)</Text>
                            </>
                        )}
                    </Pressable>
                </ScrollView>
            ) : null}
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
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
        },
        title: { fontSize: 28, fontWeight: '800', color: c.text },
        avatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: { color: c.onPrimary, fontWeight: '800', fontSize: 16 },
        content: { paddingHorizontal: 20, paddingBottom: 90, gap: 14 },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
        errorTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 6 },
        errorText: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginBottom: 16 },
        retry: { backgroundColor: c.primary, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 },
        retryText: { color: c.onPrimary, fontWeight: '700' },
        logHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            paddingHorizontal: 4,
        },
        logTitle: { fontSize: 16, fontWeight: '800', color: c.text, letterSpacing: 0.5 },
        logCount: { fontSize: 14, color: c.textMuted },
        empty: {
            alignItems: 'center',
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            padding: 28,
            gap: 8,
        },
        emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text },
        emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center' },
        downloadButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            height: 56,
            marginTop: 6,
        },
        downloadText: { fontSize: 15, fontWeight: '700', color: c.text },
    });