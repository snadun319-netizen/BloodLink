
import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ColorPalette, radius, useTheme } from '../theme';

interface Props {
    label: string;
    value: string;
    caption?: string;
    icon?: ReactNode; // rendered inside a small soft badge, top-right
    iconBackground?: string;
    right?: ReactNode; // alternative to icon (e.g. the green status dot)
    valueColor?: string;
    compact?: boolean; // smaller value text (used for Last Donation / Eligibility)
}

export default function StatCard({
    label,
    value,
    caption,
    icon,
    iconBackground,
    right,
    valueColor,
    compact = false,
}: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <Text style={styles.label}>{label}</Text>
                {icon ? <View style={[styles.iconBadge, { backgroundColor: iconBackground }]}>{icon}</View> : right}
            </View>
            <Text
                style={[
                    compact ? styles.valueCompact : styles.value,
                    valueColor ? { color: valueColor } : null,
                ]}
                numberOfLines={1}
            >
                {value}
            </Text>
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        card: {
            flex: 1,
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            minHeight: 112,
        },
        topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
        label: { fontSize: 14, color: c.textMuted, fontWeight: '500' },
        iconBadge: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        value: { fontSize: 32, fontWeight: '800', color: c.text, marginBottom: 2 },
        valueCompact: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 2 },
        caption: { fontSize: 13, color: c.textMuted },
    });