import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export interface IconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  strokeWidth?: number;
}

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 20, color = '#1E293B', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="arrow-left" size={size * 0.9} color={color} />
    </View>
  );
};

export const CheckIcon: React.FC<IconProps> = ({ size = 18, color = '#10B981', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="check" size={size * 0.95} color={color} />
    </View>
  );
};

export const EyeIcon: React.FC<IconProps> = ({ size = 20, color = '#94A3B8', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="eye" size={size * 0.9} color={color} />
    </View>
  );
};

export const EyeOffIcon: React.FC<IconProps> = ({ size = 20, color = '#94A3B8', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="eye-slash" size={size * 0.9} color={color} />
    </View>
  );
};

export const LockIcon: React.FC<IconProps> = ({ size = 18, color = '#C5162E', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="lock" size={size * 0.9} color={color} />
    </View>
  );
};

export const ShieldIcon: React.FC<IconProps> = ({ size = 22, color = '#C5162E', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="shield-alt" size={size * 0.95} color={color} />
    </View>
  );
};

export const MailIcon: React.FC<IconProps> = ({ size = 20, color = '#C5162E', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="envelope" size={size * 0.9} color={color} />
    </View>
  );
};

export const CalendarIcon: React.FC<IconProps> = ({ size = 20, color = '#64748B', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="calendar-alt" size={size * 0.95} color={color} />
    </View>
  );
};

export const UploadIcon: React.FC<IconProps> = ({ size = 24, color = '#C5162E', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="cloud-upload-alt" size={size} color={color} />
    </View>
  );
};

export const FingerprintIcon: React.FC<IconProps> = ({ size = 20, color = '#C5162E', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="fingerprint" size={size * 0.95} color={color} />
    </View>
  );
};

export const WaterDropIcon: React.FC<IconProps> = ({ size = 20, color = '#2563EB', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="tint" size={size * 0.95} color={color} />
    </View>
  );
};

export const AlertBellIcon: React.FC<IconProps> = ({ size = 20, color = '#EF4444', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="bell" size={size * 0.95} color={color} />
    </View>
  );
};

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 16, color = '#64748B', style }) => {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <FontAwesome5 name="chevron-down" size={size * 0.8} color={color} />
    </View>
  );
};
