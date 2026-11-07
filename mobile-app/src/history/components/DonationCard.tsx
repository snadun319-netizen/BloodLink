// src/history/components/DonationCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ColorPalette, useTheme } from '../../profile/theme';
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
                    <Text style={styles.hospital} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                        {record.hospitalName}
                    </Text>
                    <Text style={styles.meta} maxFontSizeMultiplier={1.2}>
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
                        size={15}
                        color={verified ? colors.success : colors.warning}
                    />
                    <Text
                        style={[styles.badgeText, { color: verified ? colors.success : colors.warning }]}
                        maxFontSizeMultiplier={1.2}
                    >
                        {verified ? 'Verified' : 'Pending'}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomRow}>
                <Text style={styles.note} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                    {record.note}
                </Text>
                <Pressable
                    onPress={() => onViewCertificate(record)}
                    style={styles.certButton}
                    accessibilityRole="button"
                    accessibilityLabel={`View certificate for donation at ${record.hospitalName}`}
                >
                    <Text style={styles.certText} maxFontSizeMultiplier={1.2}>View Certificate</Text>
                    <Ionicons name="open-outline" size={15} color={colors.text} />
                </Pressable>
            </View>
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
        topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        hospital: { fontSize: 16, fontWeight: '700', color: c.text, lineHeight: 22 },
        meta: { fontSize: 13, color: c.textMuted, marginTop: 4, lineHeight: 18 },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 9,
            paddingVertical: 4,
            flexShrink: 0,
            alignSelf: 'flex-start',
        },
        badgeText: { fontWeight: '700', fontSize: 12 },
        divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
        bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        note: { flex: 1, fontSize: 13, color: c.textMuted, lineHeight: 18 },
        certButton: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
        certText: { fontSize: 13, fontWeight: '600', color: c.text },
    });
