// src/requests/components/FastPassTokenCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FastPassTokenCardProps {
  token?: string;
}

export const FastPassTokenCard: React.FC<FastPassTokenCardProps> = ({ token = '#BL - 8921' }) => {
  const handlePress = () => {
    Alert.alert(
      'Fast-Pass Token',
      `Your token ${token} is active. Hospital staff can scan your QR code for rapid expedited check-in at triage.`,
      [{ text: 'Close' }]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Fast-pass token ${token}`}
    >
      <View style={styles.qrContainer}>
        <Ionicons name="qr-code-outline" size={26} color="#334155" />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.tokenLabel}>DONOR FAST–PASS TOKEN</Text>
        <Text style={styles.tokenCode}>{token}</Text>
        <Text style={styles.tokenHint}>Show this at triage desk upon arrival</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EBF0F5',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  qrContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  tokenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tokenCode: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.4,
    marginVertical: 2,
  },
  tokenHint: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
});
