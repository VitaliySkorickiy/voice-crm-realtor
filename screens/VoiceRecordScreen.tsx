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
import { generateId, formatPrice, formatPriceShort, formatTime, isSameDay, maskPhone, getDigitsOnly } from '../lib/utils';
import { FormField, FormInput, ReadOnlyField, ChipSelector, ToggleButton, makeCall } from '../components/ui';
import { styles } from '../styles';

export default function VoiceRecordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { addClient, addProperty } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [parsedEntity, setParsedEntity] = useState<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRecording) timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const textToParse = transcribedText || "Клиент Иван, телефон +7 999 123 45 67, бюджет 5 млн";
      const isClient = textToParse.toLowerCase().includes('клиент') || textToParse.toLowerCase().includes('имя') || textToParse.toLowerCase().includes('телефон');
      if (isClient) {
        setParsedEntity({ type: 'client', data: { id: generateId(), name: 'Клиент из голоса', phone: '+7 999 000-00-00', propertyType: 'Квартира', rooms: 'Не указано', budgetMin: 5000000, budgetMax: 7000000, district: 'Не указано', floorMin: 0, floorMax: 0, requirements: textToParse, status: 'Новый', lastContact: 'Только что', notes: '', shownProperties: [] } });
      } else {
        setParsedEntity({ type: 'property', data: { id: generateId(), title: 'Объект из голоса', photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e3?w=400'], city: 'Екатеринбург', district: 'Не указано', street: 'Улица', house: 'Дом 1', dealType: 'Продажа', category: 'Квартира', rooms: 'Не указано', price: 5000000, areaTotal: 50, areaLiving: 0, areaKitchen: 0, floor: 1, floorsTotal: 5, yearBuilt: 0, houseType: '', ceilings: 0, renovation: '', bathroom: '', balcony: '', furniture: '', windows: '', parking: '', elevator: '', heating: '', ownersCount: 1, ownershipBasis: '', ownershipYears: '', encumbrance: 'Нет', cadastral: '', readyToDeal: false, ownerName: '', ownerPhone: '', linkCian: '', linkAvito: '', status: 'Активен', notes: textToParse, negotiable: false, mortgage: false, matCapital: false } });
      }
      setShowResult(true);
    } else {
      setIsRecording(true); setSeconds(0); setTranscribedText(''); setShowResult(false); setParsedEntity(null);
    }
  };

  const handleSaveEntity = () => {
    if (parsedEntity.type === 'client') addClient(parsedEntity.data);
    else addProperty(parsedEntity.data);
    Alert.alert('Успех', 'Карточка создана!');
    navigation.goBack();
  };

  const formatTime = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.detailHeader, { borderBottomColor: colors.border, backgroundColor: colors.background, marginTop: 30 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}><Ionicons name="close" size={22} color={colors.accent} /></TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={[styles.detailTitleSm, { color: colors.textPrimary }]}>Голосовой помощник</Text></View>
        <View style={{ width: 38 }} />
      </View>

      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        {!showResult ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={[styles.recordTime, { color: colors.textPrimary }]}>{formatTime(seconds)}</Text>
              <Text style={[styles.recordHint, { color: colors.textSecondary }]}>{isRecording ? 'Слушаю... Говорите четко' : 'Нажмите кнопку, чтобы начать диктовку'}</Text>
            </View>
            <TouchableOpacity style={[styles.bigMicBtn, isRecording ? { backgroundColor: colors.error } : { backgroundColor: colors.accent }]} onPress={toggleRecording}>
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={48} color="white" />
            </TouchableOpacity>
            <View style={{ marginTop: 40 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 10 }]}>Текст записи:</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border, minHeight: 100 }]} value={transcribedText} onChangeText={setTranscribedText} placeholder="Или введите текст вручную" placeholderTextColor={colors.textTertiary} multiline />
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} style={{ marginBottom: 20 }} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 10 }]}>Распознано: {parsedEntity.type === 'client' ? 'Клиент' : 'Объект'}</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, width: '100%', marginBottom: 20 }]}>
              {parsedEntity.type === 'client' ? (
                <>
                  <Text style={[styles.readOnlyText, { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>{parsedEntity.data.name}</Text>
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>📞 {parsedEntity.data.phone}</Text>
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>💰 Бюджет: {formatPrice(parsedEntity.data.budgetMax)}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.readOnlyText, { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>{parsedEntity.data.title}</Text>
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>🏠 {parsedEntity.data.rooms}, {parsedEntity.data.areaTotal} м²</Text>
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>💰 Цена: {formatPrice(parsedEntity.data.price)}</Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.surfaceMuted }]} onPress={() => { setShowResult(false); setTranscribedText(''); }}><Text style={{ color: colors.textPrimary }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.success }]} onPress={handleSaveEntity}><Text style={{ color: 'white', fontWeight: '600' }}>Создать карточку</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

