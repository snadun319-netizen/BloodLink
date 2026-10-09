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
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
} from '../components/Icons';
import { PasswordRecoverySteps } from '../components/PasswordRecoverySteps';
import { colors } from '../theme/colors';

interface ResetPasswordStep3ScreenProps {
  onBack: () => void;
  onResetComplete: () => void;
  onSignIn: () => void;
}

export const ResetPasswordStep3Screen: React.FC<ResetPasswordStep3ScreenProps> = ({
  onBack,
  onResetComplete,
  onSignIn,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Requirements checks
  const hasMinLength = password.length >= 8;
  const hasUpperAndNumber = /[A-Z]/.test(password) && /[0-9]/.test(password);
  const hasSpecial = /[@#$%^&*!~_+=]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  // Calculate strength segments (0 to 4)
  const strength = (hasMinLength ? 1 : 0) + (hasUpperAndNumber ? 2 : 0) + (hasSpecial ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="New Password" onBack={onBack} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Center Lock Icon */}
          <View style={styles.iconCenter}>
            <View style={styles.iconSquircle}>
              <LockIcon size={24} color={colors.primary} />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Create a strong new password for your BloodLink donor account to keep your records secure.
          </Text>

          {/* New Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputLeftIcon}>
                <LockIcon size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOffIcon size={20} color="#94A3B8" />
                ) : (
                  <EyeIcon size={20} color="#94A3B8" />
                )}
              </TouchableOpacity>
            </View>

            {/* Strength Bar Indicator */}
            <View style={styles.strengthRow}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.strengthSegment,
                      bar <= strength ? styles.strengthActive : styles.strengthInactive,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.strengthText}>Strong password</Text>
            </View>
          </View>

          {/* Confirm Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View
              style={[
                styles.inputRow,
                isMatch && styles.inputRowMatched,
              ]}
            >
              <View style={styles.inputLeftIcon}>
                {isMatch ? (
                  <CheckIcon size={18} color="#10B981" />
                ) : (
                  <LockIcon size={18} color="#94A3B8" />
                )}
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Confirm password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirmPassword ? (
                  <EyeOffIcon size={20} color="#94A3B8" />
                ) : (
                  <EyeIcon size={20} color="#94A3B8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements Checklist */}
          <View style={styles.checklistCard}>
            <View style={styles.checkItem}>
              <CheckIcon size={14} color="#10B981" />
              <Text style={[styles.checkText, hasMinLength && styles.checkTextDone]}>
                At least 8 characters
              </Text>
            </View>
            <View style={styles.checkItem}>
              <CheckIcon size={14} color="#10B981" />
              <Text style={[styles.checkText, hasUpperAndNumber && styles.checkTextDone]}>
                Includes uppercase letter & number
              </Text>
            </View>
            <View style={styles.checkItem}>
              <CheckIcon size={14} color="#10B981" />
              <Text style={[styles.checkText, hasSpecial && styles.checkTextDone]}>
                Includes 1 special symbol (@, #, $, etc.)
              </Text>
            </View>
          </View>

          {/* Password Recovery Steps Indicator (Step 3 active) */}
          <PasswordRecoverySteps currentStep={3} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onResetComplete}
        >
          <Text style={styles.primaryButtonText}>Reset Password & Sign In</Text>
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
    marginVertical: 10,
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
  inputRow: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inputRowMatched: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthActive: {
    backgroundColor: '#10B981',
  },
  strengthInactive: {
    backgroundColor: '#E2E8F0',
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  checklistCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#64748B',
  },
  checkTextDone: {
    color: '#0F172A',
    fontWeight: '600',
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
