// src/notifications/utils/kindConfig.ts
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { NotificationCategory, NotificationKind } from '../types/notifications';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface KindConfig {
    icon: IconName;
    label?: string; // small label above the title
    labelStyle: 'dot' | 'pill'; // dot = red dot shown only while unread, pill = always a badge
    tone: 'primary' | 'info' | 'muted'; // colour of the round icon
    category: NotificationCategory;
}

export const KIND_CONFIG: Record<NotificationKind, KindConfig> = {
    critical_need: { icon: 'asterisk', label: 'CRITICAL NEED', labelStyle: 'dot', tone: 'primary', category: 'urgent' },
    lab_result: { icon: 'shield-check', label: 'Lab Results', labelStyle: 'dot', tone: 'primary', category: 'doctor' },
    health_advisory: { icon: 'stethoscope', label: 'Health Advisory', labelStyle: 'pill', tone: 'info', category: 'doctor' },
    community_impact: { icon: 'medal', label: 'Community Impact', labelStyle: 'dot', tone: 'primary', category: 'system' },
    profile_synced: { icon: 'sync', labelStyle: 'dot', tone: 'muted', category: 'system' },
};

export const FILTERS: { key: 'all' | NotificationCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'doctor', label: 'Doctor Reports' },
    { key: 'urgent', label: 'Urgent Alerts' },
    { key: 'system', label: 'System' },
];