import { generateId, maskPhone, getDigitsOnly } from './utils';

export type ParseResult =
  | { type: 'client'; data: any; confidence: number; raw: string }
  | { type: 'property'; data: any; confidence: number; raw: string };

function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, 'е');
}

function extractPhone(text: string): string {
  const m = text.match(/(?:\+?7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
  if (!m) return '';
  return maskPhone(getDigitsOnly(m[0]));
}

function extractMoney(text: string): number | null {
  const n = norm(text);
  // 5 млн / 5.5 млн / 12 миллионов
  let m = n.match(/(\d+[.,]?\d*)\s*(млн|миллион)/);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1_000_000);
  // 6500 тыс
  m = n.match(/(\d+[.,]?\d*)\s*(тыс)/);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1_000);
  // 6 500 000 or 6500000
  m = n.replace(/\s/g, '').match(/(\d{6,9})\s*(руб|р)?/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function extractRooms(text: string): string {
  const n = norm(text);
  if (/студи/.test(n)) return 'Студия';
  const m = n.match(/(\d)\s*[-–]?\s*(комн|к\.?\s*кв)/);
  if (m) return `${m[1]}-комнатная`;
  if (/\bоднушк/.test(n)) return '1-комнатная';
  if (/\bдвушк/.test(n)) return '2-комнатная';
  if (/\bтрешк|трёшк|трехкомн|трёхкомн/.test(n)) return '3-комнатная';
  return '';
}

function extractArea(text: string): number | null {
  const n = norm(text);
  const m = n.match(/(\d+[.,]?\d*)\s*(м²|м2|кв\.?\s*м)/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  return null;
}

function extractFloor(text: string): number | null {
  const n = norm(text);
  const m = n.match(/(\d+)\s*этаж/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function extractName(text: string): string {
  // Клиент Иванов / зовут Мария / имя Сергей
  let m = text.match(/(?:клиент|покупатель|зовут|имя)\s+([А-ЯЁA-Z][а-яёa-zА-ЯЁA-Z\-]+(?:\s+[А-ЯЁA-Z][а-яёa-z\.]+)?)/i);
  if (m) return m[1].trim();
  m = text.match(/([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ]\.?){0,2})/);
  if (m && !/Екатеринбург|Москва|Ленина/.test(m[1])) return m[1];
  return '';
}

function extractDistrict(text: string): string {
  const m = text.match(/(?:район[еу]?\s+)([А-ЯЁа-яёA-Za-z\-]+)/i);
  if (m) return m[1];
  const known = ['Центральный', 'Академический', 'Кировский', 'Чкаловский', 'Орджоникидзевский', 'Железнодорожный', 'Верх-Исетский'];
  for (const d of known) {
    if (norm(text).includes(norm(d))) return d;
  }
  return '';
}

function extractStreet(text: string): string {
  const m = text.match(/(?:ул\.?|улица)\s*([А-ЯЁа-яёA-Za-z0-9\-\s]+?)(?:,|$|\d\s*этаж)/i);
  if (m) return 'ул. ' + m[1].trim();
  return '';
}

function scoreClient(n: string): number {
  let s = 0;
  if (/клиент|покупател|риелтор.*звонил|хочет\s+купить|бюджет|телефон|позвон/.test(n)) s += 3;
  if (/имя|зовут/.test(n)) s += 2;
  if (/ищет|подбор|покаж/.test(n)) s += 2;
  if (/объект|квартир|прода[её]тся|лот/.test(n)) s -= 1;
  return s;
}

function scoreProperty(n: string): number {
  let s = 0;
  if (/объект|квартир|дом\b|студи|лот|прода[её]тся|сдам|аренда/.test(n)) s += 3;
  if (/комнат|этаж|м²|м2|кв\.?\s*м|адрес|улиц/.test(n)) s += 2;
  if (/цена|стоим|за\s+\d/.test(n)) s += 1;
  if (/клиент|покупател|бюджет\s+до/.test(n)) s -= 1;
  return s;
}

export function parseVoiceText(raw: string): ParseResult {
  const text = (raw || '').trim();
  const n = norm(text);
  const phone = extractPhone(text);
  const money = extractMoney(text);
  const rooms = extractRooms(text);
  const area = extractArea(text);
  const floor = extractFloor(text);
  const name = extractName(text);
  const district = extractDistrict(text);
  const street = extractStreet(text);

  const cScore = scoreClient(n) + (phone ? 2 : 0) + (name ? 1 : 0);
  const pScore = scoreProperty(n) + (area ? 1 : 0) + (rooms ? 1 : 0);

  if (cScore >= pScore) {
    const budget = money || 5_000_000;
    return {
      type: 'client',
      confidence: cScore,
      raw: text,
      data: {
        id: generateId(),
        name: name || 'Клиент из голоса',
        phone: phone || '',
        propertyType: /дом/.test(n) ? 'Дом' : 'Квартира',
        rooms: rooms || 'Не указано',
        budgetMin: Math.round(budget * 0.85),
        budgetMax: budget,
        district: district || 'Не указано',
        floorMin: 0,
        floorMax: floor || 0,
        requirements: text,
        status: 'Новый',
        lastContact: 'Только что',
        notes: '',
        shownProperties: [],
      },
    };
  }

  const price = money || 5_000_000;
  const titleParts = [rooms || '', street || district || ''].filter(Boolean);
  return {
    type: 'property',
    confidence: pScore,
    raw: text,
    data: {
      id: generateId(),
      title: titleParts.join(', ') || 'Объект из голоса',
      photos: [],
      city: 'Екатеринбург',
      district: district || 'Не указано',
      street: street || '',
      house: '',
      dealType: /аренд|сдам/.test(n) ? 'Аренда' : 'Продажа',
      category: /дом/.test(n) ? 'Дом' : 'Квартира',
      rooms: rooms || 'Не указано',
      price,
      areaTotal: area || 0,
      areaLiving: 0,
      areaKitchen: 0,
      floor: floor || 0,
      floorsTotal: 0,
      yearBuilt: 0,
      houseType: '',
      ceilings: 0,
      renovation: '',
      bathroom: '',
      balcony: '',
      furniture: '',
      windows: '',
      parking: '',
      elevator: '',
      heating: '',
      ownersCount: 1,
      ownershipBasis: '',
      ownershipYears: '',
      encumbrance: 'Нет',
      cadastral: '',
      readyToDeal: false,
      ownerName: '',
      ownerPhone: phone || '',
      linkCian: '',
      linkAvito: '',
      status: 'Активен',
      notes: text,
      negotiable: true,
      mortgage: false,
      matCapital: false,
    },
  };
}
