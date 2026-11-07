// src/history/components/ImpactCard.tsx
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ColorPalette, useTheme } from '../../profile/theme';
import { estimateLivesSaved } from '../../profile/utils/eligibility';
import { HistorySummary } from '../types/history';
import { formatVolume } from '../utils/historyFormat';

interface Props {
    summary: HistorySummary;
}

export default function ImpactCard({ summary }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title} maxFontSizeMultiplier={1.2}>LIFETIME IMPACT</Text>
                <View style={styles.pill}>
                    <Text style={styles.pillText} maxFontSizeMultiplier={1.2}>{summary.bloodGroup} Donor</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
                <Stat styles={styles} value={String(summary.totalDonations)} label="DONATIONS" />
                <Stat styles={styles} value={`${estimateLivesSaved(summary.totalDonations)}+`} label="LIVES HELPED" />
                <Stat styles={styles} value={formatVolume(summary.totalVolumeMl)} label="VOLUME DONATED" />
            </View>
        </View>
    );
}

function Stat({
    value,
    label,
    styles,
}: {
    value: string;
    label: string;
    styles: ReturnType<typeof createStyles>;
}) {
    return (
        <View style={styles.stat}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                {value}
            </Text>
            <Text style={styles.statLabel} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {label}
            </Text>
        </View>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        card: {
            backgroundColor: c.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 2,
            elevation: 1,
        },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        title: { fontSize: 12, fontWeight: '700', color: c.textMuted, letterSpacing: 0.5 },
        pill: {
            backgroundColor: c.primarySoft,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        pillText: { color: c.primary, fontWeight: '700', fontSize: 12 },
        divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
        statsRow: { flexDirection: 'row', alignItems: 'flex-start' },
        stat: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
        statValue: { fontSize: 26, fontWeight: '800', color: c.primary, lineHeight: 32 },
        statLabel: {
            fontSize: 10,
            fontWeight: '700',
            color: c.textMuted,
            letterSpacing: 0.2,
            marginTop: 4,
            textAlign: 'center',
            lineHeight: 14,
        },
    });
