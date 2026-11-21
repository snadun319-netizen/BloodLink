// src/history/components/CertificateModal.tsx
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
import { buildCertificateHtml, buildCertificateRef } from '../../shared/pdf/pdfTemplates';
import { DonationRecord } from '../types/history';

const FONT_CAP = 1.2;

interface Props {
  visible: boolean;
  record: DonationRecord | null;
  donorName?: string;
  bloodGroup?: string;
  isMock: boolean;
  onClose: () => void;
}

function displayDate(iso: string): string {
  return Number.isNaN(new Date(iso).getTime()) ? iso : formatDate(iso);
}

export default function CertificateModal({
  visible,
  record,
  donorName,
  bloodGroup,
  isMock,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  if (!record) return null;

  const verified = record.status === 'verified';
  const dateText = displayDate(record.donatedAt);
  const name = donorName && donorName.trim() ? donorName.trim() : 'Valued Donor';
  const reference = buildCertificateRef(record.id, record.donatedAt);

  const handleShare = async () => {
    setBusy(true);
    try {
      const html = buildCertificateHtml({
        donorName: donorName ?? '',
        hospitalName: record.hospitalName,
        donatedAt: dateText,
        donationType: record.donationType,
        volumeMl: record.volumeMl,
        bloodGroup: bloodGroup ?? '',
        donationId: record.id,
        isMock,
      });
      await sharePdf(html, 'BloodLink donation certificate', 'landscape');
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
              Donation certificate
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close certificate">
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {!verified ? (
            <View style={styles.pending}>
              <Ionicons name="time-outline" size={30} color={colors.warning} />
              <Text style={styles.pendingText} maxFontSizeMultiplier={FONT_CAP}>
                The certificate is available after the donation is verified.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {isMock && (
                <View style={styles.sample}>
                  <Text style={styles.sampleText} maxFontSizeMultiplier={FONT_CAP}>
                    SAMPLE DATA - demo only
                  </Text>
                </View>
              )}

              <View style={styles.certOuter}>
                <View style={styles.certInner}>
                  <View style={styles.brandRow}>
                    <Ionicons name="water" size={16} color={colors.primary} />
                    <Text style={styles.brand} maxFontSizeMultiplier={FONT_CAP}>BloodLink</Text>
                  </View>
                  <Text style={styles.certTitle} maxFontSizeMultiplier={FONT_CAP}>
                    Certificate of Appreciation
                  </Text>
                  <View style={styles.rule} />
                  <Text style={styles.presented} maxFontSizeMultiplier={FONT_CAP}>
                    This certificate is presented to
                  </Text>
                  <Text style={styles.donor} maxFontSizeMultiplier={FONT_CAP}>{name}</Text>
                  <Text style={styles.recognition} maxFontSizeMultiplier={FONT_CAP}>
                    in grateful recognition of a voluntary whole blood donation, contributing to the
                    well-being of patients in need.
                  </Text>

                  <View style={styles.details}>
                    <Detail styles={styles} label="Hospital" value={record.hospitalName} />
                    <Detail styles={styles} label="Date" value={dateText} />
                    <Detail styles={styles} label="Type" value={record.donationType} />
                    <Detail
                      styles={styles}
                      label="Volume"
                      value={Number.isFinite(record.volumeMl) ? `${record.volumeMl} mL` : '-'}
                    />
                    <Detail styles={styles} label="Blood group" value={bloodGroup || '-'} />
                  </View>
                  <Text style={styles.ref} maxFontSizeMultiplier={FONT_CAP}>Reference: {reference}</Text>
                </View>
              </View>

              <Text style={styles.disclaimer} maxFontSizeMultiplier={FONT_CAP}>
                Issued by BloodLink from your recorded donation. This is an appreciation certificate,
                not a medical document.
              </Text>

              <Pressable
                onPress={handleShare}
                disabled={busy}
                style={[styles.shareButton, busy && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Share or save the certificate as a PDF"
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
          )}
        </View>
      </View>
    </Modal>
  );
}

function Detail({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel} maxFontSizeMultiplier={FONT_CAP}>{label}</Text>
      <Text style={styles.detailValue} maxFontSizeMultiplier={FONT_CAP}>{value || '-'}</Text>
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
    pending: { alignItems: 'center', gap: 10, padding: 32 },
    pendingText: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 21 },
    sample: { backgroundColor: c.warningSoft, borderRadius: radius.sm, paddingVertical: 6, alignItems: 'center' },
    sampleText: { color: c.warning, fontSize: 12, fontWeight: '700' },
    certOuter: { borderWidth: 3, borderColor: c.primary, borderRadius: 6, padding: 5, backgroundColor: '#FDFAF5' },
    certInner: { borderWidth: 1, borderColor: c.primary, borderRadius: 3, paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    brand: { fontSize: 12, fontWeight: '800', color: c.primary, letterSpacing: 1.5 },
    certTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginTop: 8, fontFamily: undefined },
    rule: { width: 70, height: 1, backgroundColor: c.primary, marginVertical: 10 },
    presented: { fontSize: 12, color: c.textMuted },
    donor: { fontSize: 24, fontWeight: '700', fontStyle: 'italic', color: c.primary, textAlign: 'center', marginVertical: 6 },
    recognition: { fontSize: 13, color: '#0F172A', textAlign: 'center', lineHeight: 20 },
    details: { alignSelf: 'stretch', marginTop: 14, gap: 8 },
    detailItem: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 6 },
    detailLabel: { fontSize: 12, color: c.textMuted },
    detailValue: { fontSize: 13, fontWeight: '700', color: '#0F172A', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
    ref: { fontSize: 11, color: c.textMuted, marginTop: 12 },
    disclaimer: { fontSize: 12, color: c.textMuted, textAlign: 'center', lineHeight: 18 },
    shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, borderRadius: radius.md, height: 50 },
    shareText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });