import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../components/Header';
import { StepIndicator } from '../components/StepIndicator';
import { colors } from '../theme/colors';
import { sendRegistrationOtp, verifyRegistrationOtp } from '../services/authService';

interface CreateAccountStep3ScreenProps {
  onBack: () => void;
  onContinue: (registrationToken: string, email: string) => void;
  onSignIn: () => void;
  initialEmail?: string;
}

export const CreateAccountStep3Screen: React.FC<CreateAccountStep3ScreenProps> = ({
  onBack,
  onContinue,
  onSignIn,
  initialEmail = '',
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const [email, setEmail] = useState(initialEmail);
  const [sentEmail, setSentEmail] = useState('');
  const cleanEmail = email.trim().toLowerCase();

  // Send a code when the user requests email verification
  const handleSendOtp = useCallback(async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      await sendRegistrationOtp(cleanEmail, 'email');
      setSentEmail(cleanEmail);
      setDigits(['', '', '', '', '', '']);
      setTimerSeconds(45);
    } catch (err: any) {
      console.warn('Failed to send OTP:', err.message);
      setErrorMessage(err.message || 'Failed to send OTP code. Please retry.');
    } finally {
      setIsSending(false);
    }
  }, [cleanEmail]);


  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTextChange = (text: string, index: number) => {
    setErrorMessage(null);
    // If user pasted multi-digit string
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

    const cleanChar = text.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };


  const handleVerify = async () => {
    const otpValue = digits.join('');
    if (otpValue.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyRegistrationOtp(sentEmail, 'email', otpValue);
      if (res.verified) {
        onContinue(res.registrationToken, sentEmail);
      } else {
        setErrorMessage('Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid OTP code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const formattedTimer = `00:${timerSeconds < 10 ? '0' : ''}${timerSeconds}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Create Account" onBack={onBack} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            {sentEmail ? 'Enter the code sent to ' + sentEmail : 'Verify the email you will use to sign in and recover your account.'}
          </Text>

          <StepIndicator currentStep={3} totalSteps={4} />
          <TextInput
            style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, marginVertical: 12 }}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isSending && !isVerifying}
          />

          {/* Dev OTP Helper Banner */}


          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* 6-box OTP input */}
          <View style={styles.otpRow}>
            {digits.map((digit, index) => {
              const isActive = index === digits.findIndex((d) => d === '');
              return (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    isActive ? styles.otpBoxActive : null,
                    errorMessage ? styles.otpBoxError : null,
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(val) => handleTextChange(val, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  textAlign="center"
                  autoFocus={index === 0}
                  editable={!isVerifying}
                />
              );
            })}
          </View>

          {/* Resend OTP Row */}
          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>Didn't receive code?</Text>
            {isSending ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
            ) : (
              <TouchableOpacity
                disabled={timerSeconds > 0 || !cleanEmail || isVerifying}
                onPress={handleSendOtp}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendText, timerSeconds === 0 && { color: colors.primary }]}>
                  {sentEmail ? 'Resend OTP' : 'Send code'} {timerSeconds > 0 ? `(${formattedTimer})` : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isVerifying && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleVerify}
          disabled={isVerifying || isSending || !sentEmail}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify & Continue</Text>
          )}
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
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
  devBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  devBannerText: {
    fontSize: 13,
    color: '#991B1B',
  },
  devBannerBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  errorBanner: {
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  otpBox: {
    width: 48,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  otpBoxFilled: {
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  otpBoxError: {
    borderColor: '#E11D48',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 6,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signInLink: {
    alignItems: 'center',
    marginTop: 14,
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
