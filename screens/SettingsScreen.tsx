import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  TextInput, FlatList, Image, KeyboardAvoidingView, Platform, Modal, Pressable,
  Switch, Alert, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { clearDB } from '../lib/storage';
import * as FileSystem from 'expo-file-system';
import { exportBackup, importBackupFromPicker } from '../lib/backup';
import { getLicenseStatus, activateLicense, startPurchaseStub, debugResetTrial, TRIAL_DAYS, type LicenseStatus } from '../lib/license';
import { generateId, formatPrice, formatPriceShort, formatTime, isSameDay, maskPhone, getDigitsOnly } from '../lib/utils';
import { FormField, FormInput, ReadOnlyField, ChipSelector, ToggleButton, makeCall } from '../components/ui';
import { styles } from '../styles';

export default function SettingsScreen() {
  const { isDark, toggleTheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { clients, properties, tasks, replaceAll } = useStore();
  const [lic, setLic] = useState<LicenseStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    getLicenseStatus().then(setLic);
  }, []);

  const refreshLic = async () => setLic(await getLicenseStatus());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { marginTop: 40 }]}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Настройки</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 50 + insets.bottom }}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
          <View style={styles.settingRow}>
            <Ionicons name="key-outline" size={24} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Лицензия</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {lic?.isLicensed
                  ? `Активирована${lic.licenseKeyMasked ? ' · ' + lic.licenseKeyMasked : ''}`
                  : lic?.isTrialActive
                    ? `Пробный период: осталось ${lic.trialDaysLeft} из ${TRIAL_DAYS} дн.`
                    : 'Пробный период истёк'}
              </Text>
            </View>
          </View>
          {!lic?.isLicensed && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                value={keyInput}
                onChangeText={setKeyInput}
                placeholder="VCRM-XXXX-XXXX-XXXX-XXXX"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                style={{
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.textPrimary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 10,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  onPress={async () => {
                    const r = await activateLicense(keyInput);
                    Alert.alert(r.ok ? 'Готово' : 'Ошибка', r.message);
                    if (r.ok) { setKeyInput(''); refreshLic(); }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Активировать</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.accentSoft, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  onPress={async () => {
                    const { message } = await startPurchaseStub();
                    Alert.alert('Оплата', message);
                  }}
                >
                  <Text style={{ color: colors.accent, fontWeight: '600' }}>Купить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Тёмная тема</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Переключить оформление</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.surfaceMuted, true: colors.accent }} thumbColor={isDark ? 'white' : '#f4f3f4'} />
          </View>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                'Сбросить данные',
                'Удалить всех клиентов, объекты и задачи? При следующем запуске снова появятся демо-данные.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Сбросить',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await clearDB();
                        // удалить сохранённые фото
                        const photosDir = FileSystem.documentDirectory + 'photos/';
                        try {
                          const info = await FileSystem.getInfoAsync(photosDir);
                          if (info.exists) await FileSystem.deleteAsync(photosDir, { idempotent: true });
                        } catch {}
                        replaceAll({ clients: [], properties: [], tasks: [] });
                        Alert.alert('Готово', 'Данные и фото очищены. При следующем запуске появятся демо-данные.');
                      } catch (e: any) {
                        Alert.alert('Ошибка', e?.message || 'Не удалось сбросить данные');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Сбросить данные</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Очистить базу на этом устройстве</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
          <View style={[styles.settingRow, { marginBottom: 8 }]}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Резервная копия</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                Клиенты: {clients.length} · Объекты: {properties.length} · Задачи: {tasks.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 }}
            onPress={async () => {
              try {
                await exportBackup({ clients, properties, tasks });
              } catch (e: any) {
                Alert.alert('Ошибка', e?.message || 'Не удалось выгрузить базу');
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Выгрузить базу в файл</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: colors.accentSoft, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
            onPress={() => {
              Alert.alert(
                'Восстановить базу',
                'Текущие данные будут заменены данными из файла. Продолжить?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Выбрать файл',
                    onPress: async () => {
                      try {
                        const data = await importBackupFromPicker();
                        replaceAll(data);
                        Alert.alert('Готово', `Загружено: клиентов ${data.clients.length}, объектов ${data.properties.length}, задач ${data.tasks.length}`);
                      } catch (e: any) {
                        if (e?.message === 'CANCELLED') return;
                        Alert.alert('Ошибка', e?.message || 'Не удалось загрузить файл');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Загрузить базу из файла</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Версия приложения</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>1.0.0 (фронтенд)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

