import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface OnboardingCarouselScreenProps {
  onComplete: () => void;
  onSignIn: () => void;
}

const slides = [
  {
    id: 1,
    tag: 'Smart Matching',
    title: 'Your donation\nreaches who needs\nit most',
    description:
      'BloodLink privately matches you with blood requests from verified hospitals near you.',
    image: require('../../assets/images/onboarding1.jpg'),
    buttonText: 'Next',
  },
  {
    id: 2,
    tag: 'Verified & Secure',
    title: 'Every request\ncomes from a\nverified hospital',
    description:
      'All institutions are administrator-verified before they can create blood requests on BloodLink.',
    image: require('../../assets/images/onboarding2.jpg'),
    buttonText: 'Next',
  },
  {
    id: 3,
    tag: 'Privacy First',
    title: 'Your location\nis always protected',
    description:
      'Hospitals never see your exact location. Only your approximate distance and availability are shared.',
    image: require('../../assets/images/onboarding3.jpg'),
    buttonText: 'Continue',
  },
];

export const OnboardingCarouselScreen: React.FC<OnboardingCarouselScreenProps> = ({
  onComplete,
  onSignIn,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const currentSlide = slides[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Logo */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>BloodLink</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Visual Image */}
        <View style={styles.imageContainer}>
          <Image
            source={currentSlide.image}
            style={styles.slideImage}
            resizeMode="cover"
          />
        </View>

        {/* Text information */}
        <View style={styles.textContainer}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{currentSlide.tag}</Text>
          </View>

          <Text style={styles.title}>{currentSlide.title}</Text>

          <Text style={styles.description}>{currentSlide.description}</Text>

          {/* Carousel dots */}
          <View style={styles.dotsRow}>
            {slides.map((_, index) => {
              const isActive = index === currentIndex;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentIndex(index)}
                  activeOpacity={0.7}
                  style={[
                    styles.dot,
                    isActive ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>

      {/* Bottom Action Area */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.primaryButtonText}>{currentSlide.buttonText}</Text>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 22,
    height: 22,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  imageContainer: {
    width: '100%',
    height: width * 0.58,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  tagBadge: {
    backgroundColor: colors.primaryBadgeBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryBadgeText,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 32,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    width: 20,
    backgroundColor: colors.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#E2E8F0',
  },
  bottomArea: {
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
    paddingVertical: 6,
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
