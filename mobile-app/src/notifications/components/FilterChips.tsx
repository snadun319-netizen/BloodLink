// src/notifications/components/FilterChips.tsx
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ColorPalette, radius, useTheme } from '../../profile/theme';

export interface FilterChip {
    key: string;
    label: string;
    count?: number;
}

interface Props {
    filters: FilterChip[];
    selected: string;
    onSelect: (key: string) => void;
}

export default function FilterChips({ filters, selected, onSelect }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.section}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                style={styles.scroll}
            >
                {filters.map((f) => {
                    const active = f.key === selected;
                    return (
                        <Pressable
                            key={f.key}
                            onPress={() => onSelect(f.key)}
                            style={[styles.chip, active && styles.chipActive]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={`${f.label}${f.count ? `, ${f.count} unread` : ''}`}
                        >
                            <Text numberOfLines={1} style={[styles.text, active && styles.textActive]}>
                                {f.label}
                            </Text>
                            {f.count !== undefined && (
                                <View style={[styles.count, active && styles.countActive]}>
                                    <Text style={[styles.countText, active && styles.countTextActive]}>{f.count}</Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        section: { paddingTop: 2 },
        scroll: { flexGrow: 0 },
        row: {
            flexDirection: 'row',
            paddingHorizontal: 20,
            paddingBottom: 2,
            gap: 8,
        },
        chip: {
            flexShrink: 0,
            minHeight: 38,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: radius.pill,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 7,
        },
        chipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
        text: {
            flexShrink: 1,
            fontSize: 13,
            lineHeight: 18,
            fontWeight: '700',
            color: c.text,
            includeFontPadding: false,
        },
        textActive: { color: c.primary },
        count: {
            minWidth: 21,
            height: 21,
            paddingHorizontal: 6,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.primarySoft,
        },
        countActive: { backgroundColor: c.primary },
        countText: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: c.primary },
        countTextActive: { color: c.onPrimary },
    });
