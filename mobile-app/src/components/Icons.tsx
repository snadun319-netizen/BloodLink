import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 20, color = '#1E293B' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderLeftWidth: 2.4,
          borderBottomWidth: 2.4,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginLeft: size * 0.15,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.65,
          height: 2.4,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
};

export const CheckIcon: React.FC<IconProps & { strokeWidth?: number }> = ({
  size = 18,
  color = '#10B981',
  strokeWidth = 2.4,
}) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.6,
          height: size * 0.35,
          borderLeftWidth: strokeWidth,
          borderBottomWidth: strokeWidth,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
          marginBottom: size * 0.1,
        }}
      />
    </View>
  );
};

export const EyeIcon: React.FC<IconProps> = ({ size = 20, color = '#94A3B8' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.85,
          height: size * 0.55,
          borderRadius: size * 0.5,
          borderWidth: 1.8,
          borderColor: color,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
};

export const EyeOffIcon: React.FC<IconProps> = ({ size = 20, color = '#94A3B8' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <EyeIcon size={size} color={color} />
      <View
        style={{
          position: 'absolute',
          width: size * 0.9,
          height: 1.8,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
};

export const LockIcon: React.FC<IconProps> = ({ size = 18, color = '#C5162E' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Shackle */}
      <View
        style={{
          width: size * 0.5,
          height: size * 0.45,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          borderWidth: 1.8,
          borderBottomWidth: 0,
          borderColor: color,
          marginBottom: -1,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: size * 0.72,
          height: size * 0.5,
          borderRadius: 3.5,
          borderWidth: 1.8,
          borderColor: color,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <View
          style={{
            width: 2.2,
            height: 3.5,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </View>
    </View>
  );
};

export const ShieldIcon: React.FC<IconProps> = ({ size = 22, color = '#C5162E' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.8,
          borderWidth: 1.8,
          borderColor: color,
          borderTopLeftRadius: size * 0.1,
          borderTopRightRadius: size * 0.1,
          borderBottomLeftRadius: size * 0.35,
          borderBottomRightRadius: size * 0.35,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <LockIcon size={size * 0.4} color={color} />
      </View>
    </View>
  );
};

export const MailIcon: React.FC<IconProps> = ({ size = 20, color = '#C5162E' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.85,
          height: size * 0.6,
          borderRadius: 3,
          borderWidth: 1.8,
          borderColor: color,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: size * 0.6,
            height: size * 0.6,
            borderBottomWidth: 1.8,
            borderRightWidth: 1.8,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            alignSelf: 'center',
            marginTop: -size * 0.35,
          }}
        />
      </View>
    </View>
  );
};

export const CalendarIcon: React.FC<IconProps> = ({ size = 20, color = '#64748B' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.8,
          height: size * 0.75,
          borderRadius: 4,
          borderWidth: 1.8,
          borderColor: color,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: '100%', height: size * 0.22, backgroundColor: color }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            flex: 1,
            paddingHorizontal: 2,
          }}
        >
          <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
};

export const UploadIcon: React.FC<IconProps> = ({ size = 24, color = '#C5162E' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Arrow up */}
      <View
        style={{
          width: size * 0.36,
          height: size * 0.36,
          borderTopWidth: 2.2,
          borderLeftWidth: 2.2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginBottom: -size * 0.1,
        }}
      />
      <View
        style={{
          width: 2.2,
          height: size * 0.45,
          backgroundColor: color,
          borderRadius: 1,
          marginBottom: 3,
        }}
      />
      {/* Tray */}
      <View
        style={{
          width: size * 0.8,
          height: size * 0.22,
          borderBottomWidth: 2.2,
          borderLeftWidth: 2.2,
          borderRightWidth: 2.2,
          borderColor: color,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
    </View>
  );
};

export const FingerprintIcon: React.FC<IconProps> = ({ size = 20, color = '#C5162E' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.75,
          height: size * 0.85,
          borderRadius: size * 0.4,
          borderWidth: 1.6,
          borderColor: color,
          borderBottomColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.45,
            height: size * 0.55,
            borderRadius: size * 0.25,
            borderWidth: 1.5,
            borderColor: color,
            borderBottomColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ width: 1.8, height: size * 0.2, backgroundColor: color, borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
};

export const WaterDropIcon: React.FC<IconProps> = ({ size = 20, color = '#2563EB' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderTopLeftRadius: size * 0.6,
          borderBottomLeftRadius: size * 0.3,
          borderBottomRightRadius: size * 0.3,
          borderTopRightRadius: 0,
          borderWidth: 2,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
          marginTop: size * 0.1,
        }}
      />
    </View>
  );
};

export const AlertBellIcon: React.FC<IconProps> = ({ size = 20, color = '#EF4444' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.65,
          height: size * 0.6,
          borderTopLeftRadius: size * 0.35,
          borderTopRightRadius: size * 0.35,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.85,
            height: 2,
            backgroundColor: color,
            marginTop: size * 0.55,
          }}
        />
      </View>
      <View
        style={{
          width: 4,
          height: 3,
          backgroundColor: color,
          borderRadius: 2,
          marginTop: 2,
        }}
      />
    </View>
  );
};

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 16, color = '#64748B' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.45,
          height: size * 0.45,
          borderBottomWidth: 2,
          borderRightWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginTop: -size * 0.15,
        }}
      />
    </View>
  );
};
