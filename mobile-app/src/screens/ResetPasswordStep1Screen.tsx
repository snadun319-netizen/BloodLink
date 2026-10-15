import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { ShieldIcon } from '../components/Icons';
import { PasswordRecoverySteps } from '../components/PasswordRecoverySteps';
import { SecurityBadge } from '../components/SecurityBadge';
import { colors } from '../theme/colors';

import { requestPasswordReset } from '../services/authService';

interface ResetPasswordStep1ScreenProps {
  onBack: () => void;
  onSendResetLink: (email: string) => void;
  onSignIn: () => void;
}

export const ResetPasswordStep1Screen: React.FC<ResetPasswordStep1ScreenProps> = ({
  onBack,
  onSendResetLink,
  onSignIn,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await requestPasswordReset(cleanEmail);
      onSendResetLink(cleanEmail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request reset OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Reset Password" onBack={onBack} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Center Shield Icon */}
          <View style={styles.iconCenter}>
            <View style={styles.iconSquircle}>
              <ShieldIcon size={24} color={colors.primary} />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Enter your registered email address. We'll send a OTP to your account.
          </Text>

          {errorMessage && (
            <View style={{ backgroundColor: '#FFF1F2', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: '#E11D48', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* Password Recovery Steps Indicator */}
          <PasswordRecoverySteps currentStep={1} />

          {/* Security Note */}
          <SecurityBadge />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInLink}
          activeOpacity={0.7}
          onPress={onSignIn}
        >
          <Text style={styles.signInText}>
            Remember password? <Text style={styles.signInHighlight}>Sign In</Text>
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
  iconCenter: {
    alignItems: 'center',
    marginVertical: 12,
  },
  iconSquircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
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
