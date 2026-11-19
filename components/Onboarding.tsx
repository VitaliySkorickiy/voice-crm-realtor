import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../lib/theme';

const ONBOARDING_KEY = '@voice_crm_onboarding_done';

const slides = [
  {
    icon: 'mic-outline' as const,
    title: 'Голосовые заметки',
    text: 'Диктуйте клиентов и объекты на ходу. Работает полностью офлайн — в подвале, лифте и метро.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Данные только у вас',
    text: 'Никаких серверов. Всё хранится на телефоне. Бэкап — обычный JSON-файл, который вы сохраняете сами через «Поделиться».',
  },
  {
    icon: 'people-outline' as const,
    title: 'Клиенты и объекты',
    text: 'Карточки, воронка, напоминания и подбор объектов под требования клиента.',
  },
];

export async function isOnboardingDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ONBOARDING_KEY);
  return v === '1';
}

export async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1');
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const next = async () => {
    if (isLast) {
      await markOnboardingDone();
      onDone();
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={slide.icon} size={56} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{slide.title}</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>{slide.text}</Text>
      </View>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === index ? colors.accent : colors.border }]}
          />
        ))}
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={next}>
        <Text style={styles.btnText}>{isLast ? 'Начать работу' : 'Далее'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28, paddingBottom: 40, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 17, fontWeight: '700' },
});
