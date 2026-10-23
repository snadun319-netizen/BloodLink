// src/history/components/ImpactCard.tsx
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
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
                <Text style={styles.title}>LIFETIME IMPACT</Text>
                <View style={styles.pill}>
                    <Text style={styles.pillText}>{summary.bloodGroup} Donor</Text>
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
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        card: {
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            padding: 18,
        },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        title: { fontSize: 14, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8 },
        pill: {
            backgroundColor: c.primarySoft,
            borderRadius: radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 6,
        },
        pillText: { color: c.primary, fontWeight: '700', fontSize: 14 },
        divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
        statsRow: { flexDirection: 'row' },
        stat: { flex: 1, alignItems: 'center' },
        statValue: { fontSize: 34, fontWeight: '800', color: c.primary },
        statLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8, marginTop: 6 },
    });