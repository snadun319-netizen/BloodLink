import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { CheckIcon, WaterDropIcon, AlertBellIcon } from '../components/Icons';
import { colors } from '../theme/colors';

interface RegisteredSuccessScreenProps {
  onGoToDashboard: () => void;
  bloodGroup?: string;
}

export const RegisteredSuccessScreen: React.FC<RegisteredSuccessScreenProps> = ({
  onGoToDashboard,
  bloodGroup = 'AB-',
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Brand Header */}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge Visual with overlapping blood group */}
        <View style={styles.visualContainer}>
          <View style={styles.successSquircle}>
            <CheckIcon size={32} color="#10B981" strokeWidth={3.4} />
          </View>

          {/* Floating Blood Group Chip */}
          <View style={styles.bloodChip}>
            <Text style={styles.bloodChipText}>{bloodGroup}</Text>
          </View>
        </View>

        {/* Headings */}
        <Text style={styles.title}>You're registered!</Text>
        <Text style={styles.subtitle}>
          Your blood group verification document is under review. You'll receive a notification once approved.
        </Text>

        {/* Pending Verification Card */}
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Pending Verification</Text>
          <Text style={styles.pendingBody}>
            Your blood group will be verified by a BloodLink administrator. This usually takes 1–2 business days.
          </Text>
        </View>

        {/* While You Wait Section */}
        <View style={styles.whileYouWaitSection}>
          <Text style={styles.sectionHeader}>WHILE YOU WAIT</Text>

          <View style={styles.tipsRow}>
            {/* Card 1: Stay Hydrated */}
            <View style={styles.tipCard}>
              <View style={styles.tipIconWrapBlue}>
                <WaterDropIcon size={18} color="#2563EB" />
              </View>
              <Text style={styles.tipTitle}>Stay Hydrated</Text>
              <Text style={styles.tipDesc}>Drink +500ml water before match calls</Text>
            </View>

            {/* Card 2: Alerts On */}
            <View style={styles.tipCard}>
              <View style={styles.tipIconWrapRed}>
                <AlertBellIcon size={18} color="#EF4444" />
              </View>
              <Text style={styles.tipTitle}>Alerts On</Text>
              <Text style={styles.tipDesc}>Receive urgent hospital SOS alerts</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onGoToDashboard}
        >
          <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
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
    paddingBottom: 10,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  visualContainer: {
    position: 'relative',
    marginTop: 16,
    marginBottom: 24,
  },
  successSquircle: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodChip: {
    position: 'absolute',
    bottom: -6,
    right: -10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 32,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F87171',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bloodChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  pendingCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 4,
  },
  pendingBody: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  whileYouWaitSection: {
    width: '100%',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tipCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
  },
  tipIconWrapBlue: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipIconWrapRed: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
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
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
