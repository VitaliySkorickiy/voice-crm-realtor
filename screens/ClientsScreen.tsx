import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView, FlatList,
  TextInput, Image, Modal, Pressable, Alert, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { generateId, formatPrice } from '../lib/utils';
import { styles } from '../styles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ClientsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { clients, deleteClient } = useStore();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [clients.length]);

  const filtered = clients.filter((c: any) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return String(c.name || '').toLowerCase().includes(q) ||
           String(c.phone || '').includes(q) ||
           String(c.district || '').toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { marginTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Клиенты</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>{clients.length} всего</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('ClientDetail', { client: { id: generateId(), name: '', phone: '', status: 'Новый', shownProperties: [] }, isNew: true })}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Поиск по имени, телефону, району"
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 + insets.bottom }}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={[styles.clientCardNew, { backgroundColor: colors.card, marginBottom: 10 }]}
            onPress={() => navigation.navigate('ClientDetail', { client: item, isNew: false })}
            onLongPress={() => setDeleteTarget(item)}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '600' }}>{item.name || 'Без имени'}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{item.phone || '—'}</Text>
            {item.district ? <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 2 }}>{item.district}</Text> : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary }}>Нет клиентов</Text>
          </View>
        }
      />

      {deleteTarget && (
        <Modal visible transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setDeleteTarget(null)}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Удалить клиента?</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Это действие нельзя отменить</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]} onPress={() => setDeleteTarget(null)}>
                  <Text style={{ color: colors.textPrimary }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={() => { deleteClient(deleteTarget.id); setDeleteTarget(null); }}>
                  <Text style={{ color: 'white' }}>Удалить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}
