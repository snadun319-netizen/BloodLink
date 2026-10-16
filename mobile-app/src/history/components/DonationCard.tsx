// src/history/components/DonationCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
import { formatDate } from '../../profile/utils/format';
import { DonationRecord } from '../types/history';

interface Props {
    record: DonationRecord;
    onViewCertificate: (record: DonationRecord) => void;
}

export default function DonationCard({ record, onViewCertificate }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const verified = record.status === 'verified';

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.hospital}>{record.hospitalName}</Text>
                    <Text style={styles.meta}>
                        {formatDate(record.donatedAt)} · {record.donationType} ({record.volumeMl}ml)
                    </Text>
                </View>

                <View
                    style={[
                        styles.badge,
                        {
                            backgroundColor: verified ? colors.successSoft : colors.warningSoft,
                            borderColor: (verified ? colors.success : colors.warning) + '55',
                        },
                    ]}
                >
                    <Ionicons
                        name={verified ? 'checkmark-circle-outline' : 'time-outline'}
                        size={16}
                        color={verified ? colors.success : colors.warning}
                    />
                    <Text style={[styles.badgeText, { color: verified ? colors.success : colors.warning }]}>
                        {verified ? 'Verified' : 'Pending'}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomRow}>
                <Text style={styles.note} numberOfLines={1}>
                    {record.note}
                </Text>
                <Pressable
                    onPress={() => onViewCertificate(record)}
                    style={styles.certButton}
                    accessibilityRole="button"
                    accessibilityLabel={`View certificate for donation at ${record.hospitalName}`}
                >
                    <Text style={styles.certText}>View Certificate</Text>
                    <Ionicons name="open-outline" size={16} color={colors.text} />
                </Pressable>
            </View>
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
        topRow: { flexDirection: 'row', alignItems: 'flex-start' },
        hospital: { fontSize: 18, fontWeight: '700', color: c.text },
        meta: { fontSize: 14, color: c.textMuted, marginTop: 4 },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderRadius: radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 6,
        },
        badgeText: { fontWeight: '700', fontSize: 14 },
        divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
        bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        note: { flex: 1, fontSize: 14, color: c.textMuted, paddingRight: 10 },
        certButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        certText: { fontSize: 15, fontWeight: '700', color: c.text },
    });