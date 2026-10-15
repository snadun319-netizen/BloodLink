import React, { useState, useRef, useEffect } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { MailIcon } from '../components/Icons';
import { PasswordRecoverySteps } from '../components/PasswordRecoverySteps';
import { SecurityBadge } from '../components/SecurityBadge';
import { colors } from '../theme/colors';
import { verifyPasswordResetOtp, requestPasswordReset } from '../services/authService';

interface ResetPasswordStep2ScreenProps {
  onBack: () => void;
  onVerify: (otp: string, resetToken?: string) => void;
  onChangeEmail: () => void;
  email?: string;
}

export const ResetPasswordStep2Screen: React.FC<ResetPasswordStep2ScreenProps> = ({
  onBack,
  onVerify,
  onChangeEmail,
  email = '',
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [expirySeconds, setExpirySeconds] = useState(899); // 14:59
  const [resendSeconds, setResendSeconds] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);


  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      await requestPasswordReset(email);
      setResendSeconds(45);
      setExpirySeconds(899);
      setDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifySubmit = async () => {
    const otpValue = digits.join('');
    if (otpValue.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await verifyPasswordResetOtp(email, otpValue);
      onVerify(otpValue, res.resetToken);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTextChange = (text: string, index: number) => {
    if (text.length > 1) {
      const pasted = text.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const newDigits = [...digits];
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const clean = text.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Enter OTP Code" onBack={onBack} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Center Mail Icon */}
          <View style={styles.iconCenter}>
            <View style={styles.iconSquircle}>
              <MailIcon size={24} color={colors.primary} />
            </View>
          </View>

          {/* Description with Expiry Countdown */}
          <Text style={styles.description}>
            We have sent a 6-digit verification code to{' '}
            <Text style={styles.emailHighlight}>{email}</Text>. Code expires in{' '}
            <Text style={styles.timerHighlight}>{formatTime(expirySeconds)}</Text>.
          </Text>

          {/* Dev OTP Helper Banner */}


          {/* Error Message */}
          {errorMessage && (
            <View style={{ backgroundColor: '#FFF1F2', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: '#E11D48', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Code Input */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Verification Code</Text>
            <View style={styles.codeRow}>
              {digits.map((digit, idx) => {
                const isActive = idx === digits.findIndex((d) => d === '');
                return (
                  <TextInput
                    key={idx}
                    ref={(ref) => {
                      inputRefs.current[idx] = ref;
                    }}
                    style={[
                      styles.codeBox,
                      digit ? styles.codeBoxFilled : null,
                      isActive ? styles.codeBoxActive : null,
                      errorMessage ? { borderColor: '#E11D48' } : null,
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleTextChange(val, idx)}
                    onKeyPress={(e) => handleKeyPress(e, idx)}
                    textAlign="center"
                    editable={!isVerifying}
                  />
                );
              })}
            </View>

            {/* Resend Row */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn't receive code?</Text>
              <TouchableOpacity
                disabled={resendSeconds > 0 || isResending}
                onPress={handleResend}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendText, resendSeconds === 0 && { color: colors.primary }]}>
                  {isResending ? 'Sending...' : `Resend OTP ${resendSeconds > 0 ? `(00:${resendSeconds < 10 ? '0' : ''}${resendSeconds})` : ''}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Recovery Steps Indicator (Step 2 active) */}
          <PasswordRecoverySteps currentStep={2} />

          {/* Security Note */}
          <SecurityBadge />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isVerifying && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleVerifySubmit}
          disabled={isVerifying}
        >
          <Text style={styles.primaryButtonText}>
            {isVerifying ? 'Verifying...' : 'Verify & Proceed'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInLink}
          activeOpacity={0.7}
          onPress={onChangeEmail}
        >
          <Text style={styles.signInText}>
            Use different email? <Text style={styles.signInHighlight}>Click Here</Text>
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
  emailHighlight: {
    fontWeight: '700',
    color: '#1E293B',
  },
  timerHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  codeContainer: {
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  codeBox: {
    width: 46,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  codeBoxFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  codeBoxActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F5',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
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
