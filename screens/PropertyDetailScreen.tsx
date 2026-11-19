import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  Image, KeyboardAvoidingView, Platform, Alert, Share
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { formatPrice } from '../lib/utils';
import { FormField, FormInput, ReadOnlyField, ChipSelector, ToggleButton } from '../components/ui';
import { styles } from '../styles';

async function deletePhotoFileIfLocal(uri: string | null | undefined) {
  if (!uri || Platform.OS === 'web') return;
  const base = FileSystem.documentDirectory;
  if (!base) return;
  const photosPrefix = base + 'photos/';
  if (!uri.startsWith(photosPrefix)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    console.log('removePhoto file delete failed', e);
  }
}

export default function PropertyDetailScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { addProperty, updateProperty } = useStore();
  const { property: initialProperty, isNew: isNewParam } = route.params;
  const [isNew, setIsNew] = useState(!!isNewParam);
  const [isEditing, setIsEditing] = useState(!!isNewParam);
  const [form, setForm] = useState({ ...initialProperty, photos: initialProperty.photos || (initialProperty.photo ? [initialProperty.photo] : []) });
  const [saved, setSaved] = useState(false);
  const DEFAULT_CHECKLIST = [
    'Показ проведён',
    'Клиент заинтересован',
    'Запрошены документы у владельца',
    'Проверен ЕГРН / право собственности',
    'Проверены обременения',
    'Согласована цена / торг',
    'Подготовлен договор задатка',
    'Задаток / аванс получен',
    'Ипотека одобрена (если нужна)',
    'Назначена дата сделки',
    'Сделка зарегистрирована',
  ];
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState<string[]>(
    Array.isArray(initialProperty.checklist) && initialProperty.checklist.length
      ? initialProperty.checklist
      : DEFAULT_CHECKLIST
  );

  const update = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const handleSave = () => {
    const payload = { ...form, checklist };
    if (isNew) {
      addProperty(payload);
      setIsNew(false);
    } else {
      updateProperty(payload.id, payload);
    }
    setForm(payload);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addPhoto = async () => {
    if ((form.photos || []).length >= 5) {
      Alert.alert('Лимит', 'Можно добавить не больше 5 фото');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках телефона');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - (form.photos || []).length,
      });
      if (result.canceled || !result.assets?.length) return;

      const dir = FileSystem.documentDirectory + 'photos/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

      const savedUris: string[] = [];
      for (const asset of result.assets) {
        const ext = (asset.uri.split('.').pop() || 'jpg').split('?')[0];
        const dest = dir + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
        try {
          await FileSystem.copyAsync({ from: asset.uri, to: dest });
          savedUris.push(dest);
        } catch (copyErr) {
          console.log('copy photo failed', copyErr);
          savedUris.push(asset.uri); // fallback
        }
      }
      const merged = [...(form.photos || []), ...savedUris].slice(0, 5);
      update('photos', merged);
    } catch (e) {
      console.log(e);
      Alert.alert('Ошибка', 'Не удалось выбрать или сохранить фото');
    }
  };

  const removePhoto = (index: number) => {
    const removed = form.photos?.[index];
    const newPhotos = (form.photos || []).filter((_: any, i: number) => i !== index);
    update('photos', newPhotos);
    deletePhotoFileIfLocal(removed).catch(() => {});
    if (!isNew) {
      updateProperty(form.id, { ...form, photos: newPhotos, checklist });
    }
  };
  const sendClientPresentation = async () => {
    const lines = [
      form.title || 'Объект недвижимости',
      form.rooms || '',
      form.areaTotal ? form.areaTotal + ' м²' : '',
      form.price ? formatPrice(form.price) : '',
      form.district ? 'Район: ' + form.district : '',
      form.floor ? 'Этаж: ' + form.floor + (form.floorsTotal ? '/' + form.floorsTotal : '') : '',
      form.note || '',
      '',
      'Свяжитесь со мной для просмотра и подробностей.',
    ].filter(Boolean);
    const message = lines.join('\n');
    const photo = (form.photos && form.photos[0]) || form.photo || null;

    try {
      if (photo && await Sharing.isAvailableAsync()) {
        // Сначала текст
        await Share.share({ message });
        // Затем фото отдельным шарингом (надёжнее на Android)
        await Sharing.shareAsync(photo, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Фото объекта',
        });
      } else {
        await Share.share({ message });
      }
    } catch (e) {
      console.log('share error', e);
      Alert.alert('Ошибка', 'Не удалось отправить презентацию');
    }
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.detailHeader, { borderBottomColor: colors.border, backgroundColor: colors.background, marginTop: 30 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}><Ionicons name="close" size={22} color={colors.accent} /></TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={[styles.detailTitleSm, { color: colors.textPrimary }]} numberOfLines={1}>{form.title || 'Новый объект'}</Text></View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isEditing ? (
              <>
                <TouchableOpacity onPress={() => { setForm({ ...initialProperty }); setIsEditing(false); }} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}><Ionicons name="close-circle-outline" size={22} color={colors.error} /></TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}><Ionicons name="checkmark-circle" size={22} color={colors.success} /></TouchableOpacity>
              </>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={sendClientPresentation} style={[styles.iconBtnSm, { backgroundColor: colors.accent }]}>
                  <Ionicons name="send-outline" size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditing(true)} style={[styles.iconBtnSm, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="create-outline" size={22} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 50 + insets.bottom }} showsVerticalScrollIndicator={false}>
          <View style={styles.galleryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
              {(form.photos || []).map((photo: string, idx: number) => (
                <View key={idx} style={styles.galleryItem}>
                  <Image source={{ uri: photo }} style={styles.galleryImg} />
                  {isEditing && (
                    <TouchableOpacity style={styles.galleryRemove} onPress={() => removePhoto(idx)}>
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {isEditing && (form.photos || []).length < 5 && (
                <TouchableOpacity style={[styles.galleryAdd, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={addPhoto}>
                  <Ionicons name="camera-outline" size={24} color={colors.textTertiary} />
                  <Text style={[styles.galleryAddText, { color: colors.textTertiary }]}>+ Фото</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View style={styles.detailInfoBlock}>
            {isEditing ? (
              <>
                <FormField label="Название объекта"><FormInput value={form.title} onChangeText={v => update('title', v)} placeholder="Например: Двушка на Ленина" /></FormField>
                <FormField label="Улица"><FormInput value={form.street} onChangeText={v => update('street', v)} placeholder="ул. Ленина" /></FormField>
                <FormField label="Дом / квартира"><FormInput value={form.house} onChangeText={v => update('house', v)} placeholder="15, кв. 42" /></FormField>
                <FormField label="Цена, ₽" required><FormInput value={form.price ? String(form.price) : ''} onChangeText={v => update('price', parseInt(v) || 0)} keyboardType="number-pad" /></FormField>
              </>
            ) : (
              <>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{form.title}</Text>
                <Text style={[styles.detailAddress, { color: colors.textPrimary }]}>{form.street}, {form.house}</Text>
                <Text style={[styles.detailDistrict, { color: colors.textSecondary }]}>{form.district}, {form.city}</Text>
                <Text style={[styles.detailPrice, { color: colors.textPrimary }]}>{formatPrice(form.price)}</Text>
                <Text style={[styles.detailPricePerM, { color: colors.textSecondary }]}>{form.areaTotal ? Math.round(form.price / form.areaTotal).toLocaleString('ru-RU') : '—'} ₽/м²</Text>
              </>
            )}
          </View>

          {!isEditing && (
            <View style={styles.tagsRow}>
              <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}><Text style={[styles.badgeText, { color: colors.accent }]}>{form.status}</Text></View>
              {form.negotiable && <View style={[styles.badge, { backgroundColor: colors.warningSoft }]}><Text style={[styles.badgeText, { color: colors.warning }]}>Торг</Text></View>}
              {form.mortgage && <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}><Text style={[styles.badgeText, { color: colors.accent }]}>Ипотека</Text></View>}
              {form.matCapital && <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}><Text style={[styles.badgeText, { color: colors.accent }]}>Маткапитал</Text></View>}
              {form.readyToDeal && <View style={[styles.badge, { backgroundColor: colors.successSoft }]}><Text style={[styles.badgeText, { color: colors.success }]}>Готов к сделке</Text></View>}
            </View>
          )}

          
          {!isEditing && (
            <TouchableOpacity
              style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              onPress={sendClientPresentation}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Отправить презентацию клиенту</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.infoCard, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 12 }]}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => setChecklistOpen(!checklistOpen)}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Чек-лист сделки</Text>
              <Ionicons name={checklistOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            {checklistOpen && checklist.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < checklist.length - 1 ? 1 : 0, borderBottomColor: colors.separator }}
                onPress={() => {
                  const next = [...checklist];
                  next[idx] = next[idx].startsWith('✓ ') ? next[idx].slice(2) : '✓ ' + next[idx];
                  setChecklist(next);
                  update('checklist', next);
                  if (!isNew) {
                    updateProperty(form.id, { ...form, checklist: next });
                  }
                }}
              >
                <Ionicons
                  name={item.startsWith('✓ ') ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={item.startsWith('✓ ') ? colors.success : colors.textTertiary}
                />
                <Text style={{ marginLeft: 12, flex: 1, color: colors.textPrimary, fontSize: 15, textDecorationLine: item.startsWith('✓ ') ? 'line-through' : 'none' }}>
                  {item.replace('✓ ', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>


          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Сделка</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Город">{isEditing ? <FormInput value={form.city} onChangeText={v => update('city', v)} placeholder="Екатеринбург" /> : <ReadOnlyField value={form.city} />}</FormField>
              <FormField label="Район">{isEditing ? <FormInput value={form.district} onChangeText={v => update('district', v)} placeholder="Центральный" /> : <ReadOnlyField value={form.district} />}</FormField>
              <FormField label="Тип сделки">{isEditing ? <ChipSelector options={['Продажа', 'Аренда']} value={form.dealType} onChange={v => update('dealType', v)} /> : <ReadOnlyField value={form.dealType} />}</FormField>
              <FormField label="Статус объекта">{isEditing ? <ChipSelector options={['Активен', 'Показы', 'Аванс', 'Продан', 'Снят']} value={form.status} onChange={v => update('status', v)} /> : <ReadOnlyField value={form.status} />}</FormField>
              <FormField label="Возможности">
                {isEditing ? (
                  <View style={styles.toggleRow}>
                    <ToggleButton label="Торг" value={form.negotiable} onPress={() => update('negotiable', !form.negotiable)} />
                    <ToggleButton label="Ипотека" value={form.mortgage} onPress={() => update('mortgage', !form.mortgage)} />
                    <ToggleButton label="Маткапитал" value={form.matCapital} onPress={() => update('matCapital', !form.matCapital)} />
                    <ToggleButton label="Готов к сделке" value={form.readyToDeal} onPress={() => update('readyToDeal', !form.readyToDeal)} />
                  </View>
                ) : (
                  <ReadOnlyField value={[form.negotiable && 'Торг', form.mortgage && 'Ипотека', form.matCapital && 'Маткапитал', form.readyToDeal && 'Готов к сделке'].filter(Boolean).join(', ') || '—'} />
                )}
              </FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Характеристики</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Тип объекта">{isEditing ? <ChipSelector options={['Квартира', 'Дом', 'Комната', 'Участок', 'Коммерция']} value={form.category} onChange={v => update('category', v)} /> : <ReadOnlyField value={form.category} />}</FormField>
              <FormField label="Комнатность">{isEditing ? <FormInput value={form.rooms} onChangeText={v => update('rooms', v)} placeholder="2-комнатная" /> : <ReadOnlyField value={form.rooms} />}</FormField>
              <FormField label="Общая площадь, м²">{isEditing ? <FormInput value={form.areaTotal ? String(form.areaTotal) : ''} onChangeText={v => update('areaTotal', parseFloat(v) || 0)} keyboardType="decimal-pad" /> : <ReadOnlyField value={form.areaTotal ? `${form.areaTotal} м²` : '—'} />}</FormField>
              <FormField label="Жилая площадь, м²">{isEditing ? <FormInput value={form.areaLiving ? String(form.areaLiving) : ''} onChangeText={v => update('areaLiving', parseFloat(v) || 0)} keyboardType="decimal-pad" /> : <ReadOnlyField value={form.areaLiving ? `${form.areaLiving} м²` : '—'} />}</FormField>
              <FormField label="Площадь кухни, м²">{isEditing ? <FormInput value={form.areaKitchen ? String(form.areaKitchen) : ''} onChangeText={v => update('areaKitchen', parseFloat(v) || 0)} keyboardType="decimal-pad" /> : <ReadOnlyField value={form.areaKitchen ? `${form.areaKitchen} м²` : '—'} />}</FormField>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}><FormField label="Этаж">{isEditing ? <FormInput value={form.floor ? String(form.floor) : ''} onChangeText={v => update('floor', parseInt(v) || 0)} keyboardType="number-pad" /> : <ReadOnlyField value={form.floor ? String(form.floor) : '—'} />}</FormField></View>
                <View style={{ flex: 1 }}><FormField label="Этажность дома">{isEditing ? <FormInput value={form.floorsTotal ? String(form.floorsTotal) : ''} onChangeText={v => update('floorsTotal', parseInt(v) || 0)} keyboardType="number-pad" /> : <ReadOnlyField value={form.floorsTotal ? String(form.floorsTotal) : '—'} />}</FormField></View>
              </View>
              <FormField label="Год постройки">{isEditing ? <FormInput value={form.yearBuilt ? String(form.yearBuilt) : ''} onChangeText={v => update('yearBuilt', parseInt(v) || 0)} keyboardType="number-pad" maxLength={4} /> : <ReadOnlyField value={form.yearBuilt ? String(form.yearBuilt) : '—'} />}</FormField>
              <FormField label="Тип дома">{isEditing ? <FormInput value={form.houseType} onChangeText={v => update('houseType', v)} placeholder="Панельный, кирпичный..." /> : <ReadOnlyField value={form.houseType} />}</FormField>
              <FormField label="Высота потолков, м">{isEditing ? <FormInput value={form.ceilings ? String(form.ceilings) : ''} onChangeText={v => update('ceilings', parseFloat(v) || 0)} keyboardType="decimal-pad" /> : <ReadOnlyField value={form.ceilings ? `${form.ceilings} м` : '—'} />}</FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Состояние и оснащение</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Ремонт">{isEditing ? <FormInput value={form.renovation} onChangeText={v => update('renovation', v)} placeholder="Косметический..." /> : <ReadOnlyField value={form.renovation} />}</FormField>
              <FormField label="Санузел">{isEditing ? <FormInput value={form.bathroom} onChangeText={v => update('bathroom', v)} placeholder="Раздельный..." /> : <ReadOnlyField value={form.bathroom} />}</FormField>
              <FormField label="Балкон / лоджия">{isEditing ? <FormInput value={form.balcony} onChangeText={v => update('balcony', v)} placeholder="Лоджия..." /> : <ReadOnlyField value={form.balcony} />}</FormField>
              <FormField label="Мебель и техника">{isEditing ? <FormInput value={form.furniture} onChangeText={v => update('furniture', v)} placeholder="Частично..." multiline /> : <ReadOnlyField value={form.furniture} />}</FormField>
              <FormField label="Окна и вид">{isEditing ? <FormInput value={form.windows} onChangeText={v => update('windows', v)} placeholder="Двор, тихо" /> : <ReadOnlyField value={form.windows} />}</FormField>
              <FormField label="Отопление">{isEditing ? <FormInput value={form.heating} onChangeText={v => update('heating', v)} placeholder="Центральное" /> : <ReadOnlyField value={form.heating} />}</FormField>
              <FormField label="Лифт">{isEditing ? <FormInput value={form.elevator} onChangeText={v => update('elevator', v)} placeholder="Пассажирский" /> : <ReadOnlyField value={form.elevator} />}</FormField>
              <FormField label="Парковка">{isEditing ? <FormInput value={form.parking} onChangeText={v => update('parking', v)} placeholder="Открытая..." /> : <ReadOnlyField value={form.parking} />}</FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Юридическая чистота</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Количество собственников">{isEditing ? <FormInput value={form.ownersCount ? String(form.ownersCount) : ''} onChangeText={v => update('ownersCount', parseInt(v) || 0)} keyboardType="number-pad" /> : <ReadOnlyField value={form.ownersCount ? String(form.ownersCount) : '—'} />}</FormField>
              <FormField label="Основание права">{isEditing ? <FormInput value={form.ownershipBasis} onChangeText={v => update('ownershipBasis', v)} placeholder="ДКП" /> : <ReadOnlyField value={form.ownershipBasis} />}</FormField>
              <FormField label="Срок владения">{isEditing ? <FormInput value={form.ownershipYears} onChangeText={v => update('ownershipYears', v)} placeholder=">5 лет" /> : <ReadOnlyField value={form.ownershipYears} />}</FormField>
              <FormField label="Обременения">{isEditing ? <FormInput value={form.encumbrance} onChangeText={v => update('encumbrance', v)} placeholder="Нет" /> : <ReadOnlyField value={form.encumbrance} />}</FormField>
              <FormField label="Кадастровый номер">{isEditing ? <FormInput value={form.cadastral} onChangeText={v => update('cadastral', v)} placeholder="66:41:..." /> : <ReadOnlyField value={form.cadastral} />}</FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Собственник</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="ФИО">{isEditing ? <FormInput value={form.ownerName} onChangeText={v => update('ownerName', v)} placeholder="Иванов И.И." /> : <ReadOnlyField value={form.ownerName} />}</FormField>
              <FormField label="Телефон">{isEditing ? <FormInput value={form.ownerPhone} onChangeText={v => update('ownerPhone', v)} placeholder="+7 (999) ..." keyboardType="phone-pad" mask="phone" /> : <ReadOnlyField value={form.ownerPhone} />}</FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Объявления</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Ссылка на ЦИАН">{isEditing ? <FormInput value={form.linkCian} onChangeText={v => update('linkCian', v)} placeholder="https://cian.ru/..." /> : <ReadOnlyField value={form.linkCian} />}</FormField>
              <FormField label="Ссылка на Авито">{isEditing ? <FormInput value={form.linkAvito} onChangeText={v => update('linkAvito', v)} placeholder="https://avito.ru/..." /> : <ReadOnlyField value={form.linkAvito} />}</FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Примечание</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <FormField label="Ваши заметки об объекте" counter={`${(form.notes || '').length}/500`}>{isEditing ? <FormInput value={form.notes} onChangeText={v => update('notes', v)} placeholder="Договорённости..." multiline maxLength={500} /> : <ReadOnlyField value={form.notes} />}</FormField>
            </View>
          </View>

          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { setForm({ ...initialProperty }); setIsEditing(false); }}><Text style={[styles.editBtnText, { color: colors.textPrimary }]}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.accent }]} onPress={handleSave}><Text style={[styles.editBtnText, { color: 'white' }]}>Сохранить</Text></TouchableOpacity>
            </View>
          )}
          {saved && !isEditing && (
            <View style={[styles.savedBanner, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.savedText, { color: colors.success }]}>Сохранено</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

