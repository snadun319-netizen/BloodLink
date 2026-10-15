import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface DatePickerSheetProps {
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

export function DatePickerSheet({ children, onCancel, onConfirm, confirmDisabled }: DatePickerSheetProps) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel date selection" />
        <SafeAreaView style={styles.sheet} edges={['bottom', 'left', 'right']} accessibilityViewIsModal onAccessibilityEscape={onCancel}>
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.action} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title} accessibilityRole="header">Date of Birth</Text>
            <TouchableOpacity style={[styles.action, confirmDisabled && styles.disabled]} onPress={onConfirm} disabled={confirmDisabled} accessibilityRole="button">
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
          {children}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  sheet: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  action: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cancel: { fontSize: 15, color: colors.textSecondary },
  done: { fontSize: 15, fontWeight: '700', color: colors.primary },
  disabled: { opacity: 0.4 },
});
