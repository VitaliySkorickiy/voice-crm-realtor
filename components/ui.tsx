import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '../lib/theme';
import { maskPhone, digitsOnly, decimalOnly, getDigitsOnly } from '../lib/utils';
import { styles } from '../styles';

/** Открыть dialer с номером (tel:) */
export function makeCall(phone: string | null | undefined) {
  const digits = getDigitsOnly(String(phone || ''));
  if (!digits || digits.length < 10) {
    Alert.alert('Нет номера', 'Укажите корректный телефон');
    return;
  }
  const tel = digits.startsWith('8') && digits.length === 11
    ? '+7' + digits.slice(1)
    : digits.startsWith('7') && digits.length === 11
      ? '+' + digits
      : digits.startsWith('+')
        ? digits
        : '+' + digits;
  Linking.openURL(`tel:${tel}`).catch(() => {
    Alert.alert('Ошибка', 'Не удалось открыть приложение телефона');
  });
}

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

  const handleChange = (text: string) => {
    if (mask === 'phone') {
      onChangeText(maskPhone(text));
    } else if (mask === 'digits') {
      onChangeText(digitsOnly(text, maxLength || 12));
    } else if (mask === 'decimal') {
      onChangeText(decimalOnly(text, maxLength || 8));
    } else {
      onChangeText(text);
    }
  };

  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
      value={value}
      onChangeText={handleChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      multiline={multiline}
      maxLength={maxLength}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
}

export function ReadOnlyField({ value }: { value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.readOnlyField, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <Text style={[styles.readOnlyText, { color: colors.textPrimary }]}>{value || '—'}</Text>
    </View>
  );
}

export function ChipSelector({ options, value, onChange }: any) {
  const { colors } = useTheme();
  return (
    <View style={styles.chipsRow}>
      {options.map((opt: string) => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, value === opt ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.chipText, value === opt ? { color: 'white' } : { color: colors.textPrimary }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ToggleButton({ label, value, onPress }: any) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, { backgroundColor: value ? colors.accent : colors.surfaceMuted, borderColor: value ? colors.accent : colors.border }]}
      onPress={onPress}
    >
      <Text style={{ color: value ? 'white' : colors.textPrimary }}>{label}</Text>
    </TouchableOpacity>
  );
}
