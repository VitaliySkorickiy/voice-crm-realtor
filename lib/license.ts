import AsyncStorage from '@react-native-async-storage/async-storage';

/** Длительность триала (дней) */
export const TRIAL_DAYS = 7;

const KEY_FIRST_LAUNCH = 'voicecrm_license_first_launch';
const KEY_LICENSE = 'voicecrm_license_key';
const KEY_LICENSE_ACTIVATED_AT = 'voicecrm_license_activated_at';

export type LicenseStatus = {
  ready: boolean;
  /** Есть валидный ключ активации */
  isLicensed: boolean;
  /** Триал ещё идёт */
  isTrialActive: boolean;
  /** Можно пользоваться приложением */
  canUse: boolean;
  /** Дата первого запуска (ISO) */
  firstLaunchAt: string | null;
  /** Дней осталось в триале (0 если истёк или лицензия) */
  trialDaysLeft: number;
  /** Сохранённый ключ (маскированный для UI) */
  licenseKeyMasked: string | null;
};

/**
 * Простая локальная проверка ключа (заглушка под будущий Ed25519 / сервер).
 * Формат: VCRM-XXXX-XXXX-XXXX-XXXX где X = A-Z/0-9
 * Контрольная сумма: сумма charCode % 97 === 13 (лёгкая защита от опечаток)
 */
export function validateLicenseKeyFormat(raw: string): { ok: boolean; normalized: string; reason?: string } {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, '');
  const re = /^VCRM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!re.test(normalized)) {
    return {
      ok: false,
      normalized,
      reason: 'Неверный формат. Ожидается: VCRM-XXXX-XXXX-XXXX-XXXX',
    };
  }
  const body = normalized.replace(/-/g, '');
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += body.charCodeAt(i);
  if (sum % 97 !== 13) {
    return { ok: false, normalized, reason: 'Ключ недействителен' };
  }
  return { ok: true, normalized };
}

/** Тестовый ключ для разработки (проходит checksum) — подобрать или сгенерировать */
export function generateDevKey(): string {
  // Проверенный тестовый ключ (checksum ok). Для продакшена — выдача после оплаты.
  return 'VCRM-DEMO-2026-TRIL-AAA6';
}

function maskKey(key: string): string {
  if (key.length < 10) return '••••';
  return key.slice(0, 9) + '-••••-••••';
}

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();
  const ms = to.getTime() - from;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export async function ensureFirstLaunchRecorded(): Promise<string> {
  let first = await AsyncStorage.getItem(KEY_FIRST_LAUNCH);
  if (!first) {
    first = new Date().toISOString();
    await AsyncStorage.setItem(KEY_FIRST_LAUNCH, first);
  }
  return first;
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  try {
    const firstLaunchAt = await ensureFirstLaunchRecorded();
    const key = await AsyncStorage.getItem(KEY_LICENSE);
    let isLicensed = false;
    if (key) {
      isLicensed = validateLicenseKeyFormat(key).ok;
    }

    const elapsed = daysBetween(firstLaunchAt);
    const trialDaysLeft = Math.max(0, TRIAL_DAYS - elapsed);
    const isTrialActive = !isLicensed && trialDaysLeft > 0;
    const canUse = isLicensed || isTrialActive;

    return {
      ready: true,
      isLicensed,
      isTrialActive,
      canUse,
      firstLaunchAt,
      trialDaysLeft: isLicensed ? 0 : trialDaysLeft,
      licenseKeyMasked: key ? maskKey(key) : null,
    };
  } catch (e) {
    console.log('license status error', e);
    return {
      ready: true,
      isLicensed: false,
      isTrialActive: true,
      canUse: true,
      firstLaunchAt: null,
      trialDaysLeft: TRIAL_DAYS,
      licenseKeyMasked: null,
    };
  }
}

export async function activateLicense(rawKey: string): Promise<{ ok: boolean; message: string }> {
  const { ok, normalized, reason } = validateLicenseKeyFormat(rawKey);
  if (!ok) return { ok: false, message: reason || 'Неверный ключ' };

  await AsyncStorage.setItem(KEY_LICENSE, normalized);
  await AsyncStorage.setItem(KEY_LICENSE_ACTIVATED_AT, new Date().toISOString());
  return { ok: true, message: 'Лицензия активирована' };
}

export async function clearLicense(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_LICENSE, KEY_LICENSE_ACTIVATED_AT]);
}

/** Сброс триала только для отладки */
export async function debugResetTrial(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_FIRST_LAUNCH, KEY_LICENSE, KEY_LICENSE_ACTIVATED_AT]);
}

/**
 * Заглушка оплаты: позже здесь deep-link / WebView на ЮKassa, CloudPayments и т.д.
 * Сейчас возвращает инструкцию и тестовый ключ для проверки UI.
 */
export async function startPurchaseStub(): Promise<{ message: string; testKey: string }> {
  const testKey = generateDevKey();
  return {
    message:
      'Оплата пока в режиме заглушки. После подключения платёжного шлюза здесь откроется форма оплаты. Для проверки активации используйте тестовый ключ.',
    testKey,
  };
}
