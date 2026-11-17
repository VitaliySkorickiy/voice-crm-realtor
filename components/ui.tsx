import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Linking } from 'react-native';
import { useTheme } from '../lib/theme';
import { maskPhone, getDigitsOnly } from '../lib/utils';
import { styles } from '../styles';

export function FormField({ label, children, counter, required }: any) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}{required && <Text style={{ color: colors.error }}> *</Text>}</Text>
        {counter && <Text style={[styles.counter, { color: colors.textTertiary }]}>{counter}</Text>}
      </View>
      {children}
    </View>
  );
}

export function FormInput({ value, onChangeText, placeholder, multiline, maxLength, keyboardType, mask }: any) {
  const { colors } = useTheme();
  const handleChange = (text: string) => mask === 'phone' ? onChangeText(maskPhone(text)) : onChangeText(text);
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
      value={value} onChangeText={handleChange} placeholder={placeholder} placeholderTextColor={colors.textTertiary}
      multiline={multiline} maxLength={maxLength} keyboardType={keyboardType} textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
}

export function ReadOnlyField({ value }: { value: string }) {
  const { colors } = useTheme();
  return <View style={[styles.readOnlyField, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}><Text style={[styles.readOnlyText, { color: colors.textPrimary }]}>{value || '—'}</Text></View>;
}

export function ChipSelector({ options, value, onChange }: any) {
  const { colors } = useTheme();
  return (
    <View style={styles.chipsRow}>
      {options.map((opt: string) => (
        <TouchableOpacity key={opt} style={[styles.chip, value === opt ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => onChange(opt)}>
          <Text style={[styles.chipText, value === opt ? { color: 'white' } : { color: colors.textPrimary }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ToggleButton({ label, value, onPress }: any) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.toggleBtn, value ? { backgroundColor: colors.accentSoft, borderColor: colors.accent } : { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={onPress}>
      <Text style={[styles.toggleText, value ? { color: colors.accent } : { color: colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export async function makeCall(phone: string) {
  const digits = getDigitsOnly(phone);
  if (!digits) {
    Alert.alert('Ошибка', 'Номер телефона не указан');
    return;
  }
  const url = `tel:${digits}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    Linking.openURL(url);
  } else {
    Alert.alert('Ошибка', 'Звонки не поддерживаются на этом устройстве');
  }
}

