import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, TextInput, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { formatPrice } from '../lib/utils';
import { parseVoiceText } from '../lib/parser';
import { styles } from '../styles';

export default function VoiceRecordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { addClient, addProperty } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [parsedEntity, setParsedEntity] = useState<any>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    if (isRecording) timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Нет доступа', 'Разрешите микрофон в настройках телефона');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setSeconds(0);
      setIsRecording(true);
      setShowResult(false);
      setParsedEntity(null);
    } catch (e: any) {
      console.log(e);
      Alert.alert('Запись', e?.message || 'Не удалось начать запись. Можно ввести текст вручную.');
      setIsRecording(true);
      setSeconds(0);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      const rec = recordingRef.current;
      if (rec) {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        setRecordingUri(uri || null);
        recordingRef.current = null;
      }
    } catch (e) {
      console.log('stop rec', e);
    }
    // Vosk позже подключится к recordingUri. Сейчас — разбор текста из поля.
  };

  const toggleRecording = async () => {
    if (isRecording) await stopRecording();
    else await startRecording();
  };

  const runParse = () => {
    const text = transcribedText.trim();
    if (!text) {
      Alert.alert(
        'Нет текста',
        'Пока Vosk не подключён: надиктуйте мысль и введите/вставьте текст в поле (например: «Клиент Иванов, телефон 999 123 45 67, бюджет 7 млн» или «Двушка на Ленина 15, 54 метра, 6.5 млн»).'
      );
      return;
    }
    const result = parseVoiceText(text);
    setParsedEntity(result);
    setShowResult(true);
  };

  const handleSaveEntity = () => {
    if (!parsedEntity) return;
    if (parsedEntity.type === 'client') addClient(parsedEntity.data);
    else addProperty(parsedEntity.data);
    Alert.alert('Сохранено', parsedEntity.type === 'client' ? 'Клиент создан' : 'Объект создан');
    setShowResult(false);
    setTranscribedText('');
    setParsedEntity(null);
    setSeconds(0);
    setRecordingUri(null);
    navigation.goBack?.();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.detailTitleSm, { color: colors.textPrimary, flex: 1 }]}>Голосовая заметка</Text>
      </View>

      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        {!showResult ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={[styles.recordTime, { color: colors.textPrimary }]}>{formatTimer(seconds)}</Text>
              <Text style={[styles.recordHint, { color: colors.textSecondary }]}>
                {isRecording ? 'Идёт запись… нажмите ещё раз чтобы остановить' : 'Нажмите микрофон, затем введите текст заметки'}
              </Text>
              {recordingUri ? (
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 6 }}>Аудио сохранено (для Vosk)</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.bigMicBtn,
                {
                  backgroundColor: isRecording ? colors.error : colors.accent,
                  alignSelf: 'center',
                  marginBottom: 28,
                  shadowColor: isRecording ? colors.error : colors.accent,
                },
              ]}
              onPress={toggleRecording}
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={48} color="white" />
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>
              Текст для разбора (клиент или объект)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  minHeight: 110,
                  marginBottom: 16,
                },
              ]}
              value={transcribedText}
              onChangeText={setTranscribedText}
              placeholder="Клиент Петров, телефон 89991234567, бюджет 8 млн, Академический&#10;или: Двушка ул Ленина, 54 м2, 5 этаж, 6.5 млн"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={{
                backgroundColor: colors.accent,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              onPress={runParse}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Распознать и создать</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} style={{ marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
              {parsedEntity.type === 'client' ? 'Клиент' : 'Объект'}
            </Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, width: '100%', marginBottom: 20 }]}>
              {parsedEntity.type === 'client' ? (
                <>
                  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                    {parsedEntity.data.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>📞 {parsedEntity.data.phone || '—'}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    💰 До {formatPrice(parsedEntity.data.budgetMax)}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>📍 {parsedEntity.data.district}</Text>
                </>
              ) : (
                <>
                  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                    {parsedEntity.data.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    🏠 {parsedEntity.data.rooms}
                    {parsedEntity.data.areaTotal ? `, ${parsedEntity.data.areaTotal} м²` : ''}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>💰 {formatPrice(parsedEntity.data.price)}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {parsedEntity.data.street || parsedEntity.data.district}
                  </Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1, backgroundColor: colors.surfaceMuted }]}
                onPress={() => setShowResult(false)}
              >
                <Text style={{ color: colors.textPrimary }}>Изменить текст</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1, backgroundColor: colors.success }]}
                onPress={handleSaveEntity}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
