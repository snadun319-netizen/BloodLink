// src/requests/components/ActiveMissionCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ActiveMission } from '../types/requests';

interface ActiveMissionCardProps {
  mission: ActiveMission;
  onDirectionsPress: () => void;
  onCoordinatorPress: () => void;
}

export const ActiveMissionCard: React.FC<ActiveMissionCardProps> = ({
  mission,
  onDirectionsPress,
  onCoordinatorPress,
}) => {
  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <Text style={styles.sectionSubtitle}>ACTIVE DISPATCH MISSION</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusBadgeText}>{mission.status}</Text>
        </View>
      </View>

      {/* Hospital Title & Unit */}
      <Text style={styles.hospitalTitle}>{mission.hospitalName}</Text>
      <Text style={styles.departmentText}>{mission.unitDepartment}</Text>

      {/* Dual Info Boxes */}
      <View style={styles.infoBoxesRow}>
        {/* Left Box: Required Blood */}
        <View style={styles.requiredBox}>
          <View style={styles.requiredIconContainer}>
            <Ionicons name="water" size={16} color="#BA1328" />
          </View>
          <View style={styles.requiredTextCol}>
            <Text style={styles.requiredLabel}>REQUIRED</Text>
            <Text style={styles.requiredValue} numberOfLines={1}>
              {mission.bloodGroup} · {mission.unitsNeeded} {mission.unitsNeeded === 1 ? 'Unit' : 'Units'}
            </Text>
          </View>
        </View>

        {/* Right Box: Arrival Time */}
        <View style={styles.arrivalBox}>
          <Text style={styles.arrivalLabel}>ARRIVAL</Text>
          <Text style={styles.arrivalValue}>{mission.estimatedArrival}</Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.directionsButton}
          activeOpacity={0.85}
          onPress={onDirectionsPress}
          accessibilityRole="button"
          accessibilityLabel="Get directions to hospital"
        >
          <Feather name="navigation" size={15} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.directionsButtonText}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.coordinatorButton}
          activeOpacity={0.8}
          onPress={onCoordinatorPress}
          accessibilityRole="button"
          accessibilityLabel="Call hospital coordinator"
        >
          <Ionicons name="call-outline" size={16} color="#1E293B" style={styles.btnIcon} />
          <Text style={styles.coordinatorButtonText}>Coordinator</Text>
        </TouchableOpacity>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  statusBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  hospitalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  departmentText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 14,
  },
  infoBoxesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  requiredBox: {
    flex: 1.45,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  requiredIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredTextCol: {
    flex: 1,
  },
  requiredLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#BA1328',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  requiredValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  arrivalBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  arrivalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directionsButton: {
    flex: 1,
    height: 46,
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
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  coordinatorButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatorButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 6,
  },
});
