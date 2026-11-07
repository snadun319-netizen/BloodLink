// src/notifications/screens/NotificationsScreen.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
import { FilterChips, NotificationCard } from '../components';
import { NotificationsState } from '../hooks/useNotifications';
import { AppNotification } from '../types/notifications';
import { FILTERS } from '../utils/kindConfig';

interface Props {
    state: NotificationsState;
    onBack?: () => void; // shows a back arrow when provided
    onViewRequest?: (requestId?: string) => void; // opens the Requests screen (owned by another module)
}

function resolveDoctorMessage(message: string, fullName?: string): string {
    const firstName = fullName?.trim().split(/\s+/)[0];
    if (firstName) {
        return message.replace(/\{firstName\}/g, firstName);
    }
    return message.replace(/ ?\{firstName\}/g, '');
}

async function openUrl(url: string | undefined, unavailableMessage: string) {
    if (!url) {
        Alert.alert('Not available yet', unavailableMessage);
        return;
    }
    try {
        await Linking.openURL(url);
    } catch {
        Alert.alert('Could not open the link', 'Please try again later.');
    }
}

export default function NotificationsScreen({ state, onBack, onViewRequest }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { items, unreadCount, loading, refreshing, error } = state;
    const { user } = useAuth();
    const [filter, setFilter] = useState<string>('all');

    const chips = useMemo(
        () =>
            FILTERS.map((f) => {
                const categoryItems = f.key === 'all' ? items : items.filter((n) => n.category === f.key);
                const unreadInCategory = categoryItems.filter((n) => !n.isRead).length;
                return {
                    key: f.key,
                    label: f.label,
                    count: unreadInCategory > 0 ? unreadInCategory : undefined,
                };
            }),
        [items],
    );

    const visible = useMemo(() => {
        const list = filter === 'all' ? items : items.filter((n) => n.category === filter);
        return list.map((n) => {
            if (n.kind === 'lab_result' && n.labReport?.doctorMessage) {
                return {
                    ...n,
                    labReport: {
                        ...n.labReport,
                        doctorMessage: resolveDoctorMessage(n.labReport.doctorMessage, user?.fullName),
                    },
                };
            }
            return n;
        });
    }, [items, filter, user?.fullName]);

    const handleMarkAll = async () => {
        try {
            await state.markAllRead();
        } catch {
            Alert.alert('Could not update', 'Please check your connection and try again.');
        }
    };

    const handleViewRequest = (n: AppNotification) => {
        state.markRead(n.id);
        if (onViewRequest) onViewRequest(n.requestId);
        else Alert.alert('Requests', 'The Requests screen is not connected here yet.');
    };

    const handleShare = async (n: AppNotification) => {
        if (!n.honor) return;
        try {
            await Share.share({
                message: `${n.honor.title} – verified by ${n.honor.verifiedBy}. I'm a BloodLink donor! 🩸`,
            });
        } catch {
            /* user closed the share sheet */
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.topRow}>
                {onBack && (
                    <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                    </Pressable>
                )}
                <View style={styles.titleWrap}>
                    <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        Notifications
                    </Text>
                </View>
                <Pressable
                    onPress={handleMarkAll}
                    disabled={unreadCount === 0}
                    style={[styles.markAll, unreadCount === 0 && { opacity: 0.4 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Mark all notifications as read"
                >
                    <MaterialCommunityIcons name="check-all" size={17} color={colors.primary} />
                    <Text style={styles.markAllText} maxFontSizeMultiplier={1.2}>Mark all read</Text>
                </Pressable>
            </View>

            {loading && items.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error && items.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.errorTitle}>Could not load notifications</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retry} onPress={state.reload} accessibilityRole="button">
                        <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                </View>
            ) : (
                <>
                    <FilterChips filters={chips} selected={filter} onSelect={setFilter} />
                    <ScrollView
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={state.refresh} tintColor={colors.primary} />
                        }
                    >
                        {visible.length === 0 ? (
                            <View style={styles.empty}>
                                <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
                                <Text style={styles.emptyTitle}>No notifications here</Text>
                                <Text style={styles.emptyText}>New alerts and updates will appear in this list.</Text>
                            </View>
                        ) : (
                            visible.map((n) => (
                                <NotificationCard
                                    key={n.id}
                                    notification={n}
                                    onPress={(item) => state.markRead(item.id)}
                                    onViewRequest={handleViewRequest}
                                    onOpenLabPdf={(item) => {
                                        state.markRead(item.id);
                                        openUrl(item.labReport?.labPdfUrl, 'The lab report PDF will be available once the backend is connected.');
                                    }}
                                    onOpenDoctorNote={(item) => {
                                        state.markRead(item.id);
                                        openUrl(item.labReport?.doctorNoteUrl, 'The doctor note will be available once the backend is connected.');
                                    }}
                                    onViewGuidelines={(item) => {
                                        state.markRead(item.id);
                                        openUrl(item.guidelinesUrl, 'Donation guidelines will be available once the backend is connected.');
                                    }}
                                    onShareHonor={handleShare}
                                />
                            ))
                        )}
                    </ScrollView>
                </>
            )}
        </SafeAreaView>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        topRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 12,
            gap: 8,
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        },
        titleWrap: {
            flex: 1,
            justifyContent: 'center',
            minWidth: 0,
        },
        title: {
            fontSize: 24,
            fontWeight: '800',
            color: c.text,
            flexShrink: 1,
        },
        markAll: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 8,
            paddingHorizontal: 11,
            borderRadius: radius.pill,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
        },
        markAllText: {
            color: c.primary,
            fontWeight: '700',
            fontSize: 12,
        },
        content: {
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 100,
            gap: 14,
        },
        center: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        },
        errorTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: c.text,
            marginBottom: 6,
        },
        errorText: {
            fontSize: 14,
            color: c.textMuted,
            textAlign: 'center',
            marginBottom: 16,
        },
        retry: {
            backgroundColor: c.primary,
            borderRadius: radius.md,
            paddingHorizontal: 24,
            paddingVertical: 12,
        },
        retryText: {
            color: c.onPrimary,
            fontWeight: '700',
        },
        empty: {
            alignItems: 'center',
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            padding: 28,
            gap: 8,
        },
        emptyTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: c.text,
        },
        emptyText: {
            fontSize: 14,
            color: c.textMuted,
            textAlign: 'center',
        },
    });
