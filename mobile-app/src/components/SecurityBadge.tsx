import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LockIcon } from './Icons';

export const SecurityBadge: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <LockIcon size={14} color="#64748B" />
      </View>
      <Text style={styles.text}>
        Bank-grade encryption ensures your donor records and credentials remain protected.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 10,
  },
  iconWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});
