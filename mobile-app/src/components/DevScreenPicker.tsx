import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { ScreenName } from '../types/navigation';
import { colors } from '../theme/colors';

interface DevScreenPickerProps {
  currentScreen: ScreenName;
  onSelectScreen: (screen: ScreenName) => void;
}

const SCREENS: { id: ScreenName; label: string; category: string }[] = [
  { id: 'Splash', label: '1. Loading / Splash Screen', category: 'Intro & Onboarding' },
  { id: 'Welcome', label: '2. Welcome (Selection 1)', category: 'Intro & Onboarding' },
  { id: 'Onboarding', label: '3. Onboarding Carousel (2, 3, 4)', category: 'Intro & Onboarding' },

  { id: 'CreateAccountStep1', label: '4. Register: Step 1 (Personal Details)', category: 'Create Account Flow' },
  { id: 'CreateAccountStep2', label: '5. Register: Step 2 (Blood Group)', category: 'Create Account Flow' },
  { id: 'CreateAccountStep3', label: '6. Register: Step 3 (OTP Verification)', category: 'Create Account Flow' },
  { id: 'CreateAccountStep4', label: '7. Register: Step 4 (Document Upload)', category: 'Create Account Flow' },
  { id: 'RegisteredSuccess', label: '8. Registered Successfully', category: 'Create Account Flow' },

  { id: 'Login', label: '9. Login Screen (Phone/Email/Biometric)', category: 'Authentication' },

  { id: 'ResetPasswordStep1', label: '10. Reset Password: Step 1 (Email)', category: 'Reset Password Flow' },
  { id: 'ResetPasswordStep2', label: '11. Reset Password: Step 2 (OTP)', category: 'Reset Password Flow' },
  { id: 'ResetPasswordStep3', label: '12. Reset Password: Step 3 (New Password)', category: 'Reset Password Flow' },
];

export const DevScreenPicker: React.FC<DevScreenPickerProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const categories = Array.from(new Set(SCREENS.map((s) => s.category)));

  return (
    <>
      {/* Floating Toggle Pill */}
      <View style={styles.floatingContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.pillButton}
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.badgeIndicator} />
          <Text style={styles.pillText} numberOfLines={1}>
            Screens: {currentScreen}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>BloodLink Screen Navigator</Text>
                <Text style={styles.modalSubtitle}>Jump directly to any designed screen</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.screenList} showsVerticalScrollIndicator={false}>
              {categories.map((category) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryHeader}>{category}</Text>
                  {SCREENS.filter((s) => s.category === category).map((item) => {
                    const isSelected = item.id === currentScreen;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.screenItem,
                          isSelected && styles.screenItemSelected,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          onSelectScreen(item.id);
                          setModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.screenItemText,
                            isSelected && styles.screenItemTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && <Text style={styles.activeCheck}>●</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 9999,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    gap: 6,
  },
  badgeIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 160,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  screenList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  screenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  screenItemSelected: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  screenItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  screenItemTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  activeCheck: {
    color: colors.primary,
    fontSize: 10,
  },
});
