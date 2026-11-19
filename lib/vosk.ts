/**
 * Офлайн-распознавание речи через Vosk.
 * Модель должна лежать в assets/vosk-model-small-ru-0.22.
 * Работает только в development/production build, не в Expo Go.
 *
 * react-native-vosk v2+ экспортирует именованные функции (loadModel/start/…),
 * а не класс с default export — поэтому нельзя делать `new Vosk()`.
 */
import { Platform } from 'react-native';
import type { EmitterSubscription } from 'react-native';

const VOSK_MODEL_NAME = 'vosk-model-small-ru-0.22';

type VoskApi = typeof import('react-native-vosk');

let voskApi: VoskApi | null = null;
let loaded = false;
let loadError: string | null = null;
let subscriptions: EmitterSubscription[] = [];

async function getVosk(): Promise<VoskApi> {
  if (voskApi) return voskApi;
  try {
    // dynamic import so Expo Go doesn't crash on missing native module
    const mod = await import('react-native-vosk');
    // v2 API: named exports only (no default class). Fallback if a bundler
    // still wraps them under default.
    const api = (mod as VoskApi).loadModel
      ? (mod as VoskApi)
      : ((mod as { default?: VoskApi }).default as VoskApi | undefined);
    if (!api?.loadModel || !api?.start) {
      throw new Error(
        'react-native-vosk: ожидаются именованные экспорты loadModel/start (не класс)'
      );
    }
    voskApi = api;
    return voskApi;
  } catch (e: any) {
    loadError = e?.message || 'react-native-vosk не найден (нужен dev build)';
    throw new Error(loadError || 'react-native-vosk не найден');
  }
}

function clearSubscriptions() {
  for (const sub of subscriptions) {
    try {
      sub.remove();
    } catch {}
  }
  subscriptions = [];
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

  clearSubscriptions();

  const asText = (res: unknown) => {
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object') {
      const obj = res as { partial?: string; text?: string };
      return obj.partial || obj.text || '';
    }
    return '';
  };

  subscriptions.push(
    vosk.onPartialResult((res: any) => {
      const text = asText(res);
      if (text) onPartial(String(text));
    }) as EmitterSubscription
  );
  subscriptions.push(
    vosk.onResult((res: any) => {
      const text = asText(res);
      if (text) onFinal(String(text));
    }) as EmitterSubscription
  );
  subscriptions.push(
    vosk.onFinalResult((res: any) => {
      const text = asText(res);
      if (text) onFinal(String(text));
    }) as EmitterSubscription
  );
  subscriptions.push(
    vosk.onError((err: any) => {
      const message =
        typeof err === 'string'
          ? err
          : err?.message || String(err) || 'Ошибка распознавания';
      loadError = message;
      console.log('Vosk error', err);
      onError?.(message);
    }) as EmitterSubscription
  );

  await vosk.start();
}

export async function stopListening(): Promise<void> {
  if (!voskApi) return;
  try {
    voskApi.stop();
  } catch (e) {
    console.log('vosk stop', e);
  } finally {
    clearSubscriptions();
  }
}

export async function unloadModel(): Promise<void> {
  if (!voskApi) return;
  try {
    clearSubscriptions();
    voskApi.unload();
    loaded = false;
  } catch {}
}
