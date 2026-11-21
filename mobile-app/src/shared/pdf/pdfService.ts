// src/shared/pdf/pdfService.ts
//
// Generates a PDF from an HTML string using expo-print and opens the
// system share sheet using expo-sharing. No file renaming is attempted;
// expo-print assigns its own temporary file name.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/** Landscape A4 dimensions in points (1 pt = 1/72 inch). */
const A4_LANDSCAPE_WIDTH  = 841.89;
const A4_LANDSCAPE_HEIGHT = 595.28;

/** Portrait A4 dimensions in points. */
const A4_PORTRAIT_WIDTH  = 595.28;
const A4_PORTRAIT_HEIGHT = 841.89;

export type PdfOrientation = 'portrait' | 'landscape';

/**
 * Renders the given HTML to a temporary PDF file and opens the system share
 * sheet so the user can save, send or print it.
 *
 * @param html          Full HTML document string (from pdfTemplates.ts).
 * @param dialogTitle   Title shown in the Android share sheet.
 * @param orientation   'portrait' (default) or 'landscape'.
 * @throws              Re-throws if PDF generation fails so the caller can
 *                      show a user-facing error message.
 */
export async function sharePdf(
    html: string,
    dialogTitle: string,
    orientation: PdfOrientation = 'portrait',
): Promise<void> {
    const width  = orientation === 'landscape' ? A4_LANDSCAPE_WIDTH  : A4_PORTRAIT_WIDTH;
    const height = orientation === 'landscape' ? A4_LANDSCAPE_HEIGHT : A4_PORTRAIT_HEIGHT;

    // Generate the PDF file; uri is a local file:// path in the app cache.
    const { uri } = await Print.printToFileAsync({ html, width, height });

    const available = await Sharing.isAvailableAsync();
    if (!available) {
        Alert.alert(
            'Sharing not available',
            'Your device does not support the share sheet. You can take a screenshot instead.',
        );
        return;
    }

    await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle,
        UTI: 'com.adobe.pdf',
    });
}

