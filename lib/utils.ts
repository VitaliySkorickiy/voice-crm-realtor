export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatPrice(n: number | undefined | null): string {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

export function formatPriceShort(n: number | undefined | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' млн';
  if (n >= 1_000) return Math.round(n / 1_000) + ' тыс';
  return String(n);
}

export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function isSameDay(a: Date | string | number, b: Date | string | number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** Маска телефона: всегда начинается с +7, только цифры */
export function maskPhone(text: string): string {
  let digits = text.replace(/\D/g, '');
  // если начали с 8 — заменяем на 7
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  // если не начинается с 7 — добавляем 7
  if (digits && !digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);
  if (!digits) return '+7';
  let result = '+7';
  if (digits.length > 1) result += ' (' + digits.slice(1, 4);
  if (digits.length >= 5) result += ') ' + digits.slice(4, 7);
  if (digits.length >= 8) result += '-' + digits.slice(7, 9);
  if (digits.length >= 10) result += '-' + digits.slice(9, 11);
  return result;
}

export function getDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Только цифры (целые числа) */
export function digitsOnly(text: string, maxLen = 12): string {
  return text.replace(/\D/g, '').slice(0, maxLen);
}

/** Цифры + одна точка/запятая (для площадей, высоты и т.п.) */
export function decimalOnly(text: string, maxLen = 8): string {
  let cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
  const parts = cleaned.split('.');
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
  return cleaned.slice(0, maxLen);
}
