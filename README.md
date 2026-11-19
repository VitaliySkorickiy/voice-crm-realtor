# Голосовая CRM риелтора

Офлайн-приложение для частных риелторов. Все данные хранятся только на устройстве. Никакой аналитики, облачного распознавания речи и передачи персональных данных.

## Возможности

- Клиенты, объекты, задачи, воронка
- Голосовой ввод → карточка (Vosk офлайн)
- Фото объектов (копируются в папку приложения)
- Напоминания с календарём и звуком
- Резервная копия (файл на устройстве / через «Поделиться»)
- Локальная лицензия (триал 7 дней, ключ активации)
- Тёмная тема

## Установка и сборка

```bash
npm install --legacy-peer-deps
npx expo install --fix -- --legacy-peer-deps
```

### Офлайн-распознавание (Vosk)

1. Скачайте русскую модель:  
   https://alphacephei.com/vosk/models  
   Рекомендуется `vosk-model-small-ru-0.22` (~45 МБ).

2. Распакуйте архив в папку проекта как:  
   `assets/vosk-model-small-ru-0.22/`  
   (внутри должны быть файлы модели: `am/`, `graph/`, `conf/` и т.д.)

3. Соберите APK через EAS (нативный Vosk не работает в Expo Go):

```bash
eas build -p android --profile preview
# production:
eas build -p android --profile production
```

Локально (опционально):

```bash
npx expo prebuild
npx expo run:android
```

После сборки модель Vosk внутри APK. Распознавание работает без интернета.

### Лицензия

Триал 7 дней на устройстве. Оплата — СБП / перевод самозанятому вне приложения; ключ вводится вручную. Встроенной оплаты (IAP) нет.

## Структура

```
App.tsx
lib/           storage, store, theme, parser, vosk, matching, license, backup
components/    ui, LicenseGate
screens/       Dashboard, Clients, Properties, Voice, Settings
assets/        icon, splash, vosk-model-small-ru-0.22 (модель Vosk)
```

## Приватность

- База данных: локальный SQLite (на телефоне) / AsyncStorage (web)
- Голос: обработка только на устройстве (Vosk)
- Бэкап: файл, который пользователь сохраняет сам
- Нет серверов, нет SDK аналитики, нет передачи данных
