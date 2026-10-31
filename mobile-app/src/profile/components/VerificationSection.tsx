import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ColorPalette, radius, useTheme } from '../theme';
import { DonorProfile, VerificationStatus } from '../types/profile';
import { formatFileSize, formatMonthYear, maskNic } from '../utils/format';

interface Props {
    profile: DonorProfile;
    uploading: boolean;
    onUpload: () => void;
}

export default function VerificationSection({ profile, uploading, onUpload }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const doc = profile.document;
    const needsAction =
        doc?.status === 'rejected' ||
        profile.bloodGroupVerification === 'none' ||
        profile.bloodGroupVerification === 'rejected';
    const uploadDisabled = uploading || doc?.status === 'pending';

    const bg = describeBloodGroup(profile);

    const statusColor = (s: VerificationStatus) =>
        s === 'approved' ? colors.success : s === 'pending' ? colors.warning : colors.danger;
    const statusSoft = (s: VerificationStatus) =>
        s === 'approved' ? colors.successSoft : s === 'pending' ? colors.warningSoft : colors.dangerSoft;

    const hasNic = Boolean(profile.nicNumber && profile.nicNumber.trim().length > 0);

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Verification badges</Text>
                {needsAction && (
                    <View style={styles.actionPill}>
                        <Text style={styles.actionPillText}>Action required</Text>
                    </View>
                )}
            </View>

            {/* Blood group verification */}
            <View style={styles.badgeRow}>
                <View style={[styles.badgeIcon, { backgroundColor: statusSoft(profile.bloodGroupVerification) }]}>
                    <Ionicons
                        name="shield-checkmark-outline"
                        size={22}
                        color={statusColor(profile.bloodGroupVerification)}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.badgeTitle}>{bg.title}</Text>
                    <Text style={styles.badgeSub}>{bg.subtitle}</Text>
                </View>
                {profile.bloodGroupVerification === 'approved' && (
                    <View style={styles.groupTag}>
                        <Text style={styles.groupTagText}>{profile.bloodGroup}</Text>
                    </View>
                )}
            </View>

            {/* NIC verification - hidden when nicNumber is empty */}
            {hasNic && (
                <View style={styles.badgeRow}>
                    <View style={[styles.badgeIcon, { backgroundColor: colors.infoSoft }]}>
                        <Ionicons name="id-card-outline" size={22} color={colors.info} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.badgeTitle}>
                            {profile.nicVerified ? 'National identity verified' : 'National identity not verified'}
                        </Text>
                        <Text style={styles.badgeSub}>NIC: {maskNic(profile.nicNumber)}</Text>
                    </View>
                </View>
            )}

            {/* Latest uploaded document */}
            {doc && (
                <View
                    style={[
                        styles.docBox,
                        { backgroundColor: statusSoft(doc.status), borderColor: statusColor(doc.status) + '55' },
                    ]}
                >
                    <View style={styles.docRow}>
                        <View style={styles.docIcon}>
                            <Ionicons name="document-text-outline" size={22} color={statusColor(doc.status)} />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.docName} numberOfLines={1}>
                                {doc.fileName}
                            </Text>
                            <Text style={styles.docMeta}>
                                {formatFileSize(doc.sizeBytes)} • {docStatusText(doc.status)}
                            </Text>
                        </View>
                        <View style={[styles.docTag, { borderColor: statusColor(doc.status) + '55' }]}>
                            <Text style={[styles.docTagText, { color: statusColor(doc.status) }]}>
                                {doc.status === 'approved' ? 'Approved' : doc.status === 'pending' ? 'Pending' : 'Rejected'}
                            </Text>
                        </View>
                    </View>

                    {doc.status === 'rejected' && (
                        <View style={styles.reasonBox}>
                            <View style={styles.reasonHeader}>
                                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                                <Text style={styles.reasonTitle}>Document rejected – resubmission required</Text>
                            </View>
                            <Text style={styles.reasonText}>
                                {doc.rejectionReason ?? 'The document could not be verified. Please upload a new one.'}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <Pressable
                onPress={onUpload}
                disabled={uploadDisabled}
                accessibilityRole="button"
                accessibilityLabel="Upload verification document"
                accessibilityState={{ disabled: uploadDisabled, busy: uploading }}
                style={({ pressed }) => [
                    styles.uploadButton,
                    (uploadDisabled || pressed) && { opacity: uploadDisabled ? 0.5 : 0.85 },
                ]}
            >
                {uploading ? (
                    <ActivityIndicator color={colors.onDark} />
                ) : (
                    <>
                        <Ionicons name="cloud-upload-outline" size={20} color={colors.onDark} />
                        <Text style={styles.uploadText}>
                            {doc?.status === 'pending' ? 'Document under review' : doc ? 'Upload new verification document' : 'Upload verification document'}
                        </Text>
                    </>
                )}
            </Pressable>
            {doc?.status === 'pending' && (
                <Text style={styles.helper}>Your document is under review by an administrator.</Text>
            )}
        </View>
    );
}

function describeBloodGroup(p: DonorProfile): { title: string; subtitle: string } {
    switch (p.bloodGroupVerification) {
        case 'approved':
            return {
                title: `Blood group ${p.bloodGroup} confirmed`,
                subtitle: `${p.verifiedBy ?? 'Administrator'}${p.verifiedAt ? ` • ${formatMonthYear(p.verifiedAt)}` : ''}`,
            };
        case 'pending':
            return { title: `Blood group ${p.bloodGroup} pending review`, subtitle: 'Waiting for administrator approval' };
        case 'rejected':
            return { title: 'Blood group verification rejected', subtitle: 'Please upload a new document' };
        default:
            return { title: 'Blood group not verified', subtitle: 'Upload a document to get verified' };
    }
}

function docStatusText(s: VerificationStatus): string {
    if (s === 'approved') return 'Verification passed';
    if (s === 'pending') return 'Under review';
    return 'Verification failed';
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        card: {
            backgroundColor: c.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            padding: 18,
        },
        headerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
        sectionTitle: { fontSize: 12, fontWeight: '500', color: c.textMuted, letterSpacing: 0.5 },
        actionPill: { backgroundColor: c.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
        actionPillText: { color: c.primary, fontWeight: '500', fontSize: 12 },
        badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
        badgeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
        badgeTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: c.text },
        badgeSub: { fontSize: 12, lineHeight: 18, color: c.textMuted, marginTop: 3 },
        groupTag: {
            borderWidth: 1,
            borderColor: c.success,
            backgroundColor: c.successSoft,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
        },
        groupTagText: { color: c.success, fontWeight: '700', fontSize: 13 },
        docBox: { borderWidth: 1, borderRadius: radius.md, padding: 12, marginTop: 4, marginBottom: 16 },
        docRow: { flexDirection: 'row', alignItems: 'center' },
        docIcon: {
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: c.card,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        docName: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: c.text },
        docMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
        docTag: { backgroundColor: c.card, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
        docTagText: { fontWeight: '700', fontSize: 13 },
        reasonBox: { backgroundColor: c.card, borderRadius: 12, padding: 12, marginTop: 12 },
        reasonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
        reasonTitle: { color: c.danger, fontWeight: '600', fontSize: 13, lineHeight: 19, flexShrink: 1 },
        reasonText: { color: c.textMuted, fontSize: 12, lineHeight: 19 },
        uploadButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: c.dark,
            borderRadius: radius.md,
            minHeight: 52,
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginTop: 4,
        },
        uploadText: { color: c.onDark, fontWeight: '600', fontSize: 13, lineHeight: 19, flexShrink: 1, textAlign: 'center' },
        helper: { color: c.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' },
    });
