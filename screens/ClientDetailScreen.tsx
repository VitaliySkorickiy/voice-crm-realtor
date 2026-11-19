import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  TextInput, FlatList, Image, KeyboardAvoidingView, Platform, Modal, Alert, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { formatPrice } from '../lib/utils';
import { matchProperties } from '../lib/matching';
import { FormField, FormInput, ReadOnlyField, ChipSelector, makeCall } from '../components/ui';
import { styles } from '../styles';

export default function ClientDetailScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { addClient, updateClient, properties } = useStore();
  const { client: initialClient, isNew: isNewParam } = route.params;
  const [isNew, setIsNew] = useState(!!isNewParam);
  const [isEditing, setIsEditing] = useState(!!isNewParam);
  const [form, setForm] = useState({ ...initialClient });
  const [saved, setSaved] = useState(false);
  const [showPropPicker, setShowPropPicker] = useState(false);
  const [propSearch, setPropSearch] = useState('');

  const update = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const handleSave = () => {
    if (isNew) {
      addClient(form);
      setIsNew(false); // больше не создаём дубликат при повторном сохранении
    } else {
      updateClient(form.id, form);
    }
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const shownProps = Array.isArray(form.shownProperties) ? form.shownProperties : [];
  const matches = matchProperties(form, properties);
  const shareClient = async () => {
    const lines = [
      form.name || 'Клиент',
      form.phone ? 'Тел: ' + form.phone : '',
      form.propertyType || '',
      form.rooms || '',
      form.budgetMax ? 'Бюджет до ' + formatPrice(form.budgetMax) : '',
      form.district ? 'Район: ' + form.district : '',
      form.note || '',
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось поделиться');
    }
  };


  const filteredPropsForPicker = properties.filter((p: any) => {
    const q = (propSearch || '').toLowerCase();
    return String(p.title || '').toLowerCase().includes(q) ||
           String(p.street || '').toLowerCase().includes(q);
  });

  const addShownProperty = (prop: any) => {
    const exists = shownProps.find((sp: any) => sp.propertyId === prop.id);
    if (!exists) {
      update('shownProperties', [...shownProps, { propertyId: prop.id, comment: '' }]);
    }
    setShowPropPicker(false);
    setPropSearch('');
  };

  const removeShownProperty = (propertyId: string) => {
    update('shownProperties', shownProps.filter((sp: any) => sp.propertyId !== propertyId));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.detailHeader, { borderBottomColor: colors.border, backgroundColor: colors.background, marginTop: 30 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}><Ionicons name="close" size={22} color={colors.accent} /></TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={[styles.detailTitleSm, { color: colors.textPrimary }]} numberOfLines={1}>{form.name || 'Новый клиент'}</Text></View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isEditing ? (
              <>
                <TouchableOpacity onPress={() => { setForm({ ...initialClient }); setIsEditing(false); }} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}><Ionicons name="close-circle-outline" size={22} color={colors.error} /></TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}><Ionicons name="checkmark-circle" size={22} color={colors.success} /></TouchableOpacity>
              </>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={shareClient} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="share-outline" size={20} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditing(true)} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="create-outline" size={22} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 50 + insets.bottom }} showsVerticalScrollIndicator={false}>
          {!isEditing && form.phone && (
            <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: colors.success }]} onPress={() => makeCall(form.phone)}>
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.contactActionText}>Позвонить клиенту</Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Основное</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Имя клиента" required>{isEditing ? <FormInput value={form.name} onChangeText={v => update('name', v)} placeholder="Например: Ивановы" /> : <ReadOnlyField value={form.name} />}</FormField>
              <FormField label="Номер телефона" required>{isEditing ? <FormInput value={form.phone} onChangeText={v => update('phone', v)} placeholder="+7 (999) 123-45-67" keyboardType="phone-pad" mask="phone" /> : <ReadOnlyField value={form.phone} />}</FormField>
              <FormField label="Статус">{isEditing ? <ChipSelector options={['Новый', 'Показ', 'Торг', 'Аванс', 'Сделка', 'Отказ']} value={form.status} onChange={v => update('status', v)} /> : <View style={[styles.badge, { backgroundColor: colors.accentSoft, alignSelf: 'flex-start' }]}><Text style={[styles.badgeText, { color: colors.accent }]}>{form.status}</Text></View>}</FormField>
              <FormField label="Последний контакт">{isEditing ? <FormInput value={form.lastContact} onChangeText={v => update('lastContact', v)} placeholder="2 дня назад" /> : <ReadOnlyField value={form.lastContact} />}</FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Что ищет клиент</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Тип недвижимости">{isEditing ? <ChipSelector options={['Квартира', 'Дом', 'Участок', 'Коммерция', 'Комната']} value={form.propertyType} onChange={v => update('propertyType', v)} /> : <ReadOnlyField value={form.propertyType} />}</FormField>
              <FormField label="Комнатность">{isEditing ? <ChipSelector options={['Студия', '1-комнатная', '2-комнатная', '3-комнатная', '4+ комнатная']} value={form.rooms} onChange={v => update('rooms', v)} /> : <ReadOnlyField value={form.rooms} />}</FormField>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}><FormField label="Площадь от, м²">{isEditing ? <FormInput value={form.areaMin ? String(form.areaMin) : ''} onChangeText={v => update('areaMin', parseFloat(v) || 0)} keyboardType="decimal-pad" /> : <ReadOnlyField value={form.areaMin ? `${form.areaMin} м²` : '—'} />}</FormField></View>
                <View style={{ flex: 1 }}><FormField label="Площадь до, м²">{isEditing ? <FormInput value={form.areaMax ? String(form.areaMax) : ''} onChangeText={v => update('areaMax', parseFloat(v) || 0)} keyboardType="decimal-pad" /> : <ReadOnlyField value={form.areaMax ? `${form.areaMax} м²` : '—'} />}</FormField></View>
              </View>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}><FormField label="Бюджет от, ₽">{isEditing ? <FormInput value={form.budgetMin ? String(form.budgetMin) : ''} onChangeText={v => update('budgetMin', parseInt(v) || 0)} keyboardType="number-pad" /> : <ReadOnlyField value={formatPrice(form.budgetMin)} />}</FormField></View>
                <View style={{ flex: 1 }}><FormField label="Бюджет до, ₽">{isEditing ? <FormInput value={form.budgetMax ? String(form.budgetMax) : ''} onChangeText={v => update('budgetMax', parseInt(v) || 0)} keyboardType="number-pad" /> : <ReadOnlyField value={formatPrice(form.budgetMax)} />}</FormField></View>
              </View>
              <FormField label="Район / город">{isEditing ? <FormInput value={form.district} onChangeText={v => update('district', v)} placeholder="Центральный" /> : <ReadOnlyField value={form.district} />}</FormField>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}><FormField label="Этаж от">{isEditing ? <FormInput value={form.floorMin ? String(form.floorMin) : ''} onChangeText={v => update('floorMin', parseInt(v) || 0)} keyboardType="number-pad" /> : <ReadOnlyField value={form.floorMin ? String(form.floorMin) : '—'} />}</FormField></View>
                <View style={{ flex: 1 }}><FormField label="Этаж до">{isEditing ? <FormInput value={form.floorMax ? String(form.floorMax) : ''} onChangeText={v => update('floorMax', parseInt(v) || 0)} keyboardType="number-pad" /> : <ReadOnlyField value={form.floorMax ? String(form.floorMax) : '—'} />}</FormField></View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Требования</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Что важно клиенту" counter={`${(form.requirements || '').length}/500`}>{isEditing ? <FormInput value={form.requirements} onChangeText={v => update('requirements', v)} placeholder="Рядом со школой..." multiline maxLength={500} /> : <ReadOnlyField value={form.requirements} />}</FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Показанные объекты ({shownProps.length})</Text>
            {isEditing && (
              <TouchableOpacity style={[styles.addPropBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]} onPress={() => setShowPropPicker(true)}>
                <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                <Text style={[styles.addPropText, { color: colors.accent }]}>Добавить показанный объект</Text>
              </TouchableOpacity>
            )}
            {shownProps.length === 0 && !isEditing ? (
              <View style={[styles.emptyBlock, { backgroundColor: colors.card }]}>
                <Ionicons name="eye-off-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Объекты еще не показывались</Text>
              </View>
            ) : (
              shownProps.map((sp: any, idx: number) => {
                const prop = properties.find((p: any) => p.id === sp.propertyId);
                if (!prop) return null;
                return (
                  <View key={idx} style={[styles.shownCard, { backgroundColor: colors.card }]}>
                    <View style={styles.shownHeader}>
                      <Image source={{ uri: prop.photos?.[0] || prop.photo }} style={styles.shownImg} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.shownTitle, { color: colors.textPrimary }]}>{prop.title}</Text>
                        <Text style={[styles.shownMeta, { color: colors.textSecondary }]}>{prop.street}, {prop.house}</Text>
                        <Text style={[styles.shownPrice, { color: colors.accent }]}>{formatPrice(prop.price)}</Text>
                      </View>
                      {isEditing && (
                        <TouchableOpacity onPress={() => removeShownProperty(prop.id)} style={{ padding: 8 }}>
                          <Ionicons name="close-circle" size={20} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={[styles.commentBox, { borderTopColor: colors.separator }]}>
                      <Text style={[styles.commentLabel, { color: colors.textTertiary }]}>Почему не подошёл:</Text>
                      {isEditing ? (
                        <FormInput value={sp.comment} onChangeText={v => {
                          const newShown = [...shownProps];
                          newShown[idx] = { ...newShown[idx], comment: v };
                          update('shownProperties', newShown);
                        }} placeholder="Например: дорого, плохой вид..." multiline />
                      ) : (
                        <Text style={[styles.readOnlyText, { color: colors.textPrimary, marginTop: 4 }]}>{sp.comment || 'Комментарий не добавлен'}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Примечание</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Ваши заметки о клиенте" counter={`${(form.notes || '').length}/500`}>{isEditing ? <FormInput value={form.notes} onChangeText={v => update('notes', v)} placeholder="Особенности..." multiline maxLength={500} /> : <ReadOnlyField value={form.notes} />}</FormField>
            </View>
          </View>

          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { setForm({ ...initialClient }); setIsEditing(false); }}><Text style={[styles.editBtnText, { color: colors.textPrimary }]}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.accent }]} onPress={handleSave}><Text style={[styles.editBtnText, { color: 'white' }]}>Сохранить</Text></TouchableOpacity>
            </View>
          )}
          {saved && !isEditing && (
            <View style={[styles.savedBanner, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.savedText, { color: colors.success }]}>Сохранено</Text>
            </View>
          )}

          <Modal visible={showPropPicker} transparent animationType="slide">
            <SafeAreaView style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
              <View style={[styles.modalBoxFull, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Выберите объект</Text>
                  <TouchableOpacity onPress={() => { setShowPropPicker(false); setPropSearch(''); }}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
                </View>
                <View style={[styles.searchBox, { backgroundColor: colors.surfaceMuted, marginBottom: 16 }]}>
                  <Ionicons name="search" size={18} color={colors.textTertiary} />
                  <TextInput style={[styles.searchInput, { color: colors.textPrimary }]} placeholder="Поиск по названию или адресу" placeholderTextColor={colors.textTertiary} value={propSearch} onChangeText={setPropSearch} autoFocus />
                </View>
                <FlatList 
                  data={filteredPropsForPicker}
                  keyExtractor={(item: any) => item.id}
                  renderItem={({ item }: any) => (
                    <TouchableOpacity style={[styles.propPickerItem, { borderBottomColor: colors.separator }]} onPress={() => addShownProperty(item)}>
                      <Image source={{ uri: item.photos?.[0] || item.photo }} style={styles.propPickerImg} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.propPickerTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                        <Text style={[styles.propPickerMeta, { color: colors.textSecondary }]}>{item.street}, {item.house} · {formatPrice(item.price)}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
                    </TouchableOpacity>
                  )}
                />
              </View>
            </SafeAreaView>
          </Modal>
        
            <View style={[styles.infoCard, { backgroundColor: colors.card, marginTop: 12, marginBottom: 12 }]}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary, marginBottom: 8 }]}>Подходящие объекты</Text>
              {matches.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Нет совпадений по бюджету / комнатам / району</Text>
              ) : (
                matches.slice(0, 5).map((m: any) => (
                  <TouchableOpacity
                    key={m.property.id}
                    style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.separator }}
                    onPress={() => navigation.navigate('PropertyDetail', { property: m.property, isNew: false })}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{m.property.title || m.property.street || 'Объект'}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {m.property.rooms} · {m.property.price ? formatPrice(m.property.price) : ''} · {m.reasons.join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

