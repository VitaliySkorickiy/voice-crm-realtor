import * as SQLite from 'expo-sqlite';

export type DbPayload = {
  clients: any[];
  properties: any[];
  tasks: any[];
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('voicecrm.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS properties (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

function parseRows(rows: { id: string; data: string }[]): any[] {
  const out: any[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.data));
    } catch (e) {
      console.log('SQLite parse error', row.id, e);
    }
  }
  return out;
}

export async function loadDB(): Promise<DbPayload | null> {
  try {
    const db = await getDb();
    const clients = await db.getAllAsync<{ id: string; data: string }>('SELECT id, data FROM clients');
    const properties = await db.getAllAsync<{ id: string; data: string }>('SELECT id, data FROM properties');
    const tasks = await db.getAllAsync<{ id: string; data: string }>('SELECT id, data FROM tasks');

    const payload: DbPayload = {
      clients: parseRows(clients),
      properties: parseRows(properties),
      tasks: parseRows(tasks),
    };

    const initialized = await isInitialized();
    if (
      !initialized &&
      payload.clients.length === 0 &&
      payload.properties.length === 0 &&
      payload.tasks.length === 0
    ) {
      return null;
    }
    return payload;
  } catch (e) {
    console.log('DB load error:', e);
    return null;
  }
}

export async function saveDB(data: DbPayload): Promise<void> {
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM clients; DELETE FROM properties; DELETE FROM tasks;');

      for (const c of data.clients || []) {
        if (!c?.id) continue;
        await db.runAsync('INSERT OR REPLACE INTO clients (id, data) VALUES (?, ?)', c.id, JSON.stringify(c));
      }
      for (const p of data.properties || []) {
        if (!p?.id) continue;
        await db.runAsync('INSERT OR REPLACE INTO properties (id, data) VALUES (?, ?)', p.id, JSON.stringify(p));
      }
      for (const t of data.tasks || []) {
        if (!t?.id) continue;
        await db.runAsync('INSERT OR REPLACE INTO tasks (id, data) VALUES (?, ?)', t.id, JSON.stringify(t));
      }

      await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'initialized', '1');
    });
  } catch (e) {
    console.log('DB save error:', e);
  }
}

export async function isInitialized(): Promise<boolean> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'initialized'"
    );
    return row?.value === '1';
  } catch {
    return false;
  }
}

export async function clearDB(): Promise<void> {
  try {
    const db = await getDb();
    await db.execAsync(`
      DELETE FROM clients;
      DELETE FROM properties;
      DELETE FROM tasks;
      DELETE FROM meta;
    `);
  } catch (e) {
    console.log('DB clear error:', e);
  }
}
