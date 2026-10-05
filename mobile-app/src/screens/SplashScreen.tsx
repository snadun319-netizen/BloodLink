import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const progressAnim = useRef(new Animated.Value(0.15)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Progress bar fill animation
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 1800,
      useNativeDriver: false,
    }).start();

    // Subtle gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto advance after 2.5s if not manually clicked
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish, progressAnim, pulseAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C5162E" />
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.95}
        onPress={onFinish}
      >
        <View style={styles.centerContainer}>
          {/* Logo Card with glow */}
          <Animated.View style={[styles.logoCard, { transform: [{ scale: pulseAnim }] }]}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* App Name */}
          <Text style={styles.appName}>BloodLink</Text>
          <Text style={styles.tagline}>SMART BLOOD DONATION</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.homeIndicator} />
          <Text style={styles.footerText}>SRI LANKA · 2026</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C5162E',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 20,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2.2,
    opacity: 0.9,
    marginBottom: 32,
  },
  progressBarTrack: {
    width: 150,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  homeIndicator: {
    width: 48,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1.6,
  },
});
