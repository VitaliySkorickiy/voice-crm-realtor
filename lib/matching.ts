/** Подбор объектов под клиента по бюджету, комнатам, району, этажу */
export function matchProperties(client: any, properties: any[]): any[] {
  if (!client || !Array.isArray(properties)) return [];
  return properties
    .map((p) => {
      let score = 0;
      const reasons: string[] = [];

      // budget
      if (client.budgetMax && p.price) {
        if (p.price >= (client.budgetMin || 0) && p.price <= client.budgetMax) {
          score += 3;
          reasons.push('в бюджете');
        } else if (p.price <= client.budgetMax * 1.1) {
          score += 1;
          reasons.push('чуть выше бюджета');
        }
      }
      // rooms
      if (client.rooms && p.rooms && client.rooms !== 'Не указано' && p.rooms !== 'Не указано') {
        if (String(client.rooms).toLowerCase().includes(String(p.rooms).toLowerCase().slice(0, 3)) ||
            String(p.rooms).toLowerCase().includes(String(client.rooms).toLowerCase().slice(0, 3))) {
          score += 2;
          reasons.push('комнатность');
        }
      }
      // district
      if (client.district && p.district && client.district !== 'Не указано' && p.district !== 'Не указано') {
        if (String(client.district).toLowerCase() === String(p.district).toLowerCase()) {
          score += 2;
          reasons.push('район');
        }
      }
      // floor
      if (client.floorMax && p.floor) {
        if (p.floor >= (client.floorMin || 1) && p.floor <= client.floorMax) {
          score += 1;
          reasons.push('этаж');
        }
      }

      return { property: p, score, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
