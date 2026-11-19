import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Alert, Platform,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { styles } from '../styles';
import { parseVoiceText } from '../lib/parser';
import { generateId, formatPrice } from '../lib/utils';
import { ensureModelLoaded, startListening, stopListening, getVoskError } from '../lib/vosk';

export default function VoiceRecordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { addClient, addProperty, addTask, clients, properties } = useStore();

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedEntity, setParsedEntity] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [voskError, setVoskError] = useState<string | null>(getVoskError());

  // Linking note to existing card
  const [linkModal, setLinkModal] = useState<'client' | 'property' | null>(null);
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null);
  const [linkedPropertyId, setLinkedPropertyId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');

  const timerRef = useRef<any>(null);
  const finalParts = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopListening().catch(() => {});
    };
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setModelLoading(true);
    setVoskError(null);
    try {
      await ensureModelLoaded();
      finalParts.current = [];
      setTranscribedText('');
      await startListening(
        (partial) => setTranscribedText([...finalParts.current, partial].filter(Boolean).join(' ').trim()),
        (finalText) => {
          if (finalText) {
            finalParts.current.push(finalText);
            setTranscribedText(finalParts.current.join(' ').trim());
          }
        },
        (message) => {
          setVoskError(message);
          Alert.alert('Распознавание', message);
        }
      );
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((p) => p + 1), 1000);
    } catch (e: any) {
      const message = e?.message || getVoskError() || 'Не удалось начать запись';
      setVoskError(message);
      Alert.alert('Голос недоступен', message);
    } finally {
      setModelLoading(false);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    try { await stopListening(); } catch {}
  };

  const toggleRecording = async () => {
    if (isRecording) await stopRecording();
    else await startRecording();
  };

  const saveAsNote = () => {
    const text = transcribedText.trim();
    if (!text) {
      Alert.alert('Пусто', 'Надиктуйте или введите текст заметки');
      return;
    }
    const linkedClient = linkedClientId ? clients.find((c: any) => c.id === linkedClientId) : null;
    const linkedProp = linkedPropertyId ? properties.find((p: any) => p.id === linkedPropertyId) : null;

    addTask({
      id: generateId(),
      title: text.slice(0, 120),
      note: text,
      type: 'note',
      date: new Date().toISOString(),
      done: false,
      clientId: linkedClientId || null,
      propertyId: linkedPropertyId || null,
      clientName: linkedClient?.name || null,
      propertyTitle: linkedProp?.title || linkedProp?.street || null,
    });

    const linkInfo = linkedClient ? ` к клиенту «${linkedClient.name}»` : linkedProp ? ` к объекту` : '';
    Alert.alert('Заметка сохранена', `Записано как есть${linkInfo}`);
    setTranscribedText('');
    finalParts.current = [];
    setSeconds(0);
    setLinkedClientId(null);
    setLinkedPropertyId(null);
    navigation.goBack?.();
  };

  const tryParseCard = () => {
    const text = transcribedText.trim();
    if (!text) {
      Alert.alert('Нет текста', 'Сначала надиктуйте');
      return;
    }
    const lower = text.toLowerCase();
    const wantsClient = /нов(ый|ого|ая)?\s+клиент|клиент\s+|создай\s+клиент/i.test(lower);
    const wantsProperty = /нов(ый|ого|ое)?\s+объект|объект\s+|создай\s+объект|новая\s+квартира|новый\s+дом/i.test(lower);

    const result = parseVoiceText(text);

    if (result.type === 'client') {
      const hasName = !!result.data.name && result.data.name !== 'Клиент из голоса';
      const hasPhone = !!result.data.phone && result.data.phone.replace(/\D/g, '').length >= 10;
      if ((hasName && hasPhone) || wantsClient) {
        setParsedEntity(result);
        setShowResult(true);
        return;
      }
    }

    if (result.type === 'property') {
      const hasAddress = !!(result.data.street || result.data.district);
      const hasPrice = !!result.data.price;
      if (wantsProperty || (hasAddress && hasPrice)) {
        setParsedEntity(result);
        setShowResult(true);
        return;
      }
    }

    Alert.alert(
      'Это заметка',
      'Для создания карточки скажите «новый клиент» + имя и телефон, или «новый объект» + адрес. Иначе сохраните как заметку.'
    );
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
      navigation.goBack?.();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось сохранить');
    }
  };

  const linkedClient = linkedClientId ? clients.find((c: any) => c.id === linkedClientId) : null;
  const linkedProp = linkedPropertyId ? properties.find((p: any) => p.id === linkedPropertyId) : null;

  const filteredClients = clients.filter((c: any) =>
    String(c.name || '').toLowerCase().includes(linkSearch.toLowerCase()) ||
    String(c.phone || '').includes(linkSearch)
  );
  const filteredProps = properties.filter((p: any) =>
    String(p.title || p.street || '').toLowerCase().includes(linkSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.detailHeader, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'ios' ? 8 : 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.detailTitleSm, { color: colors.textPrimary, flex: 1 }]}>Голосовая заметка</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: 50 + insets.bottom }} keyboardShouldPersistTaps="handled">
          {!showResult ? (
            <>
              <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
                <Text style={[styles.recordTime, { color: colors.textPrimary }]}>{formatTimer(seconds)}</Text>
                <Text style={[styles.recordHint, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                  {modelLoading ? 'Загрузка модели…' : isRecording ? 'Говорите… Нажмите ещё раз чтобы остановить' : 'Нажмите микрофон и диктуйте свободно'}
                </Text>
                {voskError ? <Text style={{ color: colors.error, fontSize: 12, marginTop: 6 }}>{voskError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.bigMicBtn, { backgroundColor: isRecording ? colors.error : colors.accent, alignSelf: 'center', marginVertical: 16 }]}
                onPress={toggleRecording}
                disabled={modelLoading}
              >
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={36} color="white" />
              </TouchableOpacity>

              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border, minHeight: 120, marginTop: 12 }]}
                value={transcribedText}
                onChangeText={setTranscribedText}
                placeholder="Текст появится здесь. Можно править вручную…"
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: colors.accent }]}
                  onPress={saveAsNote}
                >
                  <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>СОЗДАТЬ ЗАМЕТКУ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: colors.surfaceMuted }]}
                  onPress={tryParseCard}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', textAlign: 'center' }}>КАК КАРТОЧКУ</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                Заметка сохраняется как есть. Можно привязать к клиенту или объекту.
              </Text>
            </>
          ) : (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
                {parsedEntity?.type === 'client' ? 'Новый клиент' : 'Новый объект'}
              </Text>
              {parsedEntity?.type === 'client' ? (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{parsedEntity.data.name}</Text>
                  <Text style={{ color: colors.textSecondary }}>📞 {parsedEntity.data.phone || '—'}</Text>
                  <Text style={{ color: colors.textSecondary }}>💰 {formatPrice(parsedEntity.data.budgetMax)}</Text>
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{parsedEntity?.data?.title}</Text>
                  <Text style={{ color: colors.textSecondary }}>💰 {formatPrice(parsedEntity?.data?.price)}</Text>
                  <Text style={{ color: colors.textSecondary }}>{parsedEntity?.data?.street || parsedEntity?.data?.district}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.surfaceMuted }]} onPress={() => setShowResult(false)}>
                  <Text style={{ color: colors.textPrimary, textAlign: 'center' }}>Назад</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.accent }]} onPress={handleSaveEntity}>
                  <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>Сохранить карточку</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Link picker modal */}
      <Modal visible={!!linkModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 50 + insets.bottom }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '600' }}>
                {linkModal === 'client' ? 'Привязать к клиенту' : 'Привязать к объекту'}
              </Text>
              <TouchableOpacity onPress={() => setLinkModal(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { margin: 12, backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Поиск…"
              placeholderTextColor={colors.textTertiary}
              value={linkSearch}
              onChangeText={setLinkSearch}
            />
            <FlatList
              data={linkModal === 'client' ? filteredClients : filteredProps}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.separator }}
                  onPress={() => {
                    if (linkModal === 'client') {
                      setLinkedClientId(item.id);
                      setLinkedPropertyId(null);
                    } else {
                      setLinkedPropertyId(item.id);
                      setLinkedClientId(null);
                    }
                    setLinkModal(null);
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {linkModal === 'client' ? item.name : (item.title || item.street || 'Объект')}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    {linkModal === 'client' ? item.phone : formatPrice(item.price)}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>Ничего не найдено</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
