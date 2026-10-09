import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Header } from '../components/Header';
import { StepIndicator } from '../components/StepIndicator';
import { colors } from '../theme/colors';

interface CreateAccountStep3ScreenProps {
  onBack: () => void;
  onContinue: (otp: string) => void;
  onSignIn: () => void;
  phoneNumber?: string;
}

export const CreateAccountStep3Screen: React.FC<CreateAccountStep3ScreenProps> = ({
  onBack,
  onContinue,
  onSignIn,
  phoneNumber = '',
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(45);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTextChange = (text: string, index: number) => {
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

  const formattedTimer = `00:${timerSeconds < 10 ? '0' : ''}${timerSeconds}`;

  const otpValue = digits.join('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title="Create Account" onBack={onBack} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to {phoneNumber || 'your phone number'}.
          </Text>

          <StepIndicator currentStep={3} totalSteps={4} />

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
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(val) => handleTextChange(val, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  textAlign="center"
                  autoFocus={index === 0}
                />
              );
            })}
          </View>

          {/* Resend OTP Row */}
          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>Didn't receive code?</Text>
            <TouchableOpacity
              disabled={timerSeconds > 0}
              onPress={() => setTimerSeconds(45)}
              activeOpacity={0.7}
            >
              <Text style={[styles.resendText, timerSeconds === 0 && { color: colors.primary }]}>
                Resend OTP {timerSeconds > 0 ? `(${formattedTimer})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => onContinue(otpValue)}
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 28,
  },
  otpBox: {
    width: 48,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  otpBoxFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F5',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
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
