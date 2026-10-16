// src/history/utils/historyFormat.ts

// 1800 -> "1.8 L", 450 -> "450 ml"
export function formatVolume(ml: number): string {
    if (ml >= 1000) {
        const litres = ml / 1000;
        return `${Number.isInteger(litres) ? litres : litres.toFixed(1)} L`;
    }
    return `${ml} ml`;
}