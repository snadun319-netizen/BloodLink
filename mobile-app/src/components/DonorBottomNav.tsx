import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type DonorTab = 'Home' | 'Requests' | 'Banks' | 'History' | 'Profile';

interface Props {
  activeTab: DonorTab;
  onSelect: (tab: DonorTab) => void;
  colors?: { card: string; border: string; textMuted: string; primary: string; primarySoft: string };
}

const tabs: { label: DonorTab; icon: keyof typeof Ionicons.glyphMap; selectedIcon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Home', icon: 'home-outline', selectedIcon: 'home' },
  { label: 'Requests', icon: 'notifications-outline', selectedIcon: 'notifications' },
  { label: 'Banks', icon: 'business-outline', selectedIcon: 'business' },
  { label: 'History', icon: 'time-outline', selectedIcon: 'time' },
  { label: 'Profile', icon: 'person-outline', selectedIcon: 'person' },
];

const defaultColors = { card: '#FFFFFF', border: '#EEF0F6', textMuted: '#64748B', primary: '#C5162E', primarySoft: '#FFF1F2' };

export default function DonorBottomNav({ activeTab, onSelect, colors = defaultColors }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map(tab => {
        const selected = activeTab === tab.label;
        return (
          <Pressable
            key={tab.label}
            onPress={() => onSelect(tab.label)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label === 'Requests' ? 'Requests, 5 unread' : tab.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.icon, selected && { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={selected ? tab.selectedIcon : tab.icon} size={20} color={selected ? colors.primary : colors.textMuted} />
              {tab.label === 'Requests' && <View style={styles.badge}><Text style={styles.badgeText}>5</Text></View>}
            </View>
            <Text style={[styles.label, { color: selected ? colors.primary : colors.textMuted }, selected && styles.selectedLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 8, borderTopWidth: 1, paddingHorizontal: 6 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
  selectedLabel: { fontWeight: '600' },
  badge: { position: 'absolute', top: -3, right: 4, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#C5162E', borderWidth: 1, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, lineHeight: 12, fontWeight: '600', color: '#FFFFFF' },
});
