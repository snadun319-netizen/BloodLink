// src/requests/components/RequestsTabs.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RequestTabType } from '../types/requests';

interface RequestsTabsProps {
  activeTab: RequestTabType;
  onTabChange: (tab: RequestTabType) => void;
  alertsCount?: number;
  activeCount?: number;
}

export const RequestsTabs: React.FC<RequestsTabsProps> = ({
  activeTab,
  onTabChange,
  alertsCount = 3,
  activeCount = 1,
}) => {
  const isAlertsActive = activeTab === 'alerts';
  const isActiveMissionActive = activeTab === 'active';

  return (
    <View style={styles.outerContainer}>
      <View style={styles.pillContainer}>
        {/* New Alerts Tab */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            isAlertsActive ? styles.activeTabButton : styles.inactiveTabButton,
          ]}
          onPress={() => onTabChange('alerts')}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: isAlertsActive }}
          accessibilityLabel={`New Alerts, ${alertsCount} available`}
        >
          <Text
            style={[
              styles.tabText,
              isAlertsActive ? styles.activeTabText : styles.inactiveTabText,
            ]}
          >
            New Alerts
          </Text>
          <View
            style={[
              styles.countBadge,
              isAlertsActive ? styles.activeCountBadge : styles.inactiveCountBadge,
            ]}
          >
            <Text
              style={[
                styles.countText,
                isAlertsActive ? styles.activeCountText : styles.inactiveCountText,
              ]}
            >
              {alertsCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Active Tab */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            isActiveMissionActive ? styles.activeTabButton : styles.inactiveTabButton,
          ]}
          onPress={() => onTabChange('active')}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActiveMissionActive }}
          accessibilityLabel={`Active requests, ${activeCount} active`}
        >
          <Text
            style={[
              styles.tabText,
              isActiveMissionActive ? styles.activeTabText : styles.inactiveTabText,
            ]}
          >
            Active
          </Text>
          <View
            style={[
              styles.countBadge,
              isActiveMissionActive ? styles.activeCountBadge : styles.inactiveCountBadge,
            ]}
          >
            <Text
              style={[
                styles.countText,
                isActiveMissionActive ? styles.activeCountText : styles.inactiveCountText,
              ]}
            >
              {activeCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 24,
    padding: 4,
    width: '100%',
    maxWidth: 340,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#BA1328', // Deep crimson red matching screenshot
    shadowColor: '#BA1328',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  inactiveTabButton: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  inactiveTabText: {
    color: '#475569',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  inactiveCountBadge: {
    backgroundColor: '#CBD5E1',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeCountText: {
    color: '#FFFFFF',
  },
  inactiveCountText: {
    color: '#334155',
  },
});
