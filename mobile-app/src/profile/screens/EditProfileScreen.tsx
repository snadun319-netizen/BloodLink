import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorPalette, radius, useTheme } from '../theme';
import { DonorProfile, EditableProfileFields } from '../types/profile';
import { isValidSriLankanMobile } from '../utils/format';

const DISTRICTS = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
    'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
    'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
    'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

interface Props {
    profile: DonorProfile;
    onSave: (fields: EditableProfileFields) => Promise<void>;
    onClose: () => void;
}

export default function EditProfileScreen({ profile, onSave, onClose }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [fullName, setFullName] = useState(profile.fullName);
    const [phone, setPhone] = useState(profile.phone);
    const [district, setDistrict] = useState(profile.district || '');
    const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
    const [saving, setSaving] = useState(false);

    const validate = (): boolean => {
        const next: { fullName?: string; phone?: string } = {};
        if (fullName.trim().length < 3) next.fullName = 'Enter your full name (at least 3 characters).';
        if (!isValidSriLankanMobile(phone)) next.phone = 'Enter a valid mobile number, e.g. 077 123 4567.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await onSave({ fullName: fullName.trim(), phone: phone.trim(), district: district.trim() });
            onClose();
        } catch (e) {
            Alert.alert('Could not save changes', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.titleRow}>
                    <Pressable onPress={onClose} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </Pressable>
                    <Text style={styles.title}>Edit profile</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Text style={styles.label}>Full name</Text>
                    <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        style={[styles.input, errors.fullName && styles.inputError]}
                        placeholder="Your full name"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="words"
                    />
                    {errors.fullName && <Text style={styles.error}>{errors.fullName}</Text>}

                    <Text style={styles.label}>Mobile number</Text>
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        style={[styles.input, errors.phone && styles.inputError]}
                        placeholder="077 123 4567"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                    />
                    {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

                    <Text style={styles.label}>District (optional)</Text>
                    <Text style={styles.hint}>
                        Used only to match you with nearby blood requests. It is never shown to other users.
                    </Text>
                    <View style={styles.chips}>
                        {DISTRICTS.map((d) => {
                            const selected = d === district;
                            return (
                                <Pressable
                                    key={d}
                                    onPress={() => setDistrict(selected ? '' : d)}
                                    style={[styles.chip, selected && styles.chipSelected]}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                >
                                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d}</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Text style={styles.label}>Blood group</Text>
                    <View style={styles.readonly}>
                        <Text style={styles.readonlyValue}>{profile.bloodGroup}</Text>
                        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                    </View>
                    <Text style={styles.hint}>
                        Blood group can only be changed by uploading a new verification document.
                    </Text>

                    <Pressable
                        onPress={handleSave}
                        disabled={saving}
                        style={[styles.saveButton, saving && { opacity: 0.6 }]}
                        accessibilityRole="button"
                    >
                        {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveText}>Save changes</Text>}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (c: ColorPalette) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
        },
        backButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: { fontSize: 18, fontWeight: '700', color: c.text },
        content: { padding: 20, paddingBottom: 40 },
        label: { fontSize: 13, fontWeight: '600', color: c.text, marginTop: 16, marginBottom: 8 },
        hint: { fontSize: 12, lineHeight: 18, color: c.textMuted, marginBottom: 10 },
        input: {
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: c.text,
        },
        inputError: { borderColor: c.danger },
        error: { color: c.danger, fontSize: 12, marginTop: 6 },
        chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
        chip: {
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: radius.pill,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
        },
        chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
        chipText: { fontSize: 13, color: c.text },
        chipTextSelected: { color: c.onPrimary, fontWeight: '600' },
        readonly: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        readonlyValue: { fontSize: 15, fontWeight: '600', color: c.text },
        saveButton: {
            backgroundColor: c.primary,
            borderRadius: radius.md,
            paddingVertical: 15,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
        },
        saveText: { color: c.onPrimary, fontSize: 15, fontWeight: '600' },
    });
