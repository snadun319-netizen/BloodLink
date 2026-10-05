import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';

interface WelcomeSelectionScreenProps {
  onGetStarted: () => void;
  onLogIn: () => void;
}

export const WelcomeSelectionScreen: React.FC<WelcomeSelectionScreenProps> = ({
  onGetStarted,
  onLogIn,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C5162E" />

      {/* Top Banner section */}
      <View style={styles.topSection}>
        <View style={styles.logoCard}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>BloodLink</Text>
        <Text style={styles.tagline}>SMART BLOOD DONATION</Text>
      </View>

      {/* Bottom Action section */}
      <View style={styles.bottomSection}>
        <View style={styles.contentWrap}>
          <Text style={styles.description}>
            Your smart assistant for life-saving connections.
          </Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={onGetStarted}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={onLogIn}
            >
              <Text style={styles.secondaryButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    flex: 1.25,
    backgroundColor: '#C5162E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  logoCard: {
    width: 92,
    height: 92,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 18,
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    opacity: 0.9,
  },
  bottomSection: {
    flex: 0.95,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
  },
  description: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
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
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
  },
});
