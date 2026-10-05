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
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  FingerprintIcon,
} from '../components/Icons';
import { SecurityBadge } from '../components/SecurityBadge';
import { colors } from '../theme/colors';

interface LoginScreenProps {
  onBack: () => void;
  onSignIn: (method: 'phone' | 'email', credentials: any) => void;
  onForgotPassword: () => void;
  onRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onSignIn,
  onForgotPassword,
  onRegister,
}) => {
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('+94 77 123 4567');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    onSignIn(method, { phone, email, password });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C5162E" />

      {/* Crimson Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Welcome back,{'\n'}Donor</Text>
        <Text style={styles.headerSubtitle}>
          Sign in to your BloodLink account
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sign In Method Selector */}
          <View style={styles.methodRow}>
            <Text style={styles.methodLabel}>Sign in method</Text>
            <View style={styles.tabPill}>
              <TouchableOpacity
                style={[styles.tabButton, method === 'phone' && styles.tabButtonActive]}
                onPress={() => setMethod('phone')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    method === 'phone' && styles.tabButtonTextActive,
                  ]}
                >
                  Phone
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, method === 'email' && styles.tabButtonActive]}
                onPress={() => setMethod('email')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    method === 'email' && styles.tabButtonTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary Input (Phone or Email) */}
          {method === 'phone' ? (
            <View style={styles.inputContainer}>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryPill}>
                  <Text style={styles.countryPillText}>LK</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="+94 77 123 4567"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="you@email.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
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
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPasswordWrap}
            activeOpacity={0.7}
            onPress={onForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Biometric Button */}
          <TouchableOpacity
            style={styles.biometricButton}
            activeOpacity={0.8}
            onPress={handleSubmit}
          >
            <FingerprintIcon size={20} color={colors.primary} />
            <Text style={styles.biometricText}>Sign in with Face ID / Fingerprint</Text>
          </TouchableOpacity>

          {/* Security Guarantee Badge */}
          <SecurityBadge />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          activeOpacity={0.7}
          onPress={onRegister}
        >
          <Text style={styles.registerPrompt}>
            Don't have an account?{' '}
            <Text style={styles.registerHighlight}>Register as Donor</Text>
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
  header: {
    backgroundColor: '#C5162E',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  countryPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  countryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordRow: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  forgotPasswordWrap: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 46,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  biometricText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
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
  registerLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  registerPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  registerHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
});
