// src/notifications/components/FilterChips.tsx
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { ColorPalette, radius, useTheme } from '../../profile/theme';

export interface FilterChip {
    key: string;
    label: string;
    count: number;
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
                        <Text style={[styles.text, active && styles.textActive]}>
                            {f.label} ({f.count})
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        scroll: { flexGrow: 0 },
        row: { paddingHorizontal: 20, gap: 10 },
        chip: {
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: radius.pill,
            backgroundColor: c.infoSoft,
        },
        chipActive: { backgroundColor: c.primary },
        text: { fontSize: 15, fontWeight: '700', color: c.text },
        textActive: { color: c.onPrimary },
    });