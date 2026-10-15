import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { StepIndicator } from '../components/StepIndicator';
import { CheckIcon } from '../components/Icons';
import { colors } from '../theme/colors';
import { sendRegistrationOtp, verifyRegistrationOtp } from '../services/authService';
import { normalizeSriLankanMobile } from '../utils/phone';
import {
  maskRegistrationEmail,
  registrationCodeIsCurrent,
  registrationProofIsCurrent,
  registrationResendSeconds,
} from '../utils/registration';

interface CreateAccountStep3ScreenProps {
  onBack: () => void;
  onContinue: (registrationToken: string, email: string) => void;
  onSignIn: () => void;
  email: string;
  phone: string;
  initialSentAt?: number;
  initialToken?: string;
  initialVerifiedAt?: number;
  onCodeSent: (sentAt: number) => void;
}

export const CreateAccountStep3Screen: React.FC<CreateAccountStep3ScreenProps> = ({
  onBack,
  onContinue,
  onSignIn,
  email,
  phone,
  initialSentAt,
  initialToken,
  initialVerifiedAt,
  onCodeSent,
}) => {
  const cleanEmail = email.trim().toLowerCase();
  const hasContactDetails = !!cleanEmail && !!normalizeSriLankanMobile(phone);
  const [code, setCode] = useState('');
  const [sentAt, setSentAt] = useState(initialSentAt);
  const [now, setNow] = useState(Date.now);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const mounted = useRef(false);
  const autoSendStarted = useRef(false);
  const requestInProgress = useRef(false);
  const verified = registrationProofIsCurrent(initialToken, initialVerifiedAt, now);
  const hasSentCode = registrationCodeIsCurrent(sentAt, now);
  const resendSeconds = registrationResendSeconds(sentAt, now);
  const busy = isSending || isVerifying;

  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!hasContactDetails || requestInProgress.current) return;
    requestInProgress.current = true;
    setIsSending(true);
    setErrorMessage(null);
    try {
      await sendRegistrationOtp(cleanEmail, 'email');
      if (!mounted.current) return;
      const timestamp = Date.now();
      setSentAt(timestamp);
      setNow(timestamp);
      setCode('');
      onCodeSent(timestamp);
      inputRef.current?.focus();
    } catch (error: any) {
      if (mounted.current) setErrorMessage(error.message || 'Could not send your code. Please try again.');
    } finally {
      requestInProgress.current = false;
      if (mounted.current) setIsSending(false);
    }
  }, [cleanEmail, hasContactDetails, onCodeSent]);

  useEffect(() => {
    if (!hasContactDetails || hasSentCode || verified || autoSendStarted.current) return;
    autoSendStarted.current = true;
    void handleSendCode();
  }, [handleSendCode, hasContactDetails, hasSentCode, verified]);

  useEffect(() => {
    if (hasSentCode && !verified && !busy) inputRef.current?.focus();
  }, [hasSentCode, verified, busy]);

  const handleVerify = async () => {
    if (requestInProgress.current || !hasContactDetails) return;
    if (verified && initialToken) {
      onContinue(initialToken, cleanEmail);
      return;
    }
    if (!hasSentCode || code.length !== 6) {
      setErrorMessage(hasSentCode ? 'Enter all 6 digits of the verification code.' : 'Request a new verification code first.');
      return;
    }
    requestInProgress.current = true;
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const result = await verifyRegistrationOtp(cleanEmail, 'email', code);
      if (!mounted.current) return;
      if (result.verified && result.registrationToken) {
        onContinue(result.registrationToken, cleanEmail);
      } else {
        setErrorMessage('Verification failed. Please check the code.');
      }
    } catch (error: any) {
      if (mounted.current) setErrorMessage(error.message || 'Invalid code. Please try again.');
    } finally {
      requestInProgress.current = false;
      if (mounted.current) setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Create Account" onBack={onBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Account Verification</Text>
          <Text style={styles.subtitle}>
            {verified ? 'Verification complete. Continue to finish creating your account.' : 'Enter your 6-digit verification code to finish setting up your account.'}
          </Text>
          <StepIndicator currentStep={3} totalSteps={4} />

          <View style={styles.contactSummary}>
            <Text style={styles.contactLabel}>Verification email</Text>
            <Text style={styles.contactValue}>{maskRegistrationEmail(cleanEmail)}</Text>
          </View>

          {!hasContactDetails && (
            <Text style={styles.errorText} accessibilityRole="alert">Add your email and mobile number in Personal Details first.</Text>
          )}
          {errorMessage && <View style={styles.errorBanner}><Text style={styles.errorText} accessibilityRole="alert">{errorMessage}</Text></View>}

          {verified ? (
            <View style={styles.verifiedCard}>
              <CheckIcon size={20} color={colors.success} />
              <Text style={styles.verifiedText}>Account verification complete</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.otpRow} activeOpacity={1} onPress={() => inputRef.current?.focus()} accessible={false}>
                {Array.from({ length: 6 }, (_, index) => (
                  <View key={index} style={[styles.otpBox, code[index] ? styles.otpBoxFilled : null, hasSentCode && index === Math.min(code.length, 5) ? styles.otpBoxActive : null, errorMessage ? styles.otpBoxError : null]}>
                    <Text style={styles.otpDigit} accessible={false}>{code[index] || ''}</Text>
                  </View>
                ))}
                <TextInput
                  ref={inputRef}
                  style={styles.codeInput}
                  value={code}
                  onChangeText={(value) => { setCode(value.replace(/[^0-9]/g, '').slice(0, 6)); setErrorMessage(null); }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  caretHidden
                  autoCorrect={false}
                  accessibilityLabel="Six digit account verification code"
                  editable={hasSentCode && !busy}
                  onSubmitEditing={handleVerify}
                />
              </TouchableOpacity>
              <View style={styles.resendRow}>
                {isSending ? (
                  <><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.resendPrompt}>Sending your code...</Text></>
                ) : (
                  <>
                    <Text style={styles.resendPrompt}>{hasSentCode ? "Didn't receive code?" : 'Need a code?'}</Text>
                    <TouchableOpacity disabled={!hasContactDetails || busy || resendSeconds > 0} onPress={handleSendCode} style={styles.resendButton} accessibilityRole="button">
                      <Text style={[styles.linkText, (!hasContactDetails || busy || resendSeconds > 0) && styles.muted]}>
                        {resendSeconds > 0 ? 'Resend in ' + resendSeconds + 's' : hasSentCode ? 'Resend OTP' : 'Send code'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.primaryButton, (busy || !hasContactDetails || (!verified && (!hasSentCode || code.length !== 6))) && styles.disabled]} onPress={handleVerify} disabled={busy || !hasContactDetails || (!verified && (!hasSentCode || code.length !== 6))} activeOpacity={0.85}>
            {isVerifying ? <ActivityIndicator color={colors.textWhite} /> : <Text style={styles.primaryButtonText}>{verified ? 'Continue' : 'Verify & Continue'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.signInLink} activeOpacity={0.7} onPress={onSignIn}>
            <Text style={styles.signInText}>Already have an account? <Text style={styles.linkText}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  contactSummary: { marginTop: 16, marginBottom: 8 },
  contactLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  contactValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  errorBanner: { backgroundColor: '#FFF1F2', borderRadius: 8, padding: 10, marginTop: 8 },
  errorText: { color: colors.primary, fontSize: 12, lineHeight: 18 },
  otpRow: { position: 'relative', flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 16 },
  otpBox: { flex: 1, height: 54, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  otpDigit: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  otpBoxFilled: { borderColor: '#94A3B8', backgroundColor: colors.background },
  otpBoxActive: { borderColor: colors.primary, backgroundColor: colors.background },
  otpBoxError: { borderColor: colors.primary },
  codeInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontSize: 22 },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  resendPrompt: { fontSize: 13, color: '#64748B' },
  resendButton: { minHeight: 44, justifyContent: 'center' },
  muted: { color: '#94A3B8' },
  verifiedCard: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 16, backgroundColor: colors.successLight, borderRadius: 12, marginVertical: 16 },
  verifiedText: { color: '#047857', fontSize: 14, fontWeight: '600' },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12 },
  primaryButton: { backgroundColor: colors.primary, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: colors.textWhite, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  signInLink: { alignItems: 'center', paddingVertical: 14 },
  signInText: { fontSize: 13, color: '#64748B' },
});
