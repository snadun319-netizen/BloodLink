// src/requests/components/AlertRequestCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AlertRequestItem } from '../types/requests';

interface AlertRequestCardProps {
  item: AlertRequestItem;
  onPress: (item: AlertRequestItem) => void;
}

export const AlertRequestCard: React.FC<AlertRequestCardProps> = ({ item, onPress }) => {
  const isUrgent = item.isUrgent || item.type === 'urgent';
  const isScheduled = item.type === 'scheduled';

  return (
    <View style={styles.card}>
      {/* Top Tag & Time Ago Row */}
      <View style={styles.topRow}>
        <View style={[styles.tagPill, isUrgent ? styles.urgentTagPill : styles.standardTagPill]}>
          {isUrgent ? (
            <Ionicons name="alarm-outline" size={13} color="#C5162E" style={styles.tagIcon} />
          ) : (
            <Feather name="navigation" size={12} color="#64748B" style={styles.tagIcon} />
          )}
          <Text style={[styles.tagText, isUrgent ? styles.urgentTagText : styles.standardTagText]}>
            {isUrgent ? `Urgent · ${item.distance}` : item.distance}
          </Text>
        </View>

        <Text style={styles.timeAgoText}>{item.timeAgo}</Text>
      </View>

      {/* Hospital Name */}
      <Text style={styles.hospitalName} numberOfLines={1}>
        {item.hospitalName}
      </Text>

      {/* Requirement Details Row */}
      <View style={styles.requirementRow}>
        {isScheduled ? (
          <Ionicons name="calendar-outline" size={15} color="#C5162E" style={styles.reqIcon} />
        ) : (
          <Ionicons name="water-outline" size={15} color="#C5162E" style={styles.reqIcon} />
        )}
        <Text style={styles.requirementText}>
          {item.requirementLabel || `${item.bloodGroup} · ${item.unitsNeeded} ${item.unitsNeeded === 1 ? 'Unit' : 'Units'} needed`}
        </Text>
      </View>

      {/* Action Button */}
      {isUrgent ? (
        <TouchableOpacity
          style={styles.urgentActionButton}
          activeOpacity={0.85}
          onPress={() => onPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`View details and respond to ${item.hospitalName}`}
        >
          <Text style={styles.urgentActionText}>View Details & Respond</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={styles.actionArrow} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.standardActionButton}
          activeOpacity={0.8}
          onPress={() => onPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${item.hospitalName}`}
        >
          <Text style={styles.standardActionText}>View Details</Text>
          <Ionicons name="chevron-forward" size={15} color="#475569" style={styles.actionChevron} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EBF0F5',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  urgentTagPill: {
    backgroundColor: '#FEECEF',
  },
  standardTagPill: {
    backgroundColor: '#F1F5F9',
  },
  tagIcon: {
    marginRight: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  urgentTagText: {
    color: '#BA1328',
  },
  standardTagText: {
    color: '#475569',
  },
  timeAgoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  hospitalName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reqIcon: {
    marginRight: 6,
  },
  requirementText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#334155',
  },
  urgentActionButton: {
    backgroundColor: '#BA1328', // Crimson red
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BA1328',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  urgentActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionArrow: {
    marginLeft: 6,
  },
  standardActionButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardActionText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionChevron: {
    marginLeft: 4,
  },
});
