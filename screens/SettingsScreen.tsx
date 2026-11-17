import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  TextInput, FlatList, Image, KeyboardAvoidingView, Platform, Modal, Pressable,
  Switch, Alert, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { clearDB } from '../lib/storage';
import { generateId, formatPrice, formatPriceShort, formatTime, isSameDay, maskPhone, getDigitsOnly } from '../lib/utils';
import { FormField, FormInput, ReadOnlyField, ChipSelector, ToggleButton, makeCall } from '../components/ui';
import { styles } from '../styles';

export default function SettingsScreen() {
  const { isDark, toggleTheme, colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { marginTop: 30 }]}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Настройки</Text>
      </View>
      <ScrollView style={[styles.scroll, { paddingTop: 30, paddingBottom: 40 }]}>
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
                      await clearDB();
                      Alert.alert('Готово', 'Перезапустите приложение');
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

