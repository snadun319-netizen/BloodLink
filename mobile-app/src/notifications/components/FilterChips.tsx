// src/notifications/components/FilterChips.tsx
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
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
                    >
                        <Text
                            maxFontSizeMultiplier={1.2}
                            style={[styles.text, active && styles.textActive]}
                        >
                            {f.count !== undefined ? `${f.label} (${f.count})` : f.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        scroll: { flexGrow: 0, overflow: 'visible' },
        row: {
            paddingHorizontal: 20,
            paddingVertical: 4,
            gap: 10,
            alignItems: 'center',
        },
        chip: {
            minHeight: 40,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: radius.pill,
            backgroundColor: c.infoSoft,
            justifyContent: 'center',
            alignItems: 'center',
        },
        chipActive: { backgroundColor: c.primary },
        text: {
            fontSize: 14,
            lineHeight: 20,
            fontWeight: '700',
            color: c.text,
            includeFontPadding: false,
        },
        textActive: { color: c.onPrimary },
    });
