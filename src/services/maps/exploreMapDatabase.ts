import * as SQLite from 'expo-sqlite';
import { EXPLORE_BUDGET_BYTES, isImageBytes, SOURCE_REVISION } from './exploreMapPlan';
import type { Coordinate } from './exploreMapPlan';

export interface ExploreRegion {
  revision: string;
  center: Coordinate;
  keys: string[];
  notified: boolean;
}

let database: Promise<SQLite.SQLiteDatabase> | undefined;
let writes: Promise<void> = Promise.resolve();
async function getDatabase() {
  if (!database) {
    database = (async () => {
      const db = await SQLite.openDatabaseAsync('trekgo_explore_maps.db');
      await db.execAsync(`
        PRAGMA auto_vacuum = INCREMENTAL;
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS explore_tiles (
          key TEXT PRIMARY KEY NOT NULL,
          data BLOB NOT NULL,
          byte_size INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          last_used INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS explore_tile_lru ON explore_tiles(last_used);
        CREATE TABLE IF NOT EXISTS explore_region (
          id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL
        );
      `);
      return db;
    })().catch(error => { database = undefined; throw error; });
  }
  return database;
}

export const exploreMapDatabase = {
  async get(key: string): Promise<Uint8Array | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ data: Uint8Array; expires_at: number }>(
      'SELECT data, expires_at FROM explore_tiles WHERE key = ?', key);
    if (!row) return null;
    const bytes = new Uint8Array(row.data);
    if (row.expires_at <= Date.now() || !isImageBytes(bytes)) {
      await db.runAsync('DELETE FROM explore_tiles WHERE key = ?', key);
      return null;
    }
    await db.runAsync('UPDATE explore_tiles SET last_used = ? WHERE key = ?', Date.now(), key);
    return bytes;
  },
  put(key: string, bytes: Uint8Array, expiresAt: number, protectedKeys: ReadonlySet<string>): Promise<void> {
    const write = writes.catch(() => {}).then(async () => {
      if (!isImageBytes(bytes) || bytes.byteLength > 2 * 1024 * 1024) throw new Error('Tile không hợp lệ.');
      const db = await getDatabase();
      const existing = await db.getFirstAsync<{ byte_size: number }>('SELECT byte_size FROM explore_tiles WHERE key = ?', key);
      const reserve = Math.max(0, bytes.byteLength - (existing?.byte_size ?? 0));
      // Reserve before writing, so a fully protected region cannot overrun the budget.
      await this.prune(new Set([...protectedKeys, key]), EXPLORE_BUDGET_BYTES - reserve);
      await db.runAsync(`INSERT OR REPLACE INTO explore_tiles
        (key, data, byte_size, expires_at, last_used) VALUES (?, ?, ?, ?, ?)`,
      key, bytes, bytes.byteLength, expiresAt, Date.now());
    });
    writes = write;
    return write;
  },
  async prune(protectedKeys: ReadonlySet<string>, budgetBytes = EXPLORE_BUDGET_BYTES) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM explore_tiles WHERE expires_at <= ?', Date.now());
    const total = await db.getFirstAsync<{ bytes: number }>('SELECT COALESCE(SUM(byte_size), 0) AS bytes FROM explore_tiles');
    let bytes = total?.bytes ?? 0;
    if (bytes > budgetBytes) {
      const rows = await db.getAllAsync<{ key: string; byte_size: number }>(
        'SELECT key, byte_size FROM explore_tiles ORDER BY last_used ASC');
      for (const row of rows) {
        if (bytes <= budgetBytes) break;
        if (protectedKeys.has(row.key)) continue;
        await db.runAsync('DELETE FROM explore_tiles WHERE key = ?', row.key);
        bytes -= row.byte_size;
      }
      if (bytes > budgetBytes) throw new Error('Vùng tải vượt giới hạn bộ nhớ 200 MiB.');
      await db.execAsync('PRAGMA incremental_vacuum(128);');
    }
  },
  async validKeys(): Promise<Set<string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string }>(
      'SELECT key FROM explore_tiles WHERE expires_at > ? AND key LIKE ?',
      Date.now(), `${SOURCE_REVISION}/%`);
    return new Set(rows.map(row => row.key));
  },
  async readRegion(): Promise<ExploreRegion | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM explore_region WHERE id = 1');
    if (!row) return null;
    try {
      const value = JSON.parse(row.json) as ExploreRegion;
      return Array.isArray(value.center) && Array.isArray(value.keys) && typeof value.revision === 'string' ? value : null;
    } catch { return null; }
  },
  async saveRegion(region: ExploreRegion) {
    const db = await getDatabase();
    await db.runAsync('INSERT OR REPLACE INTO explore_region (id, json) VALUES (1, ?)', JSON.stringify(region));
  },
};
