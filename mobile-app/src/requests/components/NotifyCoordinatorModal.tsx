// src/requests/components/NotifyCoordinatorModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotifyCoordinatorModalProps {
  visible: boolean;
  coordinatorName?: string;
  coordinatorPhone?: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  onCall: () => void;
}

const PRESET_REASONS = [
  'Running 10–15 mins late due to traffic',
  'Feeling unwell / dizziness',
  'Urgent personal emergency',
  'Arrived outside triage desk',
];

export const NotifyCoordinatorModal: React.FC<NotifyCoordinatorModalProps> = ({
  visible,
  coordinatorName = 'Dr. Nirmal Weerasinghe',
  coordinatorPhone = '+94 77 123 4567',
  onClose,
  onSubmit,
  onCall,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState('');

  const handleSend = () => {
    const finalReason = customNote.trim() ? `${selectedReason} - Note: ${customNote.trim()}` : selectedReason;
    onSubmit(finalReason);
    setCustomNote('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Notify Coordinator</Text>
                <Text style={styles.subtitle}>{coordinatorName} ({coordinatorPhone})</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quick Reason Options */}
            <Text style={styles.sectionLabel}>Select Status / Reason:</Text>
            <View style={styles.reasonsList}>
              {PRESET_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
                    onPress={() => setSelectedReason(reason)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioInnerDot} />}
                    </View>
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Note input */}
            <TextInput
              style={styles.textInput}
              placeholder="Optional message to hospital team..."
              placeholderTextColor="#94A3B8"
              value={customNote}
              onChangeText={setCustomNote}
              maxLength={150}
            />

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.callButton}
                onPress={onCall}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="call" size={16} color="#BA1328" />
                <Text style={styles.callButtonText}>Call Direct</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={styles.sendButtonText}>Send Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 14,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonItemSelected: {
    borderColor: '#BA1328',
    backgroundColor: '#FFF1F2',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: '#BA1328',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BA1328',
  },
  reasonText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#BA1328',
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEECEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BA1328',
  },
  sendButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#BA1328',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BA1328',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
