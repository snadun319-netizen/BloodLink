// src/notifications/hooks/useNotifications.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '../services/notificationsService';
import { AppNotification } from '../types/notifications';

export function useNotifications() {
    const [items, setItems] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh: boolean) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            setItems(await fetchNotifications());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load your notifications.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load(false);
    }, [load]);

    const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

    // Optimistic: update the screen immediately, roll back if the server fails.
    const markRead = useCallback(
        async (id: string) => {
            const target = items.find((n) => n.id === id);
            if (!target || target.isRead) return;
            setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
            try {
                await markNotificationRead(id);
            } catch {
                setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
            }
        },
        [items],
    );

    const markAllRead = useCallback(async () => {
        if (unreadCount === 0) return;
        const previous = items;
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            await markAllNotificationsRead();
        } catch (e) {
            setItems(previous);
            throw e;
        }
    }, [items, unreadCount]);

    return {
        items,
        unreadCount,
        loading,
        refreshing,
        error,
        reload: () => load(false),
        refresh: () => load(true),
        markRead,
        markAllRead,
    };
}

export type NotificationsState = ReturnType<typeof useNotifications>;