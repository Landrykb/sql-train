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
const loadedTables = new Set<string>();

/**
 * Initialize the in-memory SQL.js database.
 * Uses a singleton promise to prevent parallel init races.
 */
export async function initSQL(wasmPath: string = '/static/wasm/sql-wasm.wasm'): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      SQL = await initSqlJs({
        locateFile: (file: string) => {
          if (file !== 'sql-wasm.wasm') {
            throw new Error(`Unexpected WASM file requested: ${file}`);
          }
          return wasmPath;
        },
      } as any);

      db = new SQL.Database();
    } catch (error: unknown) {
      initPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize SQL.js: ${msg}`);
    }
  })();

  return initPromise;
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
    loadedTables.clear();
  } catch (e: unknown) {
    console.error(`Database reset failed: ${e}`);
  }
}

/**
 * Load a CSV into a fresh table named `tableName`.
 */
export async function loadCSV(tableName: string, fileName: string): Promise<void> {
  if (!db) {
    throw new Error('SQL not initialized. Call initSQL() first.');
  }

  // Skip if this table is already loaded in the current session
  if (loadedTables.has(tableName)) return;

  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  try {
    const resp = await fetch(`/datasets/${fileName}`);
    if (!resp.ok) {
      throw new Error(`Failed to fetch "${fileName}": ${resp.status} ${resp.statusText}`);
    }
    const text = await resp.text();
    const cleanText = text.trim().replace(/^\uFEFF/, '');

    const { data, meta, errors } = Papa.parse(cleanText, {
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

    const sanitizeColumnName = (name: string) =>
      name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1').slice(0, 64);

    const firstRow = data[0] || {};
    const colsDef = meta.fields.map((f: string) => {
      const sanitized = sanitizeColumnName(f);
      const value = firstRow[f];
      const type = typeof value === 'number' ? 'REAL' : 'TEXT';
      return `"${sanitized}" ${type}`;
    }).join(', ');

    db.exec(`DROP TABLE IF EXISTS "${tableName}";`);
    db.exec(`CREATE TABLE "${tableName}" (${colsDef});`);

    const placeholders = meta.fields.map(() => '?').join(', ');
    const insertSQL = `INSERT INTO "${tableName}" (${meta.fields.map(f => `"${sanitizeColumnName(f)}"`).join(', ')}) VALUES (${placeholders});`;

    const stmt = db.prepare(insertSQL);
    db.run('BEGIN TRANSACTION;');
    for (const row of data as Record<string, unknown>[]) {
      const vals = meta.fields!.map((f) => {
        const v = row[f];
        return v === undefined ? null : v;
      });
      stmt.run(vals);
    }
    db.run('COMMIT;');
    stmt.free();

    loadedTables.add(tableName);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load CSV "${fileName}": ${msg}`);
  }
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