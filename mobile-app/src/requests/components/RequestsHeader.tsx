// src/requests/components/RequestsHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RequestsHeaderProps {
  initials?: string;
  onAvatarPress?: () => void;
}

export const RequestsHeader: React.FC<RequestsHeaderProps> = ({
  initials = 'KP',
  onAvatarPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Requests</Text>
      <TouchableOpacity
        style={styles.avatarButton}
        activeOpacity={0.8}
        onPress={onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel={`User profile ${initials}`}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C5162E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C5162E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
