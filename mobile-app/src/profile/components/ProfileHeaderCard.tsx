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

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                        {profile.fullName}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                        {profile.phone} • {profile.district}
                    </Text>
                    <Text style={styles.since}>Donor since {formatMonthYear(profile.donorSince)}</Text>
                </View>

                <View style={styles.bloodBadge}>
                    <Text style={styles.bloodLabel}>BLOOD</Text>
                    <Text style={styles.bloodValue}>{profile.bloodGroup}</Text>
                </View>
            </View>

            <Pressable
                onPress={onEdit}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                style={styles.editButton}
            >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={styles.editText}>Edit profile</Text>
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.availRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.availTitle}>Available to donate</Text>
                    <Text style={styles.availSub}>Receive matched emergency requests</Text>
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
        avatarText: { color: c.onPrimary, fontSize: 24, fontWeight: '800' },
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
        info: { flex: 1, marginLeft: 14, marginRight: 8 },
        name: { fontSize: 20, fontWeight: '800', color: c.text },
        sub: { fontSize: 13, color: c.textMuted, marginTop: 2 },
        since: { fontSize: 13, color: c.textMuted, marginTop: 2 },
        bloodBadge: {
            backgroundColor: c.primarySoft,
            borderRadius: 16,
            paddingVertical: 8,
            paddingHorizontal: 12,
            alignItems: 'center',
        },
        bloodLabel: { fontSize: 10, fontWeight: '700', color: c.primary, letterSpacing: 1 },
        bloodValue: { fontSize: 22, fontWeight: '800', color: c.primary },
        editButton: {
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: radius.pill,
            backgroundColor: c.primarySoft,
        },
        editText: { color: c.primary, fontWeight: '700', fontSize: 13 },
        divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
        availRow: { flexDirection: 'row', alignItems: 'center' },
        availTitle: { fontSize: 16, fontWeight: '700', color: c.text },
        availSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    });