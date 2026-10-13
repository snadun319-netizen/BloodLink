// src/theme/ThemeContext.tsx
import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ColorPalette, darkColors, lightColors } from './colors';

interface ThemeValue {
    colors: ColorPalette;
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const system = useColorScheme();
    const [isDark, setIsDark] = useState<boolean>(system === 'dark');

    const value = useMemo<ThemeValue>(
        () => ({
            colors: isDark ? darkColors : lightColors,
            isDark,
            toggleTheme: () => setIsDark((prev) => !prev),
        }),
        [isDark],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used inside <ThemeProvider>');
    }
    return ctx;
}