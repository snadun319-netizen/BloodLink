import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Header } from '../components/Header';
import { StepIndicator } from '../components/StepIndicator';
import { UploadIcon, CheckIcon } from '../components/Icons';
import { colors } from '../theme/colors';

interface CreateAccountStep4ScreenProps {
  onBack: () => void;
  onSubmit: (docName: string) => void;
  onSignIn: () => void;
  bloodGroup?: string;
}

const ACCEPTED_DOCUMENTS = [
  'Medical Laboratory Blood Report',
  'Blood Donation Service Card',
  'Hospital Discharge Summary',
  'National Blood Transfusion Report',
];

export const CreateAccountStep4Screen: React.FC<CreateAccountStep4ScreenProps> = ({
  onBack,
  onSubmit,
  onSignIn,
  bloodGroup = 'A-',
}) => {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleSimulateUpload = () => {
    setUploadedFile('blood_report_verification.pdf');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Create Account" onBack={onBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Blood Group Document</Text>
        <Text style={styles.subtitle}>
          Upload a document confirming your {bloodGroup} blood group for administrator verification.
        </Text>

        <StepIndicator currentStep={4} totalSteps={4} />

        {/* Upload Container */}
        <TouchableOpacity
          style={styles.uploadBox}
          activeOpacity={0.8}
          onPress={handleSimulateUpload}
        >
          <View style={styles.uploadIconBadge}>
            <UploadIcon size={24} color={colors.primary} />
          </View>

          {uploadedFile ? (
            <View style={styles.fileSelectedWrap}>
              <View style={styles.fileCheckRow}>
                <CheckIcon size={16} color="#10B981" />
                <Text style={styles.fileNameText}>{uploadedFile}</Text>
              </View>
              <Text style={styles.fileChangeText}>Tap to choose a different file</Text>
            </View>
          ) : (
            <>
              <Text style={styles.uploadPrompt}>Tap to upload document</Text>
              <Text style={styles.uploadSpecs}>PDF, JPG, PNG • max 10 MB</Text>

              <View style={styles.browseButton}>
                <Text style={styles.browseButtonText}>Browse Files</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Accepted Document Types */}
        <View style={styles.acceptedSection}>
          <Text style={styles.sectionHeader}>ACCEPTED DOCUMENT TYPES</Text>
          {ACCEPTED_DOCUMENTS.map((doc, idx) => (
            <View key={idx} style={styles.docItemRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.docItemText}>{doc}</Text>
            </View>
          ))}
        </View>

        {/* Important Notice Callout */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            <Text style={styles.noticeBold}>Important:</Text> A BloodLink administrator reviews your document. BloodLink does not automatically determine your blood group — human verification is required.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => onSubmit(uploadedFile || 'blood_verification_card.pdf')}
        >
          <Text style={styles.primaryButtonText}>Submit for Verification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInLink}
          activeOpacity={0.7}
          onPress={onSignIn}
        >
          <Text style={styles.signInText}>
            Already have account? <Text style={styles.signInHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  uploadBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 14,
  },
  uploadIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  uploadSpecs: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  browseButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  fileSelectedWrap: {
    alignItems: 'center',
    gap: 4,
  },
  fileCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  fileChangeText: {
    fontSize: 11,
    color: colors.primary,
  },
  acceptedSection: {
    marginTop: 10,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  docItemText: {
    fontSize: 13,
    color: '#475569',
  },
  noticeBox: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  noticeText: {
    fontSize: 12,
    color: '#854D0E',
    lineHeight: 18,
  },
  noticeBold: {
    fontWeight: '800',
    color: '#713F12',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  signInText: {
    fontSize: 13,
    color: '#64748B',
  },
  signInHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
});
