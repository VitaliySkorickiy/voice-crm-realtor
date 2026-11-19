import { Platform, Share } from 'react-native';
import type { DbPayload } from './storage';

export type BackupFile = {
  app: 'voice-crm-realtor';
  version: 1;
  exportedAt: string;
  clients: any[];
  properties: any[];
  tasks: any[];
};

export function buildBackup(data: DbPayload): BackupFile {
  return {
    app: 'voice-crm-realtor',
    version: 1,
    exportedAt: new Date().toISOString(),
    clients: data.clients || [],
    properties: data.properties || [],
    tasks: data.tasks || [],
  };
}

export function parseBackup(raw: string): DbPayload {
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('Неверный файл');
  if (data.app && data.app !== 'voice-crm-realtor') {
    throw new Error('Файл не от этого приложения');
  }
  return {
    clients: Array.isArray(data.clients) ? data.clients : [],
    properties: Array.isArray(data.properties) ? data.properties : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
  };
}

/** Выгрузка: Share / сохранить файл */
export async function exportBackup(data: DbPayload): Promise<void> {
  const backup = buildBackup(data);
  const json = JSON.stringify(backup, null, 2);
  const fileName = `voice-crm-backup-${new Date().toISOString().slice(0, 10)}.vcdb.json`;

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) throw new Error('no dir');
    const path = dir + fileName;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: 'Сохранить базу Voice CRM',
        UTI: 'public.json',
      });
      return;
    }
  } catch (e) {
    console.log('file share fallback', e);
  }

  // fallback: системный Share текста (web / если sharing недоступен)
  await Share.share({
    message: json,
    title: fileName,
  });
}

/** Загрузка файла бэкапа */
export async function importBackupFromPicker(): Promise<DbPayload> {
  const DocumentPicker = await import('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (res.canceled || !res.assets?.length) {
    throw new Error('CANCELLED');
  }

  const asset = res.assets[0];
  let raw = '';

  try {
    const FileSystem = await import('expo-file-system/legacy');
    if (asset.uri) {
      raw = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }
  } catch (e) {
    console.log('read file error', e);
  }

  if (!raw && (asset as any).file) {
    // web File
    raw = await (asset as any).file.text();
  }

  if (!raw) throw new Error('Не удалось прочитать файл');
  return parseBackup(raw);
}
