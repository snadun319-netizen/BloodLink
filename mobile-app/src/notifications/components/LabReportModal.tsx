// src/notifications/components/LabReportModal.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ColorPalette, radius, useTheme } from '../../profile/theme';
import { formatDate } from '../../profile/utils/format';
import { sharePdf } from '../../shared/pdf/pdfService';
import { buildLabReportHtml } from '../../shared/pdf/pdfTemplates';
import { AppNotification } from '../types/notifications';

const FONT_CAP = 1.2;

interface Props {
  visible: boolean;
  notification: AppNotification | null;
  donorName?: string;
  isMock: boolean;
  onClose: () => void;
}

function displayDate(iso: string): string {
  return Number.isNaN(new Date(iso).getTime()) ? iso : formatDate(iso);
}

export default function LabReportModal({ visible, notification, donorName, isMock, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  const report = notification?.labReport;
  if (!notification || !report) return null;

  const dateText = displayDate(notification.createdAt);
  const name = donorName && donorName.trim() ? donorName.trim() : 'Valued Donor';

  const handleShare = async () => {
    setBusy(true);
    try {
      const html = buildLabReportHtml({
        donorName: donorName ?? '',
        donationDate: dateText,
        reportedBy: notification.subtitle ?? '',
        hemoglobin: report.hemoglobin,
        volumeMl: report.volumeMl,
        infectiousDiseases: report.infectiousDiseases,
        allClear: report.allClear,
        doctorMessage: report.doctorMessage,
        isMock,
      });
      await sharePdf(html, 'BloodLink screening summary', 'portrait');
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Text style={styles.title} maxFontSizeMultiplier={FONT_CAP} numberOfLines={1}>
              Screening summary
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close screening summary">
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {isMock && (
              <View style={styles.sample}>
                <Text style={styles.sampleText} maxFontSizeMultiplier={FONT_CAP}>
                  SAMPLE DATA - demo only
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={FONT_CAP}>
                Post-Donation Screening Summary
              </Text>
              <Row styles={styles} label="Donor" value={name} />
              <Row styles={styles} label="Donation date" value={dateText} />
              <Row styles={styles} label="Reported by" value={notification.subtitle || '-'} />
            </View>

            <View style={styles.card}>
              <Row styles={styles} label="Hemoglobin" value={report.hemoglobin || '-'} />
              <Row
                styles={styles}
                label="Volume"
                value={Number.isFinite(report.volumeMl) ? `${report.volumeMl} mL` : '-'}
              />
              <Row styles={styles} label="HIV / HBV / HCV" value={report.infectiousDiseases || '-'} />
              <View style={styles.statusRow}>
                <Text style={styles.rowLabel} maxFontSizeMultiplier={FONT_CAP}>Overall status</Text>
                <View style={[styles.badge, { backgroundColor: report.allClear ? colors.successSoft : colors.warningSoft }]}>
                  <Text
                    style={[styles.badgeText, { color: report.allClear ? colors.success : colors.warning }]}
                    maxFontSizeMultiplier={FONT_CAP}
                  >
                    {report.allClear ? 'All clear' : 'Review required'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, styles.noteCard]}>
              <Text style={styles.noteTitle} maxFontSizeMultiplier={FONT_CAP}>Doctor&apos;s note</Text>
              <Text style={styles.note} maxFontSizeMultiplier={FONT_CAP}>
                &ldquo;{report.doctorMessage || '-'}&rdquo;
              </Text>
            </View>

            <Text style={styles.disclaimer} maxFontSizeMultiplier={FONT_CAP}>
              Screening markers are for transfusion safety, not a diagnosis. Final donor eligibility is
              decided by qualified blood-bank staff.
            </Text>

            <Pressable
              onPress={handleShare}
              disabled={busy}
              style={[styles.shareButton, busy && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Share or save the screening summary as a PDF"
            >
              {busy ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={colors.onPrimary} />
                  <Text style={styles.shareText} maxFontSizeMultiplier={FONT_CAP}>Share / Save PDF</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} maxFontSizeMultiplier={FONT_CAP}>{label}</Text>
      <Text style={styles.rowValue} maxFontSizeMultiplier={FONT_CAP}>{value}</Text>
    </View>
  );
}

const createStyles = (c: ColorPalette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '90%',
      backgroundColor: c.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 16,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
    title: { flex: 1, fontSize: 17, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
    sample: { backgroundColor: c.warningSoft, borderRadius: radius.sm, paddingVertical: 6, alignItems: 'center' },
    sampleText: { color: c.warning, fontSize: 12, fontWeight: '700' },
    card: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    rowLabel: { fontSize: 13, color: c.textMuted },
    rowValue: { fontSize: 13, fontWeight: '700', color: c.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    noteCard: { borderLeftWidth: 3, borderLeftColor: c.primary },
    noteTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    note: { fontSize: 13.5, color: c.text, lineHeight: 20, fontStyle: 'italic' },
    disclaimer: { fontSize: 12, color: c.textMuted, textAlign: 'center', lineHeight: 18 },
    shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, borderRadius: radius.md, height: 50 },
    shareText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });