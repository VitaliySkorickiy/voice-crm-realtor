/**
 * Офлайн-распознавание речи через Vosk.
 * Модель должна лежать в assets/vosk-model-small-ru-0.22.
 * Работает только в development/production build, не в Expo Go.
 */
import { Platform } from 'react-native';

const VOSK_MODEL_NAME = 'vosk-model-small-ru-0.22';

let voskInstance: any = null;
let loaded = false;
let loadError: string | null = null;

async function getVosk() {
  if (voskInstance) return voskInstance;
  try {
    // dynamic import so Expo Go doesn't crash on missing native module
    const mod = await import('react-native-vosk');
    voskInstance = new mod.default();
    return voskInstance;
  } catch (e: any) {
    loadError = e?.message || 'react-native-vosk не найден (нужен dev build)';
    throw new Error(loadError || 'react-native-vosk не найден');
  }
}

export async function ensureModelLoaded(): Promise<void> {
  if (loaded) return;
  if (Platform.OS === 'web') throw new Error('Vosk недоступен в браузере');
  const vosk = await getVosk();
  try {
    await vosk.loadModel(VOSK_MODEL_NAME);
    loaded = true;
    loadError = null;
  } catch (e: any) {
    loadError = e?.message || `Не удалось загрузить модель ${VOSK_MODEL_NAME}`;
    throw new Error(loadError || 'Не удалось загрузить модель Vosk');
  }
}

/** @deprecated используйте ensureModelLoaded — оставлено для совместимости */
export async function loadModel(): Promise<boolean> {
  try {
    await ensureModelLoaded();
    return true;
  } catch {
    return false;
  }
}

export function isVoskReady(): boolean {
  return loaded;
}

export function getVoskError(): string | null {
  return loadError;
}

export async function startListening(
  onPartial: (text: string) => void,
  onFinal: (text: string) => void,
  onError?: (message: string) => void
): Promise<void> {
  const vosk = await getVosk();
  await ensureModelLoaded();

  // clear previous listeners if any
  try { vosk.removeAllListeners?.(); } catch {}

  vosk.onPartialResult((res: any) => {
    const text = typeof res === 'string' ? res : (res?.partial || res?.text || '');
    if (text) onPartial(String(text));
  });
  vosk.onResult((res: any) => {
    const text = typeof res === 'string' ? res : (res?.text || '');
    if (text) onFinal(String(text));
  });
  vosk.onFinalResult((res: any) => {
    const text = typeof res === 'string' ? res : (res?.text || '');
    if (text) onFinal(String(text));
  });
  vosk.onError((err: any) => {
    const message = typeof err === 'string' ? err : (err?.message || String(err) || 'Ошибка распознавания');
    loadError = message;
    console.log('Vosk error', err);
    onError?.(message);
  });

  await vosk.start();
}

export async function stopListening(): Promise<void> {
  if (!voskInstance) return;
  try {
    voskInstance.stop();
  } catch (e) {
    console.log('vosk stop', e);
  }
}

export async function unloadModel(): Promise<void> {
  if (!voskInstance) return;
  try {
    voskInstance.unload();
    loaded = false;
  } catch {}
}
