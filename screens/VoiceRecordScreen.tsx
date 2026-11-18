import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, TextInput, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { formatPrice } from '../lib/utils';
import { parseVoiceText } from '../lib/parser';
import { startListening, stopListening, ensureModelLoaded, isVoskReady, getVoskError } from '../lib/vosk';
import { styles } from '../styles';

export default function VoiceRecordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { addClient, addProperty } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [parsedEntity, setParsedEntity] = useState<any>(null);
  const timerRef = useRef<any>(null);
  const finalParts = useRef<string[]>([]);

  useEffect(() => {
    if (isRecording) timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      stopListening().catch(() => {});
    };
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const loadModel = async () => {
    if (modelReady || modelLoading) return;
    setModelLoading(true);
    try {
      await ensureModelLoaded();
      setModelReady(true);
    } catch (e: any) {
      Alert.alert(
        'Vosk недоступен',
        (e?.message || 'Ошибка загрузки модели') +
          '\n\nНужен development build (не Expo Go) и модель в assets/model-ru-ru.\nСкачайте vosk-model-small-ru-0.22 и положите содержимое в assets/model-ru-ru.'
      );
    } finally {
      setModelLoading(false);
    }
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Только на телефоне', 'Офлайн-распознавание работает в собранном приложении на устройстве.');
      return;
    }
    if (!modelReady) {
      await loadModel();
      if (!isVoskReady()) return;
    }
    try {
      finalParts.current = [];
      setTranscribedText('');
      setSeconds(0);
      setIsRecording(true);
      setShowResult(false);
      setParsedEntity(null);

      await startListening(
        (partial) => {
          // partial is live; show it
          const base = finalParts.current.join(' ').trim();
          setTranscribedText((base ? base + ' ' : '') + partial);
        },
        (finalText) => {
          if (finalText && finalText.trim()) {
            finalParts.current.push(finalText.trim());
            setTranscribedText(finalParts.current.join(' '));
          }
        }
      );
    } catch (e: any) {
      setIsRecording(false);
      Alert.alert('Не удалось начать', e?.message || 'Ошибка Vosk. Можно ввести текст вручную.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      await stopListening();
    } catch (e) {
      console.log('stop', e);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) await stopRecording();
    else await startRecording();
  };

  const runParse = () => {
    const text = transcribedText.trim();
    if (!text) {
      Alert.alert('Нет текста', 'Надиктуйте или введите текст. Пример: «Клиент Иванов, телефон 9991234567, бюджет 7 млн»');
      return;
    }
    const result = parseVoiceText(text);
    if (result.type === 'client' && !result.data.phone) {
      Alert.alert('Не хватает данных', 'Для клиента нужен телефон. Добавьте номер.');
      return;
    }
    if (result.type === 'property' && !result.data.price) {
      Alert.alert('Не хватает данных', 'Для объекта нужна цена. Добавьте сумму.');
      return;
    }
    setParsedEntity(result);
    setShowResult(true);
  };

  const handleSaveEntity = () => {
    if (!parsedEntity) return;
    try {
      if (parsedEntity.type === 'client') addClient(parsedEntity.data);
      else addProperty(parsedEntity.data);
      Alert.alert('Сохранено', parsedEntity.type === 'client' ? 'Клиент создан' : 'Объект создан');
      setShowResult(false);
      setTranscribedText('');
      setParsedEntity(null);
      finalParts.current = [];
      setSeconds(0);
      navigation.goBack?.();
    } catch (e: any) {
      Alert.alert('Ошибка сохранения', e?.message || 'Не удалось сохранить карточку');
    }
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
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.recordTime, { color: colors.textPrimary }]}>{formatTimer(seconds)}</Text>
              <Text style={[styles.recordHint, { color: colors.textSecondary, textAlign: 'center' }]}>
                {modelLoading
                  ? 'Загрузка модели…'
                  : isRecording
                    ? 'Говорите. Нажмите ещё раз чтобы остановить'
                    : modelReady
                      ? 'Модель готова. Нажмите микрофон'
                      : 'Нажмите микрофон — загрузится офлайн-модель Vosk'}
              </Text>
              {getVoskError() ? (
                <Text style={{ color: colors.error, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                  {getVoskError()}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.bigMicBtn,
                {
                  backgroundColor: isRecording ? colors.error : colors.accent,
                  alignSelf: 'center',
                  marginBottom: 20,
                  opacity: modelLoading ? 0.6 : 1,
                },
              ]}
              onPress={toggleRecording}
              disabled={modelLoading}
            >
              {modelLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={48} color="white" />
              )}
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>
              Распознанный текст (можно править)
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
              placeholder="Текст появится здесь после речи или введите вручную"
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
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Создать карточку</Text>
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
                <Text style={{ color: colors.textPrimary }}>Изменить</Text>
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
