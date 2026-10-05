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
import { colors } from '../theme/colors';

interface CreateAccountStep2ScreenProps {
  onBack: () => void;
  onContinue: (bloodGroup: string) => void;
  onSignIn: () => void;
  initialBloodGroup?: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const CreateAccountStep2Screen: React.FC<CreateAccountStep2ScreenProps> = ({
  onBack,
  onContinue,
  onSignIn,
  initialBloodGroup = 'A-',
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(initialBloodGroup);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Create Account" onBack={onBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your Blood Group</Text>
        <Text style={styles.subtitle}>
          Select your blood group. You'll need to upload a document to verify this.
        </Text>

        <StepIndicator currentStep={2} totalSteps={4} />

        {/* 4x2 Blood Group Grid */}
        <View style={styles.grid}>
          {BLOOD_GROUPS.map((group) => {
            const isSelected = selectedGroup === group;
            return (
              <TouchableOpacity
                key={group}
                style={[
                  styles.bloodCard,
                  isSelected ? styles.selectedBloodCard : styles.unselectedBloodCard,
                ]}
                activeOpacity={0.75}
                onPress={() => setSelectedGroup(group)}
              >
                <Text
                  style={[
                    styles.bloodGroupText,
                    isSelected ? styles.selectedBloodGroupText : styles.unselectedBloodGroupText,
                  ]}
                >
                  {group}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Feedback Card */}
        {selectedGroup ? (
          <View style={styles.selectedFeedbackCard}>
            <View style={styles.selectedBadgeCircle}>
              <Text style={styles.selectedBadgeText}>{selectedGroup}</Text>
            </View>
            <View style={styles.feedbackTextWrap}>
              <Text style={styles.feedbackTitle}>{selectedGroup} selected</Text>
              <Text style={styles.feedbackSubtitle}>
                You'll verify this with a document in the next step.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => onContinue(selectedGroup)}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 18,
    rowGap: 14,
  },
  bloodCard: {
    width: '22.5%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  unselectedBloodCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  selectedBloodCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  bloodGroupText: {
    fontSize: 18,
    fontWeight: '800',
  },
  unselectedBloodGroupText: {
    color: '#1E293B',
  },
  selectedBloodGroupText: {
    color: colors.primary,
  },
  selectedFeedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  selectedBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDECEC',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  selectedBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  feedbackTextWrap: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  feedbackSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
