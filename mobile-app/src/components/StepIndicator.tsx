import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps = 4 }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Step {currentStep} of {totalSteps}
      </Text>
      <View style={styles.barContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index + 1 <= currentStep;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                isCompleted ? styles.activeSegment : styles.inactiveSegment,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  barContainer: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  activeSegment: {
    backgroundColor: colors.primary,
  },
  inactiveSegment: {
    backgroundColor: '#E2E8F0',
  },
});
