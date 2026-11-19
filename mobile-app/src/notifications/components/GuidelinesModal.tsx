// src/notifications/components/GuidelinesModal.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
import { DONATION_INTERVAL_DAYS } from '../../profile/utils/eligibility';

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function GuidelinesModal({ visible, onClose }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const beforeTips = [
        'Drink plenty of water before your appointment',
        'Eat a healthy meal beforehand',
        'Get a good night’s sleep',
        'Bring a valid ID',
        'Tell the staff about any medicines or illness',
    ];

    const afterTips = [
        'Rest for a few minutes after donating and follow the staff’s advice',
        'Avoid heavy exercise for the rest of the day',
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close donation guidelines"
                />

                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleWrap}>
                            <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={colors.primary} />
                            <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2}>
                                Donation Guidelines
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            style={styles.closeButton}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={22} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Before donation section */}
                        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
                            Before Donating
                        </Text>
                        {beforeTips.map((tip, idx) => (
                            <View key={`before-${idx}`} style={styles.tipRow}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.tipIcon} />
                                <Text style={styles.tipText} maxFontSizeMultiplier={1.2}>
                                    {tip}
                                </Text>
                            </View>
                        ))}

                        {/* After donation section */}
                        <Text style={[styles.sectionTitle, { marginTop: 16 }]} maxFontSizeMultiplier={1.2}>
                            After Donating
                        </Text>
                        {afterTips.map((tip, idx) => (
                            <View key={`after-${idx}`} style={styles.tipRow}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.tipIcon} />
                                <Text style={styles.tipText} maxFontSizeMultiplier={1.2}>
                                    {tip}
                                </Text>
                            </View>
                        ))}

                        {/* Interval policy reminder */}
                        <View style={styles.intervalBox}>
                            <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.primary} style={styles.boxIcon} />
                            <Text style={styles.intervalText} maxFontSizeMultiplier={1.2}>
                                Donations need a minimum gap. In this app the reminder uses {DONATION_INTERVAL_DAYS} days; the blood bank has the final say.
                            </Text>
                        </View>

                        {/* Disclaimer */}
                        <View style={styles.disclaimerBox}>
                            <MaterialCommunityIcons name="shield-alert-outline" size={18} color={colors.textMuted} style={styles.boxIcon} />
                            <Text style={styles.disclaimerText} maxFontSizeMultiplier={1.2}>
                                General information only. Final eligibility is decided by qualified blood-bank staff.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer Button */}
                    <View style={styles.footer}>
                        <Pressable
                            onPress={onClose}
                            style={styles.doneButton}
                            accessibilityRole="button"
                            accessibilityLabel="Got it"
                        >
                            <Text style={styles.doneButtonText} maxFontSizeMultiplier={1.2}>
                                Got it
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        card: {
            width: '100%',
            maxWidth: 420,
            maxHeight: '85%',
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        headerTitleWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: c.text,
            letterSpacing: -0.2,
        },
        closeButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.infoSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        scrollContent: {
            paddingHorizontal: 20,
            paddingVertical: 16,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: '700',
            color: c.text,
            marginBottom: 10,
        },
        tipRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 10,
            gap: 10,
        },
        tipIcon: {
            marginTop: 1,
        },
        tipText: {
            fontSize: 14,
            lineHeight: 20,
            color: c.text,
            flex: 1,
        },
        intervalBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: c.primarySoft,
            borderRadius: radius.md,
            padding: 12,
            marginTop: 16,
        },
        boxIcon: {
            marginTop: 1,
        },
        intervalText: {
            fontSize: 13,
            lineHeight: 19,
            color: c.text,
            fontWeight: '500',
            flex: 1,
        },
        disclaimerBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: c.infoSoft,
            borderRadius: radius.md,
            padding: 12,
            marginTop: 12,
        },
        disclaimerText: {
            fontSize: 12.5,
            lineHeight: 18,
            color: c.textMuted,
            fontWeight: '500',
            flex: 1,
        },
        footer: {
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: c.border,
            backgroundColor: c.card,
        },
        doneButton: {
            backgroundColor: c.primary,
            borderRadius: radius.md,
            height: 46,
            alignItems: 'center',
            justifyContent: 'center',
        },
        doneButtonText: {
            color: c.onPrimary,
            fontSize: 14,
            fontWeight: '700',
        },
    });

