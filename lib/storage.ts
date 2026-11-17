import AsyncStorage from '@react-native-async-storage/async-storage';

export type DbPayload = {
  clients: any[];
  properties: any[];
  tasks: any[];
};

const DB_KEY = 'voicecrm_db_v1';
const INIT_KEY = 'voicecrm_initialized_v1';

export async function loadDB(): Promise<DbPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      clients: Array.isArray(data.clients) ? data.clients : [],
      properties: Array.isArray(data.properties) ? data.properties : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
    };
  } catch (e) {
    console.log('Web DB load error:', e);
    return null;
  }
}

export async function saveDB(data: DbPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(INIT_KEY, '1');
  } catch (e) {
    console.log('Web DB save error:', e);
  }
}

export async function isInitialized(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INIT_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function clearDB(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([DB_KEY, INIT_KEY]);
  } catch (e) {
    console.log('Web DB clear error:', e);
  }
}
