export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatPrice(price: number) {
  if (!price && price !== 0) return '—';
  return price.toLocaleString('ru-RU') + ' ₽';
}

export function formatPriceShort(price: number) {
  if (!price && price !== 0) return '—';
  if (price >= 1000000) return (price / 1000000).toFixed(1).replace('.', ',') + ' млн ₽';
  return Math.round(price / 1000) + ' тыс ₽';
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function isSameDay(iso: string, date: Date) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

export function maskPhone(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
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
