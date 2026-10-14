// src/profile/theme/colors.ts
export interface ColorPalette {
    background: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    primarySoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    info: string;
    infoSoft: string;
    dark: string; // dark action button
    onDark: string;
    onPrimary: string;
}

export const lightColors: ColorPalette = {
    background: '#F7F8FC',
    card: '#FFFFFF',
    border: '#EEF0F6',
    text: '#0F172A',
    textMuted: '#64748B',
    primary: '#D01C36',
    primarySoft: '#FDECEF',
    success: '#087B52',
    successSoft: '#E6F7F0',
    warning: '#D97706',
    warningSoft: '#FEF3E2',
    danger: '#C8102E',
    dangerSoft: '#FDEDEE',
    info: '#2563EB',
    infoSoft: '#EAF1FF',
    dark: '#0F172A',
    onDark: '#FFFFFF',
    onPrimary: '#FFFFFF',
};

export const darkColors: ColorPalette = {
    background: '#0B1020',
    card: '#151B2E',
    border: '#232B42',
    text: '#F1F5F9',
    textMuted: '#8B97B0',
    primary: '#F0405A',
    primarySoft: '#3A1620',
    success: '#34D399',
    successSoft: '#12332A',
    warning: '#FBBF24',
    warningSoft: '#3A2D12',
    danger: '#F87171',
    dangerSoft: '#3A1A1E',
    info: '#60A5FA',
    infoSoft: '#17284A',
    dark: '#F1F5F9',
    onDark: '#0F172A',
    onPrimary: '#FFFFFF',
};
