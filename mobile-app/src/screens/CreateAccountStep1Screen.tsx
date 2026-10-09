import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Header } from '../components/Header';
import { StepIndicator } from '../components/StepIndicator';
import { CalendarIcon, ChevronDownIcon, ShieldIcon } from '../components/Icons';
import { colors } from '../theme/colors';

interface CreateAccountStep1ScreenProps {
  onBack: () => void;
  onContinue: (data: {
    fullName: string;
    phone: string;
    countryCode: string;
    dob: string;
    nic: string;
  }) => void;
  onSignIn: () => void;
  initialData?: {
    fullName?: string;
    phone?: string;
    countryCode?: string;
    dob?: string;
    nic?: string;
  };
}

export const CreateAccountStep1Screen: React.FC<CreateAccountStep1ScreenProps> = ({
  onBack,
  onContinue,
  onSignIn,
  initialData,
}) => {
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [countryCode, setCountryCode] = useState(initialData?.countryCode || '+94');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [nic, setNic] = useState(initialData?.nic || '');

  const handleContinue = () => {
    onContinue({
      fullName: fullName.trim(),
      phone: phone.trim(),
      countryCode,
      dob: dob.trim(),
      nic: nic.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Create Account" onBack={onBack} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title & subtitle */}
          <Text style={styles.title}>Personal Details</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself to create your donor profile.
          </Text>

          {/* Step bar */}
          <StepIndicator currentStep={1} totalSteps={4} />

          {/* Form Fields */}
          <View style={styles.formGroup}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity
                  style={styles.countryPicker}
                  activeOpacity={0.8}
                  onPress={() => setCountryCode(countryCode === '+94' ? '+1' : '+94')}
                >
                  <Text style={styles.countryCodeText}>{countryCode}</Text>
                  <ChevronDownIcon size={12} color="#64748B" />
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="77 123 4567"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <View style={styles.iconInputRow}>
                <TextInput
                  style={styles.iconInputText}
                  placeholder="YYYY/MM/DD"
                  placeholderTextColor="#94A3B8"
                  value={dob}
                  onChangeText={setDob}
                />
                <CalendarIcon size={18} color="#64748B" />
              </View>
            </View>

            {/* NIC Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>NIC Number</Text>
              <TextInput
                style={styles.input}
                placeholder="National ID Number"
                placeholderTextColor="#94A3B8"
                value={nic}
                onChangeText={setNic}
                autoCapitalize="characters"
              />
            </View>

            {/* Privacy Informational Card */}
            <View style={styles.privacyCard}>
              <View style={styles.privacyIconWrap}>
                <ShieldIcon size={18} color="#475569" />
              </View>
              <Text style={styles.privacyText}>
                Your personal information is kept private. Only operationally relevant details are shared with institutions.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleContinue}
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
  formGroup: {
    marginTop: 8,
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryPicker: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  phoneInput: {
    flex: 1,
  },
  iconInputRow: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  iconInputText: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  privacyCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  privacyIconWrap: {
    marginRight: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
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
