// src/requests/components/DonationRecommendationCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const DonationRecommendationCard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Ionicons name="heart-outline" size={22} color="#64748B" style={styles.icon} />
      <Text style={styles.text}>
        Donations are recommended every 3–4 months. Only respond if you are feeling healthy and well.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 20,
    gap: 12,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#475569',
    fontWeight: '500',
  },
});
