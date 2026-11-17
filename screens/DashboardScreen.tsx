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

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { tasks, updateTask, deleteTask, addTask, clients } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTask, setReminderTask] = useState<any>(null);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const dayTasks = tasks.filter((t: any) => isSameDay(t.date, selectedDate)).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const todayTasks = tasks.filter((t: any) => isSameDay(t.date, new Date()));
  const totalToday = todayTasks.length;
  const doneToday = todayTasks.filter((t: any) => t.done).length;
  const progress = totalToday > 0 ? (doneToday / totalToday) * 100 : 0;

  const tasksThisMonth = tasks.filter((t: any) => {
    const d = new Date(t.date);
    return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth();
  });

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = (new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() + 6) % 7;

  const days: any[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(<View key={`e${i}`} style={styles.calDayEmpty} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
    const isToday = new Date().toDateString() === date.toDateString();
    const isSelected = selectedDate.toDateString() === date.toDateString();
    const hasTask = tasksThisMonth.some((t: any) => new Date(t.date).getDate() === d);
    days.push(
      <TouchableOpacity key={d} style={[styles.calDay, isSelected && { backgroundColor: colors.accent }]} onPress={() => setSelectedDate(date)}>
        <Text style={[styles.calDayText, isSelected ? { color: 'white' } : { color: colors.textPrimary }, isToday && !isSelected && { color: colors.accent, fontWeight: '700' }]}>{d}</Text>
        {hasTask && !isSelected && <View style={[styles.calDot, { backgroundColor: colors.accent }]} />}
        {hasTask && isSelected && <View style={[styles.calDot, { backgroundColor: 'white' }]} />}
      </TouchableOpacity>
    );
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: generateId(),
      title: newTaskTitle,
      date: selectedDate.toISOString(),
      type: 'doc',
      done: false
    };
    addTask(newTask);
    setNewTaskTitle('');
  };

  const openReminderModal = (task: any) => {
    setReminderTask(task);
    const taskDate = new Date(task.date);
    let defaultReminder = new Date(taskDate.getTime() - 30 * 60000);
    if (defaultReminder <= new Date()) {
      defaultReminder = new Date(Date.now() + 30 * 60000);
    }
    // округлить минуты
    defaultReminder.setSeconds(0, 0);
    setReminderDate(defaultReminder);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowReminderModal(true);
  };

  const ensureNotificationPermissions = async () => {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
      },
    });
    return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  };

  const confirmReminder = async () => {
    if (!reminderTask) return;
    if (reminderDate <= new Date()) {
      Alert.alert('Ошибка', 'Время напоминания должно быть в будущем');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Только на телефоне',
        'Браузер не умеет локальные будильники. Откройте проект в Expo Go на телефоне.'
      );
      return;
    }

    try {
      const ok = await ensureNotificationPermissions();
      if (!ok) {
        Alert.alert(
          'Нет доступа к уведомлениям',
          'Настройки телефона → Приложения → Expo Go → Уведомления → разрешите.'
        );
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alarms', {
          name: 'Будильники и напоминания',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 400, 200, 400],
          enableVibrate: true,
          bypassDnd: true,
        });
      }

      const seconds = Math.max(5, Math.floor((reminderDate.getTime() - Date.now()) / 1000));

      // Простой trigger — лучше работает в Expo Go
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ ' + reminderTask.title,
          body: 'Напоминание о задаче — пора действовать',
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: 'alarms' } : {}),
        },
        trigger: {
          seconds,
          channelId: Platform.OS === 'android' ? 'alarms' : undefined,
        } as any,
      });

      Alert.alert(
        'Будильник установлен',
        '«' + reminderTask.title + '»\n' +
          reminderDate.toLocaleString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })
      );
      setShowReminderModal(false);
      setReminderTask(null);
      setShowDatePicker(false);
      setShowTimePicker(false);
    } catch (e: any) {
      console.log('reminder error', e);
      const msg = e?.message || String(e);
      Alert.alert(
        'Не удалось поставить напоминание',
        msg + '\n\nПлатформа: ' + Platform.OS +
          '\nПроверьте, что открыто Expo Go (не браузер) и разрешены уведомления.'
      );
    }
  };

  const funnelData = [
    { label: 'Новые', count: clients.filter((c: any) => c.status === 'Новый').length, color: colors.textTertiary },
    { label: 'Показ', count: clients.filter((c: any) => c.status === 'Показ').length, color: colors.accent },
    { label: 'Торг', count: clients.filter((c: any) => c.status === 'Торг').length, color: colors.warning },
    { label: 'Аванс', count: clients.filter((c: any) => c.status === 'Аванс').length, color: colors.success },
    { label: 'Сделка', count: clients.filter((c: any) => c.status === 'Сделка').length, color: colors.success },
    { label: 'Отказ', count: clients.filter((c: any) => c.status === 'Отказ').length, color: colors.error },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={[styles.scroll, { paddingTop: 30, paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <View style={styles.progressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.progressNum, { color: colors.textPrimary }]}>{doneToday} / {totalToday}</Text>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>задач на сегодня</Text>
            </View>
            <View style={styles.progressActions}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('VoiceRecord')}>
                <Ionicons name="mic" size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: showCalendar ? colors.accentSoft : colors.surfaceMuted }]} onPress={() => setShowCalendar(p => !p)}>
                <Ionicons name={showCalendar ? 'calendar' : 'calendar-outline'} size={18} color={showCalendar ? colors.accent : colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress}%` }]} />
          </View>
        </View>

        {showCalendar && (
          <View style={[styles.calCard, { backgroundColor: colors.card }]}>
            <View style={styles.calHeader}>
              <Text style={[styles.calMonth, { color: colors.textPrimary }]}>{selectedDate.toLocaleString('ru', { month: 'long', year: 'numeric' })}</Text>
              <TouchableOpacity onPress={() => setSelectedDate(new Date())}><Text style={{ color: colors.accent }}>Сегодня</Text></TouchableOpacity>
            </View>
            <View style={styles.calWeekdays}>
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d, i) => <Text key={i} style={[styles.calWd, { color: colors.textTertiary }]}>{d}</Text>)}
            </View>
            <View style={styles.calGrid}>{days}</View>
          </View>
        )}

        <View style={[styles.addTaskBox, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.addTaskInput, { color: colors.textPrimary }]}
            placeholder="Введите задачу вручную..."
            placeholderTextColor={colors.textTertiary}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={handleAddTask}
          />
          <TouchableOpacity style={[styles.addTaskBtn, { backgroundColor: colors.accent }]} onPress={handleAddTask}>
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Задачи на {selectedDate.toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
          </Text>
          {dayTasks.length === 0 ? (
            <View style={[styles.emptyBlock, { backgroundColor: colors.card }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Задач на этот день нет</Text>
            </View>
          ) : (
            dayTasks.map((task: any) => (
              <View key={task.id} style={[styles.taskRow, { backgroundColor: colors.card }]}>
                <TouchableOpacity style={styles.taskContent} onPress={() => updateTask(task.id, { ...task, done: !task.done })}>
                  <View style={[styles.taskCheck, task.done && { backgroundColor: colors.success, borderColor: colors.success }]}>
                    {task.done && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <View style={styles.taskIconBox}>
                    <Ionicons name={task.type === 'call' ? 'call-outline' : task.type === 'showing' ? 'key-outline' : 'document-text-outline'} size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, { color: colors.textPrimary }, task.done && { textDecorationLine: 'line-through', color: colors.textTertiary }]}>{task.title}</Text>
                    <Text style={[styles.taskTime, { color: colors.textSecondary }]}>{formatTime(task.date)}</Text>
                  </View>
                </TouchableOpacity>
                {!task.done && (
                  <TouchableOpacity
                    style={[styles.taskRemindBtn, { backgroundColor: colors.accentSoft }]}
                    onPress={() => openReminderModal(task)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="notifications-outline" size={16} color={colors.accent} />
                  </TouchableOpacity>
                )}
                {task.done && (
                  <TouchableOpacity
                    style={[styles.taskDelBtn, { backgroundColor: colors.errorSoft }]}
                    onPress={() => setDeleteTarget(task)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Воронка сделок</Text>
          <View style={[styles.funnelCard, { backgroundColor: colors.card }]}>
            {funnelData.map((item, idx) => (
              <View key={idx} style={[styles.funnelRow, { borderBottomColor: colors.separator }]}>
                <View style={styles.funnelLeft}>
                  <View style={[styles.funnelDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.funnelLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                </View>
                <Text style={[styles.funnelCount, { color: colors.textPrimary }]}>{item.count}</Text>
              </View>
            ))}
            <View style={[styles.funnelRow, { borderBottomColor: colors.separator, marginTop: 8 }]}>
              <View style={styles.funnelLeft}>
                <View style={[styles.funnelDot, { backgroundColor: colors.textPrimary }]} />
                <Text style={[styles.funnelLabel, { color: colors.textPrimary, fontWeight: '600' }]}>Всего клиентов</Text>
              </View>
              <Text style={[styles.funnelCount, { color: colors.textPrimary, fontWeight: '700' }]}>{clients.length}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showReminderModal} transparent animationType="slide">
        <SafeAreaView style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <View style={[styles.modalBoxFull, { backgroundColor: colors.card, maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 0 }]}>⏰ Будильник</Text>
              <TouchableOpacity onPress={() => { setShowReminderModal(false); setReminderTask(null); setShowDatePicker(false); setShowTimePicker(false); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {reminderTask && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={[styles.reminderInfo, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[styles.reminderTaskTitle, { color: colors.textPrimary }]}>{reminderTask.title}</Text>
                  <Text style={[styles.reminderTaskTime, { color: colors.textSecondary }]}>
                    Задача: {new Date(reminderTask.date).toLocaleString('ru-RU', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <Text style={[styles.reminderLabel, { color: colors.textSecondary }]}>Дата</Text>
                <TouchableOpacity
                  style={[styles.reminderPickerBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                  onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                  <Text style={[styles.reminderPickerText, { color: colors.textPrimary }]}>
                    {reminderDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}>
                    <DateTimePicker
                      value={reminderDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      minimumDate={new Date()}
                      locale="ru-RU"
                      onChange={(_, selected) => {
                        if (Platform.OS === 'android') setShowDatePicker(false);
                        if (selected) {
                          const next = new Date(reminderDate);
                          next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                          setReminderDate(next);
                        }
                      }}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity style={{ padding: 12, alignItems: 'flex-end' }} onPress={() => setShowDatePicker(false)}>
                        <Text style={{ color: colors.accent, fontWeight: '600' }}>Готово</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Text style={[styles.reminderLabel, { color: colors.textSecondary }]}>Время</Text>
                <TouchableOpacity
                  style={[styles.reminderPickerBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                  onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
                >
                  <Ionicons name="alarm-outline" size={20} color={colors.accent} />
                  <Text style={[styles.reminderPickerText, { color: colors.textPrimary }]}>
                    {reminderDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 16, marginBottom: 12, overflow: 'hidden', alignItems: 'center' }}>
                    <DateTimePicker
                      value={reminderDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      is24Hour
                      locale="ru-RU"
                      onChange={(_, selected) => {
                        if (Platform.OS === 'android') setShowTimePicker(false);
                        if (selected) {
                          const next = new Date(reminderDate);
                          next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                          setReminderDate(next);
                        }
                      }}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity style={{ padding: 12, alignSelf: 'stretch', alignItems: 'flex-end' }} onPress={() => setShowTimePicker(false)}>
                        <Text style={{ color: colors.accent, fontWeight: '600' }}>Готово</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={[styles.reminderInfo, { backgroundColor: colors.accentSoft, marginTop: 4 }]}>
                  <Text style={[styles.reminderTaskTitle, { color: colors.accent, textAlign: 'center' }]}>
                    {reminderDate.toLocaleString('ru-RU', {
                      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                  <Text style={[styles.reminderTaskTime, { color: colors.textSecondary, textAlign: 'center' }]}>
                    Со звуком, как будильник
                  </Text>
                </View>

                <Text style={[styles.reminderLabel, { color: colors.textSecondary, marginTop: 12 }]}>Быстрый выбор</Text>
                <View style={styles.quickOptionsRow}>
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.accentSoft }]} onPress={() => setReminderDate(new Date(Date.now() + 15 * 60000))}>
                    <Text style={[styles.quickBtnText, { color: colors.accent }]}>+15 мин</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.accentSoft }]} onPress={() => setReminderDate(new Date(Date.now() + 30 * 60000))}>
                    <Text style={[styles.quickBtnText, { color: colors.accent }]}>+30 мин</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.accentSoft }]} onPress={() => setReminderDate(new Date(Date.now() + 60 * 60000))}>
                    <Text style={[styles.quickBtnText, { color: colors.accent }]}>+1 час</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalBtns, { marginTop: 16, marginBottom: 24 }]}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => { setShowReminderModal(false); setReminderTask(null); setShowDatePicker(false); setShowTimePicker(false); }}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={confirmReminder}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>⏰ Поставить</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {deleteTarget && (
        <Modal visible={true} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setDeleteTarget(null)}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Удалить задачу?</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>«{deleteTarget.title}» будет удалена навсегда</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]} onPress={() => setDeleteTarget(null)}><Text style={{ color: colors.textPrimary }}>Отмена</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={() => { deleteTask(deleteTarget.id); setDeleteTarget(null); }}><Text style={{ color: 'white' }}>Удалить</Text></TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

