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

export function ThemeProvider({ children, forceLight }: { children: ReactNode; forceLight?: boolean }) {
    const system = useColorScheme();
    const [isDark, setIsDark] = useState<boolean>(system === 'dark');

    const effectiveIsDark = forceLight ? false : isDark;

    const value = useMemo<ThemeValue>(
        () => ({
            colors: effectiveIsDark ? darkColors : lightColors,
            isDark: effectiveIsDark,
            toggleTheme: () => {
                if (!forceLight) {
                    setIsDark((prev) => !prev);
                }
            },
        }),
        [effectiveIsDark, forceLight],
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