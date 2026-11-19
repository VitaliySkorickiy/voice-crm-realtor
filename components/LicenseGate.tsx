import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getLicenseStatus,
  activateLicense,
  getHowToBuyInfo,
  SUPPORT_EMAIL,
  TRIAL_DAYS,
  type LicenseStatus,
} from '../lib/license';

type Props = {
  children: React.ReactNode;
};

/**
 * Пока canUse === false — показывает экран активации вместо приложения.
 */
export default function LicenseGate({ children }: Props) {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getLicenseStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onActivate = async () => {
    setBusy(true);
    try {
      const res = await activateLicense(keyInput);
      if (res.ok) {
        Alert.alert('Готово', res.message);
        setKeyInput('');
        await refresh();
      } else {
        Alert.alert('Ошибка', res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onHowToBuy = () => {
    const { title, message } = getHowToBuyInfo();
    Alert.alert(title, message, [
      { text: 'Написать', onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {}) },
      { text: 'OK' },
    ]);
  };

  if (!status || !status.ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  if (status.canUse) {
    return <>{children}</>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.lockWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={40} color="#0066FF" />
        </View>
        <Text style={styles.title}>Пробный период закончился</Text>
        <Text style={styles.sub}>
          {TRIAL_DAYS} дней бесплатного доступа истекли. Активируйте лицензию ключом после оплаты,
          чтобы продолжить работу с клиентами и объектами.
        </Text>

        <Text style={styles.label}>Ключ активации</Text>
        <TextInput
          style={styles.input}
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="VCRM-XXXX-XXXX-XXXX-XXXX"
          placeholderTextColor="#B4B4BC"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
          onPress={onActivate}
          disabled={busy}
        >
          <Text style={styles.btnPrimaryText}>Активировать</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, busy && styles.btnDisabled]}
          onPress={onHowToBuy}
          disabled={busy}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#0066FF" />
          <Text style={styles.btnSecondaryText}>Как купить</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Оплата — перевод самозанятому (СБП) вне приложения. Ключ придёт после оплаты. В приложении
          нет встроенной оплаты и данные CRM на сервер не уходят.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  lockWrap: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  btnPrimary: { backgroundColor: '#0066FF' },
  btnSecondary: {
    backgroundColor: '#E8F0FF',
    borderWidth: 1,
    borderColor: '#0066FF',
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSecondaryText: { color: '#0066FF', fontSize: 16, fontWeight: '600' },
  hint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#B4B4BC',
    textAlign: 'center',
  },
});
