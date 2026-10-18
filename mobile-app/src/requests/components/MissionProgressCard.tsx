// src/requests/components/MissionProgressCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MissionStep } from '../types/requests';

interface MissionProgressCardProps {
  steps?: MissionStep[];
}

export const MissionProgressCard: React.FC<MissionProgressCardProps> = ({ steps }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionSubtitle}>MISSION PROGRESS</Text>

      <View style={styles.timelineContainer}>
        {/* Step 1: Accepted Request */}
        <View style={styles.stepRow}>
          <View style={styles.iconColumn}>
            <View style={styles.completedIconContainer}>
              <Ionicons name="checkmark" size={14} color="#059669" />
            </View>
            <View style={styles.activeLine} />
          </View>

          <View style={styles.contentRow}>
            <Text style={styles.stepTitleCompleted}>Accepted Request</Text>
            <Text style={styles.stepTime}>14:10</Text>
          </View>
        </View>

        {/* Step 2: En Route to Hospital */}
        <View style={styles.stepRow}>
          <View style={styles.iconColumn}>
            <View style={styles.inProgressTargetCircle}>
              <View style={styles.inProgressInnerDot} />
            </View>
            <View style={styles.upcomingLine} />
          </View>

          <View style={styles.contentRow}>
            <Text style={styles.stepTitleInProgress}>En Route to Hospital</Text>
            <View style={styles.inProgressBadge}>
              <Text style={styles.inProgressBadgeText}>In Progress</Text>
            </View>
          </View>
        </View>

        {/* Step 3: Arrive & Donate */}
        <View style={styles.stepRowLast}>
          <View style={styles.iconColumn}>
            <View style={styles.upcomingIconContainer}>
              <Ionicons name="add" size={14} color="#94A3B8" />
            </View>
          </View>

          <View style={styles.contentRow}>
            <Text style={styles.stepTitleUpcoming}>Arrive &amp; Donate</Text>
            <Text style={styles.stepUpcomingText}>Upcoming</Text>
          </View>
        </View>
      </View>
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
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 4,
    paddingRight: 4,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepRowLast: {
    flexDirection: 'row',
  },
  iconColumn: {
    alignItems: 'center',
    width: 26,
    marginRight: 14,
  },
  completedIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLine: {
    width: 2,
    height: 28,
    backgroundColor: '#34D399',
    marginVertical: 2,
  },
  inProgressTargetCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#BA1328',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inProgressInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  upcomingLine: {
    width: 2,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  upcomingIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 1,
  },
  stepTitleCompleted: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  stepTitleInProgress: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#BA1328',
  },
  inProgressBadge: {
    backgroundColor: '#FEECEF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  inProgressBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BA1328',
  },
  stepTitleUpcoming: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#64748B',
  },
  stepUpcomingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
