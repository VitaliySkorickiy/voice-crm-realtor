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

export default function PropertiesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { properties, deleteProperty } = useStore();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minArea: '', maxArea: '', rooms: '' });

  const filtered = properties.filter((p: any) => {
    const q = (query || '').toLowerCase();
    const matchesText = !query.trim() ||
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.street || '').toLowerCase().includes(q) ||
      String(p.district || '').toLowerCase().includes(q);
    const matchesPrice = (!filters.minPrice || p.price >= parseInt(filters.minPrice)) && (!filters.maxPrice || p.price <= parseInt(filters.maxPrice));
    const matchesArea = (!filters.minArea || p.areaTotal >= parseFloat(filters.minArea)) && (!filters.maxArea || p.areaTotal <= parseFloat(filters.maxArea));
    const roomsVal = String(p.rooms || '');
    const matchesRooms = !filters.rooms ||
      (filters.rooms === '4+ комнатная'
        ? /^(4|5|6|7|8|9|10)\+?-комнат/.test(roomsVal) || roomsVal.startsWith('4-') || roomsVal.startsWith('5-')
        : roomsVal === filters.rooms);
    return matchesText && matchesPrice && matchesArea && matchesRooms;
  });

  const resetFilters = () => {
    setFilters({ minPrice: '', maxPrice: '', minArea: '', maxArea: '', rooms: '' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { marginTop: 30 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Объекты</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>{properties.length} в базе</Text>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('PropertyDetail', { property: { id: generateId(), title: '', photos: [], city: '', district: '', street: '', house: '', dealType: 'Продажа', category: 'Квартира', rooms: '', price: 0, areaTotal: 0, areaLiving: 0, areaKitchen: 0, floor: 0, floorsTotal: 0, yearBuilt: 0, houseType: '', ceilings: 0, renovation: '', bathroom: '', balcony: '', furniture: '', windows: '', parking: '', elevator: '', heating: '', ownersCount: 1, ownershipBasis: '', ownershipYears: '', encumbrance: 'Нет', cadastral: '', readyToDeal: false, ownerName: '', ownerPhone: '', linkCian: '', linkAvito: '', status: 'Активен', notes: '', negotiable: false, mortgage: false, matCapital: false }, isNew: true })}>
          <Ionicons name="add" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput style={[styles.searchInput, { color: colors.textPrimary }]} placeholder="Адрес, район, название" placeholderTextColor={colors.textTertiary} value={query} onChangeText={setQuery} />
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ marginLeft: 8 }}>
          <Ionicons name={showFilters ? "filter-circle" : "filter-circle-outline"} size={22} color={showFilters ? colors.accent : colors.textTertiary} />
        </TouchableOpacity>
        {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity>}
      </View>

      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: colors.card }]}>
          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <Text style={[styles.compactLabel, { color: colors.textSecondary }]}>Цена от</Text>
              <TextInput style={[styles.compactInput, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]} value={filters.minPrice} onChangeText={v => setFilters({...filters, minPrice: v})} keyboardType="number-pad" placeholder="0" />
            </View>
            <View style={styles.compactField}>
              <Text style={[styles.compactLabel, { color: colors.textSecondary }]}>до</Text>
              <TextInput style={[styles.compactInput, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]} value={filters.maxPrice} onChangeText={v => setFilters({...filters, maxPrice: v})} keyboardType="number-pad" placeholder="∞" />
            </View>
          </View>
          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <Text style={[styles.compactLabel, { color: colors.textSecondary }]}>Площадь от</Text>
              <TextInput style={[styles.compactInput, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]} value={filters.minArea} onChangeText={v => setFilters({...filters, minArea: v})} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View style={styles.compactField}>
              <Text style={[styles.compactLabel, { color: colors.textSecondary }]}>до</Text>
              <TextInput style={[styles.compactInput, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]} value={filters.maxArea} onChangeText={v => setFilters({...filters, maxArea: v})} keyboardType="decimal-pad" placeholder="∞" />
            </View>
          </View>
          <FormField label="Комнатность">
            <ChipSelector options={['Все', 'Студия', '1-комнатная', '2-комнатная', '3-комнатная', '4+ комнатная']} value={filters.rooms || 'Все'} onChange={v => setFilters({...filters, rooms: v === 'Все' ? '' : v})} />
          </FormField>
          <TouchableOpacity style={[styles.resetFilterBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={resetFilters}>
            <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.resetFilterText, { color: colors.textSecondary }]}>Сбросить фильтры</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={[styles.propertyCardNew, { backgroundColor: colors.card }]} activeOpacity={0.8} onPress={() => navigation.navigate('PropertyDetail', { property: item, isNew: false })}>
            <View style={styles.propertyCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.propertyTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title || 'Без названия'}</Text>
                <View style={[styles.badge, { backgroundColor: colors.accentSoft, alignSelf: 'flex-start', marginTop: 4 }]}><Text style={[styles.badgeText, { color: colors.accent }]}>{item.status}</Text></View>
              </View>
              <TouchableOpacity style={[styles.delBtnInside, { backgroundColor: colors.errorSoft }]} onPress={(e) => { e.stopPropagation(); setDeleteTarget(item); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: item.photos?.[0] || item.photo }} style={styles.propertyPhoto} />
            <View style={styles.propertyCardFooter}>
              <Text style={[styles.propertyAddress, { color: colors.textSecondary }]} numberOfLines={1}>{item.street}, {item.house}</Text>
              <View style={styles.propertySpecsRow}>
                <View style={styles.specItem}><Ionicons name="grid-outline" size={14} color={colors.textTertiary} /><Text style={[styles.specText, { color: colors.textSecondary }]}>{item.rooms}</Text></View>
                <View style={styles.specItem}><Ionicons name="resize-outline" size={14} color={colors.textTertiary} /><Text style={[styles.specText, { color: colors.textSecondary }]}>{item.areaTotal} м²</Text></View>
                <View style={styles.specItem}><Ionicons name="layers-outline" size={14} color={colors.textTertiary} /><Text style={[styles.specText, { color: colors.textSecondary }]}>{item.floor}/{item.floorsTotal}</Text></View>
              </View>
              <Text style={[styles.propertyPrice, { color: colors.textPrimary }]}>{formatPrice(item.price)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      {deleteTarget && (
        <Modal visible={true} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setDeleteTarget(null)}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Удалить объект?</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Это действие нельзя отменить</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]} onPress={() => setDeleteTarget(null)}><Text style={{ color: colors.textPrimary }}>Отмена</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={() => { deleteProperty(deleteTarget.id); setDeleteTarget(null); }}><Text style={{ color: 'white' }}>Удалить</Text></TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

