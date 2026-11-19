import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { exportBackup, importBackupFromPicker } from '../lib/backup';
import { styles } from '../styles';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function SettingsScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { clearAllData } = useStore(); 
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    async function getUpdateInfo() {
      try {
        setUpdateInfo({
          isEmbedded: Updates.isEmbeddedLaunch,
          updateId: Updates.updateId,
          channel: Updates.channel,
          runtimeVersion: Updates.runtimeVersion,
        });
      } catch (e) {
        console.log('OTA debug error', e);
      }
    }
    getUpdateInfo();
  }, []);

  const handleBackup = async () => {
    try {
      // Примечание: замените пустые массивы на реальные данные из вашего store, если нужно
      const data = { clients: [], properties: [], tasks: [] }; 
      await exportBackup(data);
      Alert.alert('Успех', 'Резервная копия создана');
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось создать бэкап');
    }
  };

  const handleRestore = async () => {
    try {
      await importBackupFromPicker();
      Alert.alert('Успех', 'Данные восстановлены');
    } catch (e: any) {
      if (e.message !== 'CANCELLED') Alert.alert('Ошибка', 'Не удалось восстановить данные');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Очистить данные?',
      'Все клиенты, объекты и задачи будут удалены безвозвратно.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => clearAllData?.() },
      ]
    );
  };

  // НОВАЯ ФУНКЦИЯ: Принудительная проверка обновлений
  const handleForceUpdate = async () => {
    try {
      Alert.alert('Проверка', 'Проверяю наличие обновлений на сервере...');
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert('Найдено!', 'Загружаю обновление...');
        await Updates.fetchUpdateAsync();
        Alert.alert('Успех', 'Перезапускаю приложение с новой версией!');
        await Updates.reloadAsync();
      } else {
        Alert.alert('Информация', 'Новых обновлений нет. Вы используете последнюю версию.');
      }
    } catch (error: any) {
      Alert.alert('Ошибка', `Не удалось обновить: ${error.message || String(error)}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 50 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary, marginBottom: 20 }]}>Настройки</Text>

          {/* Тема */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
            <View style={[styles.settingRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={24} color={colors.accent} />
                <Text style={[styles.settingTitle, { color: colors.textPrimary, marginLeft: 12 }]}>
                  {isDark ? 'Тёмная тема' : 'Светлая тема'}
                </Text>
              </View>
              <Switch 
                value={isDark} 
                onValueChange={toggleTheme} 
                trackColor={{ false: colors.surfaceMuted, true: colors.accent }} 
                thumbColor="#fff" 
              />
            </View>
          </View>

          {/* Данные */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
            <TouchableOpacity style={[styles.settingRow, { marginBottom: 12 }]} onPress={handleBackup}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary, marginLeft: 12 }]}>Создать резервную копию</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingRow, { marginBottom: 12 }]} onPress={handleRestore}>
              <Ionicons name="cloud-download-outline" size={24} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary, marginLeft: 12 }]}>Восстановить из копии</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.settingTitle, { color: '#FF3B30', marginLeft: 12 }]}>Очистить все данные</Text>
            </TouchableOpacity>
          </View>

          {/* О приложении + Отладка + Кнопка обновления */}
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={[styles.settingRow, { marginBottom: 12 }]}>
              <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>О приложении</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Версия {APP_VERSION}</Text>
              </View>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 10 }}>
              Голосовая CRM для риелторов. Клиенты, объекты и задачи хранятся только на этом устройстве.
              Приложение не передаёт персональные данные ваших клиентов на сервер.
            </Text>

            {/* Блок отладки OTA */}
            <View style={{ marginTop: 16, padding: 12, backgroundColor: colors.surfaceMuted, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.accent, fontWeight: '600', marginBottom: 8 }}>🔧 Отладка обновлений:</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Канал APK: {updateInfo?.channel || 'не определен'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Runtime: {updateInfo?.runtimeVersion || 'не определен'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Встроенная сборка: {updateInfo?.isEmbedded ? 'Да (OTA не работает)' : 'Нет (готово к OTA)'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                Update ID: {updateInfo?.updateId ? updateInfo.updateId.slice(0, 8) + '...' : 'нет'}
              </Text>
            </View>

            {/* НОВАЯ КНОПКА: Принудительное обновление */}
            <TouchableOpacity 
              style={{ marginTop: 16, padding: 14, backgroundColor: colors.accent, borderRadius: 8, alignItems: 'center' }}
              onPress={handleForceUpdate}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>🔄 Принудительно проверить и обновить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}