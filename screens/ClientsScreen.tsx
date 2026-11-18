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

export default function ClientsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { clients, deleteClient } = useStore();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const filtered = clients.filter((c: any) => {
    if (!query.trim()) return true;
    const q = (query || '').toLowerCase();
    return String(c.name || '').toLowerCase().includes(q) ||
           String(c.phone || '').includes(q) ||
           String(c.district || '').toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { marginTop: 30 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Клиенты</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>{clients.length} в базе</Text>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('ClientDetail', { client: { id: generateId(), name: '', phone: '', propertyType: 'Квартира', rooms: '', budgetMin: 0, budgetMax: 0, district: '', floorMin: 0, floorMax: 0, requirements: '', status: 'Новый', lastContact: 'Только что', notes: '', shownProperties: [] }, isNew: true })}>
          <Ionicons name="add" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput style={[styles.searchInput, { color: colors.textPrimary }]} placeholder="Имя, телефон, район" placeholderTextColor={colors.textTertiary} value={query} onChangeText={setQuery} />
        {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity>}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={[styles.clientCardNew, { backgroundColor: colors.card }]} activeOpacity={0.7} onPress={() => navigation.navigate('ClientDetail', { client: item, isNew: false })}>
            <View style={styles.clientCardTop}>
              <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.avatarText, { color: colors.accent }]}>{(item.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.clientName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name || 'Без имени'}</Text>
                <View style={[styles.badge, { backgroundColor: colors.accentSoft, alignSelf: 'flex-start', marginTop: 4 }]}><Text style={[styles.badgeText, { color: colors.accent }]}>{item.status}</Text></View>
              </View>
              <TouchableOpacity style={[styles.delBtnInside, { backgroundColor: colors.errorSoft }]} onPress={(e) => { e.stopPropagation(); setDeleteTarget(item); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.clientCardBottom}>
              <Text style={[styles.clientPhone, { color: colors.textPrimary }]} numberOfLines={1}>{item.phone || 'Нет телефона'}</Text>
              <Text style={[styles.clientMeta, { color: colors.textTertiary }]} numberOfLines={1}>{item.propertyType} · {item.rooms} · до {formatPriceShort(item.budgetMax)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      {deleteTarget && (
        <Modal visible={true} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setDeleteTarget(null)}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Удалить клиента?</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Это действие нельзя отменить</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]} onPress={() => setDeleteTarget(null)}><Text style={{ color: colors.textPrimary }}>Отмена</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={() => { deleteClient(deleteTarget.id); setDeleteTarget(null); }}><Text style={{ color: 'white' }}>Удалить</Text></TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

