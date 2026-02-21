import initSqlJs from 'sql.js';
import Papa from 'papaparse';

// Define ParseResult for consistency
interface ParseResult<T> {
  data: T[];
  errors: Array<{ message: string; row: number }>;
  meta: {
    fields?: string[];
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
  };
}

let SQL: any = null;
let db: any = null;
let initPromise: Promise<void> | null = null;
const loadingTables = new Map<string, Promise<void>>();

/**
 * Initialize the in-memory SQL.js database.
 * Uses a singleton promise to prevent parallel init races.
 */
export async function initSQL(): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      SQL = await initSqlJs({
        locateFile: () => '/static/wasm/sql-wasm.wasm',
      } as any);

      db = new SQL.Database();
      console.log('[SQL] WASM initialized');
    } catch (error: unknown) {
      initPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize SQL.js: ${msg}`);
    }
  })();

  return initPromise;
}

function tableExists(name: string): boolean {
  try {
    db.exec(`SELECT 1 FROM "${name}" LIMIT 1;`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset the database by dropping all tables.
 */
export async function resetDatabase(): Promise<void> {
  if (!db) {
    throw new Error('SQL not initialized. Call initSQL() first.');
  }
  try {
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = tables.length > 0 ? tables[0].values.map((row: [string]) => row[0]) : [];
    for (const table of tableNames) {
      db.exec(`DROP TABLE IF EXISTS "${table}";`);
    }
    loadingTables.clear();
  } catch (e: unknown) {
    console.error(`Database reset failed: ${e}`);
  }
}

/**
 * Load a CSV into a table. Uses per-table promise dedup to prevent races.
 */
export async function loadCSV(tableName: string, fileName: string): Promise<void> {
  if (!db) {
    throw new Error('SQL not initialized. Call initSQL() first.');
  }

  // If table already exists in DB, skip
  if (tableExists(tableName)) {
    console.log(`[SQL] table "${tableName}" already in DB, skipping`);
    return;
  }

  // If another call is already loading this table, wait for it
  const existing = loadingTables.get(tableName);
  if (existing) {
    console.log(`[SQL] waiting for in-progress load of "${tableName}"`);
    return existing;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const promise = (async () => {
    try {
      const url = fileName.startsWith('/datasets/') ? fileName : `/datasets/${fileName}`;
      console.log(`[SQL] fetching ${url}...`);
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch "${fileName}": ${resp.status} ${resp.statusText}`);
      }
      const text = await resp.text();
      const cleanText = text.trim().replace(/^\uFEFF/, '');
      console.log(`[SQL] parsing ${fileName} (${cleanText.length} chars)...`);

      const { data, meta } = Papa.parse(cleanText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        transform: (value: string) => {
          if (value === '') return null;
          const trimmed = value.trim();
          const num = Number(trimmed);
          return isNaN(num) ? trimmed : num;
        },
      }) as ParseResult<Record<string, unknown>>;

      if (!meta.fields || meta.fields.length === 0) {
        throw new Error(`CSV "${fileName}" has no valid header row.`);
      }

      const sanitize = (name: string) =>
        name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1').slice(0, 64);

      const firstRow = data[0] || {};
      const colsDef = meta.fields.map((f: string) => {
        const value = firstRow[f];
        return `"${sanitize(f)}" ${typeof value === 'number' ? 'REAL' : 'TEXT'}`;
      }).join(', ');

      db.exec(`DROP TABLE IF EXISTS "${tableName}";`);
      db.exec(`CREATE TABLE "${tableName}" (${colsDef});`);

      const placeholders = meta.fields.map(() => '?').join(', ');
      const insertSQL = `INSERT INTO "${tableName}" (${meta.fields.map(f => `"${sanitize(f)}"`).join(', ')}) VALUES (${placeholders});`;

      const stmt = db.prepare(insertSQL);
      try {
        db.run('BEGIN TRANSACTION;');
        for (const row of data as Record<string, unknown>[]) {
          stmt.run(meta.fields!.map((f) => row[f] === undefined ? null : row[f]));
        }
        db.run('COMMIT;');
      } catch (insertErr) {
        try { db.run('ROLLBACK;'); } catch { /* ignore */ }
        throw insertErr;
      } finally {
        stmt.free();
      }

      console.log(`[SQL] loaded "${tableName}" (${data.length} rows)`);
    } catch (error: unknown) {
      loadingTables.delete(tableName);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load CSV "${fileName}": ${msg}`);
    }
  })();

  loadingTables.set(tableName, promise);
  return promise;
}

/**
 * Run an arbitrary SQL query and return its columns + rows.
 */
export async function runQuery(sql: string, params: any[] = []): Promise<{ columns: string[]; data: any[][] }> {
  if (!db) {
    throw new Error('SQL not initialized. Call initSQL() first.');
  }

  const cleanedSql = sql.replace(/\)\s*;*$/, ');').replace(/;;+/g, ';');

  try {
    const result = db.exec(cleanedSql, params);
    if (result.length === 0) {
      return { columns: [], data: [] };
    }
    const { columns, values } = result[0];
    return { columns, data: values };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Query failed: ${msg}`);
  }
}