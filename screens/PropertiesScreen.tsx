import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, FlatList,
  TextInput, Image, Modal, Pressable, Platform, LayoutAnimation, UIManager,
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

export default function PropertiesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { properties, deleteProperty } = useStore();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minArea: '', maxArea: '', rooms: '' });

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [properties.length]);

  const filtered = properties.filter((p: any) => {
    const q = (query || '').toLowerCase();
    const matchesText = !query.trim() ||
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.street || '').toLowerCase().includes(q) ||
      String(p.district || '').toLowerCase().includes(q);
    const matchesPrice = (!filters.minPrice || p.price >= parseInt(filters.minPrice)) &&
                         (!filters.maxPrice || p.price <= parseInt(filters.maxPrice));
    const matchesArea = (!filters.minArea || p.areaTotal >= parseFloat(filters.minArea)) &&
                        (!filters.maxArea || p.areaTotal <= parseFloat(filters.maxArea));
    const matchesRooms = !filters.rooms || String(p.rooms || '').includes(filters.rooms.replace('+ комнатная', '').replace('-комнатная', ''));
    return matchesText && matchesPrice && matchesArea && matchesRooms;
  });

  const resetFilters = () => setFilters({ minPrice: '', maxPrice: '', minArea: '', maxArea: '', rooms: '' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { marginTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Объекты</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>{properties.length} всего</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('PropertyDetail', {
            property: { id: generateId(), title: '', photos: [], price: 0, status: 'Активен' },
            isNew: true,
          })}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Адрес, район, название"
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name={showFilters ? 'filter-circle' : 'filter-circle-outline'} size={22} color={showFilters ? colors.accent : colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12 }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Цена, ₽</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.surfaceMuted, color: colors.textPrimary }]} placeholder="от" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" value={filters.minPrice} onChangeText={v => setFilters({ ...filters, minPrice: v })} />
            <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.surfaceMuted, color: colors.textPrimary }]} placeholder="до" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" value={filters.maxPrice} onChangeText={v => setFilters({ ...filters, maxPrice: v })} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Площадь, м²</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.surfaceMuted, color: colors.textPrimary }]} placeholder="от" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" value={filters.minArea} onChangeText={v => setFilters({ ...filters, minArea: v })} />
            <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.surfaceMuted, color: colors.textPrimary }]} placeholder="до" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" value={filters.maxArea} onChangeText={v => setFilters({ ...filters, maxArea: v })} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Тип / комнаты</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, marginBottom: 8 }]} placeholder="например: 2-комнатная, дом, участок" placeholderTextColor={colors.textTertiary} value={filters.rooms} onChangeText={v => setFilters({ ...filters, rooms: v })} />
          <TouchableOpacity onPress={resetFilters}>
            <Text style={{ color: colors.accent }}>Сбросить фильтры</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 50 + insets.bottom }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={[styles.propertyCardNew, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('PropertyDetail', { property: item, isNew: false })}
          >
            <View style={styles.propertyCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{item.title || 'Без названия'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{item.district || item.street || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteTarget(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            {(item.photos?.[0] || item.photo) && (
              <Image source={{ uri: item.photos?.[0] || item.photo }} style={{ width: '100%', height: 140 }} />
            )}
            <View style={{ padding: 14 }}>
              <Text style={[styles.premiumPrice, { color: colors.textPrimary }]}>{formatPrice(item.price)}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{item.rooms} · {item.areaTotal || '—'} м²</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <Ionicons name="business-outline" size={40} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary }}>Нет объектов</Text>
          </View>
        }
      />

      {deleteTarget && (
        <Modal visible transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setDeleteTarget(null)}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Удалить объект?</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Это действие нельзя отменить</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]} onPress={() => setDeleteTarget(null)}>
                  <Text style={{ color: colors.textPrimary }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={() => { deleteProperty(deleteTarget.id); setDeleteTarget(null); }}>
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
