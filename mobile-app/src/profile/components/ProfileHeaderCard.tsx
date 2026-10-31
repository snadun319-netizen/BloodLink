// src/components/ProfileHeaderCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ColorPalette, radius, useTheme } from '../theme';
import { DonorProfile } from '../types/profile';
import { formatMonthYear, getInitials } from '../utils/format';

interface Props {
    profile: DonorProfile;
    onToggleAvailability: (value: boolean) => void;
    onEdit: () => void;
}

export default function ProfileHeaderCard({ profile, onToggleAvailability, onEdit }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const verified = profile.bloodGroupVerification === 'approved';

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <View>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(profile.fullName)}</Text>
                    </View>
                    {verified && (
                        <View style={styles.verifiedDot}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                    )}
                </View>

                <Pressable style={styles.info} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile">
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{profile.fullName}</Text>
                        <Ionicons name="create-outline" size={15} color={colors.textMuted} />
                    </View>
                    <Text style={styles.sub}>
                        {[profile.phone, profile.district].filter((s) => s && s.trim().length > 0).join(' • ')}
                    </Text>
                    <Text style={styles.since}>Donor since {formatMonthYear(profile.donorSince)}</Text>
                </Pressable>

                <View style={styles.bloodBadge}>
                    <Text style={styles.bloodLabel}>BLOOD</Text>
                    <Text style={styles.bloodValue}>{profile.bloodGroup}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.availRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.availTitle}>Available to donate</Text>
                    <Text style={styles.availSub}>{profile.isAvailable ? 'Receive matched emergency requests' : 'Emergency request alerts are paused'}</Text>
                </View>
                <Switch
                    value={profile.isAvailable}
                    onValueChange={onToggleAvailability}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel="Available to donate"
                />
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
        row: { flexDirection: 'row', alignItems: 'center' },
        avatar: {
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: { color: c.onPrimary, fontSize: 22, fontWeight: '600' },
        verifiedDot: {
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: c.success,
            borderWidth: 2,
            borderColor: c.card,
            alignItems: 'center',
            justifyContent: 'center',
        },
        info: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', marginLeft: 12, marginRight: 8 },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        name: { fontSize: 17, lineHeight: 23, fontWeight: '600', color: c.text, flexShrink: 1 },
        sub: { fontSize: 12, lineHeight: 18, color: c.textMuted, marginTop: 4 },
        since: { fontSize: 12, lineHeight: 18, color: c.textMuted, marginTop: 2 },
        bloodBadge: {
            backgroundColor: c.primarySoft,
            borderRadius: 16,
            paddingVertical: 8,
            paddingHorizontal: 12,
            alignItems: 'center',
        },
        bloodLabel: { fontSize: 10, fontWeight: '700', color: c.primary, letterSpacing: 1 },
        bloodValue: { fontSize: 22, fontWeight: '600', color: c.primary },
        divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
        availRow: { flexDirection: 'row', alignItems: 'center' },
        availTitle: { fontSize: 14, fontWeight: '600', color: c.text },
        availSub: { fontSize: 12, lineHeight: 18, color: c.textMuted, marginTop: 3 },
    });
