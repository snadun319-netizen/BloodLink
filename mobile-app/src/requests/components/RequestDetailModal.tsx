// src/requests/components/RequestDetailModal.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AlertRequestItem } from '../types/requests';

interface RequestDetailModalProps {
  visible: boolean;
  request: AlertRequestItem | null;
  onClose: () => void;
  onRespond: (request: AlertRequestItem) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  visible,
  request,
  onClose,
  onRespond,
}) => {
  if (!request) return null;

  const isUrgent = request.isUrgent || request.type === 'urgent';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Top Bar with Badge & Close */}
          <View style={styles.topRow}>
            <View style={[styles.badge, isUrgent ? styles.urgentBadge : styles.standardBadge]}>
              <Ionicons
                name={isUrgent ? 'alarm-outline' : 'navigate-outline'}
                size={13}
                color={isUrgent ? '#BA1328' : '#475569'}
                style={styles.badgeIcon}
              />
              <Text style={[styles.badgeText, isUrgent ? styles.urgentBadgeText : styles.standardBadgeText]}>
                {isUrgent ? `Urgent · ${request.distance}` : request.distance}
              </Text>
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

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.hospitalTitle}>{request.hospitalName}</Text>
            <Text style={styles.timePosted}>Posted {request.timeAgo}</Text>

            {/* Requirement Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>BLOOD GROUP</Text>
                <View style={styles.bloodRow}>
                  <Ionicons name="water" size={16} color="#BA1328" />
                  <Text style={styles.bloodValue}>{request.bloodGroup}</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>UNITS NEEDED</Text>
                <Text style={styles.unitsValue}>
                  {request.unitsNeeded} {request.unitsNeeded === 1 ? 'Unit' : 'Units'}
                </Text>
              </View>
            </View>

            {/* Case Details */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Clinical Case Information</Text>
              <Text style={styles.infoSectionBody}>
                {request.patientCase || 'Immediate voluntary blood donation requested by hospital triage.'}
              </Text>
            </View>

            {/* Location & Contact Info */}
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#64748B" style={styles.infoIcon} />
              <Text style={styles.infoText}>{request.address || 'Central District Hospital, Sri Lanka'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#64748B" style={styles.infoIcon} />
              <Text style={styles.infoText}>{request.contactNumber || '+94 45 222 2261'}</Text>
            </View>

            {/* Eligibility Note */}
            <View style={styles.eligibilityCard}>
              <Feather name="check-circle" size={16} color="#059669" />
              <Text style={styles.eligibilityText}>
                Your profile matches this request. You are eligible to donate.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.respondButton}
              onPress={() => onRespond(request)}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.respondButtonText}>Confirm &amp; Go En Route</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={styles.arrowIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Dismiss for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  urgentBadge: {
    backgroundColor: '#FEECEF',
  },
  standardBadge: {
    backgroundColor: '#F1F5F9',
  },
  badgeIcon: {
    marginRight: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  urgentBadgeText: {
    color: '#BA1328',
  },
  standardBadgeText: {
    color: '#475569',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  timePosted: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bloodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bloodValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitsValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoSection: {
    marginBottom: 14,
  },
  infoSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoSectionBody: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '400',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoIcon: {
    flexShrink: 0,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  eligibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 6,
    marginBottom: 18,
  },
  eligibilityText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  actionsContainer: {
    gap: 8,
    paddingTop: 8,
  },
  respondButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#BA1328',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BA1328',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  respondButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  arrowIcon: {
    marginLeft: 6,
  },
  cancelButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
