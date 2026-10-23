// src/notifications/components/NotificationCard.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
import { AppNotification } from '../types/notifications';
import { KIND_CONFIG } from '../utils/kindConfig';
import { timeAgo } from '../utils/timeAgo';

interface Props {
    notification: AppNotification;
    onPress: (n: AppNotification) => void;
    onViewRequest: (n: AppNotification) => void;
    onOpenLabPdf: (n: AppNotification) => void;
    onOpenDoctorNote: (n: AppNotification) => void;
    onViewGuidelines: (n: AppNotification) => void;
    onShareHonor: (n: AppNotification) => void;
}

export default function NotificationCard({
    notification: n,
    onPress,
    onViewRequest,
    onOpenLabPdf,
    onOpenDoctorNote,
    onViewGuidelines,
    onShareHonor,
}: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const cfg = KIND_CONFIG[n.kind];

    const iconBg = cfg.tone === 'primary' ? colors.primarySoft : colors.infoSoft;
    const iconColor = cfg.tone === 'primary' ? colors.primary : cfg.tone === 'info' ? colors.text : colors.textMuted;

    return (
        <Pressable
            onPress={() => onPress(n)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel={`${n.isRead ? '' : 'Unread. '}${n.title}`}
        >
            {/* Header: icon + label/time + title + subtitle */}
            <View style={styles.headerRow}>
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                    <MaterialCommunityIcons name={cfg.icon} size={24} color={iconColor} />
                </View>

                <View style={styles.headerText}>
                    <View style={styles.labelRow}>
                        {cfg.label ? (
                            cfg.labelStyle === 'pill' ? (
                                <View style={styles.pill}>
                                    <MaterialCommunityIcons name="check-decagram-outline" size={14} color={colors.primary} />
                                    <Text style={styles.pillText}>{cfg.label}</Text>
                                </View>
                            ) : (
                                <View style={styles.dotLabel}>
                                    {!n.isRead && <View style={styles.dot} />}
                                    <Text style={styles.labelText}>{cfg.label}</Text>
                                </View>
                            )
                        ) : (
                            <View />
                        )}
                        <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                    </View>

                    <Text style={styles.title} numberOfLines={2}>
                        {n.title}
                    </Text>
                    {n.subtitle ? (
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {n.subtitle}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Body */}
            {n.kind === 'community_impact' ? (
                n.body ? <Text style={styles.bodyBold}>{n.body}</Text> : null
            ) : n.body ? (
                <Text style={styles.body}>{n.body}</Text>
            ) : null}

            {/* Critical need footer */}
            {n.kind === 'critical_need' && (
                <View style={styles.footerRow}>
                    <View style={styles.distance}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.distanceText} numberOfLines={1}>
                            {n.distanceKm !== undefined ? `${n.distanceKm} km away` : 'Nearby'}
                            {n.location ? ` · ${n.location}` : ''}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => onViewRequest(n)}
                        style={styles.primaryButton}
                        accessibilityRole="button"
                        accessibilityLabel="View request"
                    >
                        <Text style={styles.primaryButtonText}>View Request</Text>
                        <MaterialCommunityIcons name="arrow-right" size={16} color={colors.onPrimary} />
                    </Pressable>
                </View>
            )}

            {/* Lab result details */}
            {n.kind === 'lab_result' && n.labReport && (
                <>
                    <View style={styles.infoBox}>
                        <View style={styles.infoTitleRow}>
                            <MaterialCommunityIcons
                                name={n.labReport.allClear ? 'check-circle' : 'alert-circle'}
                                size={18}
                                color={colors.primary}
                            />
                            <Text style={styles.infoTitle}>
                                {n.labReport.allClear ? 'All Clinical Markers Clear' : 'Review Required'}
                            </Text>
                        </View>
                        <Text style={styles.marker}>
                            Hemoglobin: <Text style={styles.markerValue}>{n.labReport.hemoglobin}</Text>
                        </Text>
                        <Text style={styles.marker}>
                            HIV / HBV / HCV: <Text style={styles.markerValue}>{n.labReport.infectiousDiseases}</Text>
                        </Text>
                        <Text style={styles.marker}>
                            Volume: <Text style={styles.markerValue}>{n.labReport.volumeMl} mL</Text>
                        </Text>
                    </View>

                    <View style={styles.infoBox}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <MaterialCommunityIcons name="format-quote-open" size={22} color={colors.primary} />
                            <Text style={styles.quote}>“{n.labReport.doctorMessage}”</Text>
                        </View>
                    </View>

                    <View style={styles.buttonRow}>
                        <Pressable
                            onPress={() => onOpenLabPdf(n)}
                            style={styles.secondaryButton}
                            accessibilityRole="button"
                            accessibilityLabel="Open lab PDF"
                        >
                            <MaterialCommunityIcons name="file-pdf-box" size={20} color={colors.text} />
                            <Text style={styles.secondaryButtonText}>Lab PDF</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onOpenDoctorNote(n)}
                            style={styles.primaryButtonWide}
                            accessibilityRole="button"
                            accessibilityLabel="Open doctor note"
                        >
                            <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={colors.onPrimary} />
                            <Text style={styles.primaryButtonText}>Doctor Note</Text>
                        </Pressable>
                    </View>
                </>
            )}

            {/* Health advisory footer */}
            {n.kind === 'health_advisory' && (
                <View style={styles.footerRow}>
                    <View style={styles.distance}>
                        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.primary} />
                        <Text style={styles.eligibleText}>
                            Eligible in: {n.eligibleInDays ?? 0} Day{n.eligibleInDays === 1 ? '' : 's'}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => onViewGuidelines(n)}
                        style={styles.linkButton}
                        accessibilityRole="button"
                        accessibilityLabel="View guidelines"
                    >
                        <Text style={styles.linkText}>View Guidelines</Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
                    </Pressable>
                </View>
            )}

            {/* Community honor */}
            {n.kind === 'community_impact' && n.honor && (
                <View style={styles.honorBox}>
                    <View style={styles.honorIcon}>
                        <MaterialCommunityIcons name="shield-check" size={22} color={colors.onPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.honorTitle}>{n.honor.title}</Text>
                        <Text style={styles.honorSub}>Verified by {n.honor.verifiedBy}</Text>
                    </View>
                    <Pressable
                        onPress={() => onShareHonor(n)}
                        style={styles.shareButton}
                        accessibilityRole="button"
                        accessibilityLabel="Share your honor"
                    >
                        <Text style={styles.shareText}>Share</Text>
                    </Pressable>
                </View>
            )}
        </Pressable>
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
        headerRow: { flexDirection: 'row', marginBottom: 12 },
        iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
        headerText: { flex: 1, marginLeft: 14 },
        labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
        dotLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
        labelText: { fontSize: 14, fontWeight: '800', color: c.primary },
        pill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: c.infoSoft,
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        pillText: { fontSize: 14, fontWeight: '700', color: c.primary },
        time: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
        title: { fontSize: 19, fontWeight: '800', color: c.text },
        subtitle: { fontSize: 15, color: c.textMuted, marginTop: 2 },
        body: { fontSize: 16, lineHeight: 24, color: c.textMuted },
        bodyBold: { fontSize: 16, lineHeight: 24, color: c.text, fontWeight: '600' },
        footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 },
        distance: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
        distanceText: { fontSize: 14, color: c.textMuted, fontWeight: '600', flexShrink: 1 },
        eligibleText: { fontSize: 14, color: c.primary, fontWeight: '700' },
        primaryButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: c.primary,
            borderRadius: radius.md,
            paddingHorizontal: 18,
            paddingVertical: 12,
        },
        primaryButtonText: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
        linkButton: { flexDirection: 'row', alignItems: 'center' },
        linkText: { color: c.primary, fontWeight: '700', fontSize: 14 },
        infoBox: { backgroundColor: c.infoSoft, borderRadius: radius.md, padding: 14, marginTop: 4, marginBottom: 12 },
        infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
        infoTitle: { fontSize: 16, fontWeight: '800', color: c.text },
        marker: { fontSize: 15, color: c.textMuted, marginTop: 4 },
        markerValue: { color: c.text, fontWeight: '600' },
        quote: { flex: 1, fontSize: 16, lineHeight: 24, color: c.text },
        buttonRow: { flexDirection: 'row', gap: 12 },
        secondaryButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: c.infoSoft,
            borderRadius: radius.md,
            height: 52,
        },
        secondaryButtonText: { fontWeight: '700', fontSize: 15, color: c.text },
        primaryButtonWide: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: c.primary,
            borderRadius: radius.md,
            height: 52,
        },
        honorBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: c.infoSoft,
            borderRadius: radius.md,
            padding: 12,
            marginTop: 14,
        },
        honorIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
        honorTitle: { fontSize: 15, fontWeight: '800', color: c.text },
        honorSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },
        shareButton: { backgroundColor: c.card, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
        shareText: { fontWeight: '700', color: c.text, fontSize: 14 },
    });