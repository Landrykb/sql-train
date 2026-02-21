// packages/frontend/lib/sqlClient.ts

import initSqlJs from 'sql.js';
import Papa from 'papaparse';

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

/**
 * Initialize the in-memory SQL.js database.
 */
export async function initSQL(): Promise<void> {
  if (db) return;
  SQL = await initSqlJs({
    locateFile: () => '/static/wasm/sql-wasm.wasm',
  } as any);
  db = new SQL.Database();
}

/**
 * Drop all tables in the in-memory database.
 */
export async function resetDatabase(): Promise<void> {
  if (!db) throw new Error('SQL not initialized. Call initSQL() first.');
  const list = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table';"
  );
  if (list.length === 0) return;
  const tables: string[] = list[0].values.map((r: [string]) => r[0]);
  for (const t of tables) {
    db.exec(`DROP TABLE IF EXISTS "${t}";`);
  }
}

/**
 * Load a CSV from /datasets/ into a fresh table.
 */
export async function loadCSV(
  tableName: string,
  fileName: string
): Promise<void> {
  if (!db) throw new Error('SQL not initialized. Call initSQL() first.');
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const resp = await fetch(`/datasets/${fileName}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch "${fileName}": ${resp.statusText}`);
  }
  const text = (await resp.text()).trim().replace(/^\uFEFF/, '');
  const { data, meta, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transform: (v: string) =>
      v === '' ? null : isNaN(Number(v)) ? v : Number(v),
  }) as ParseResult<Record<string, unknown>>;

  if (errors.length) console.warn('CSV parse errors:', errors);
  if (!meta.fields?.length) {
    throw new Error(`CSV "${fileName}" has no header row.`);
  }

  // Sanitize & infer column types
  const sanitize = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1')
      .slice(0, 64);
  const sample = data[0] || {};
  const colsDef = meta.fields
    .map(
      (f) =>
        `"${sanitize(f)}" ${typeof sample[f] === 'number' ? 'REAL' : 'TEXT'}`
    )
    .join(', ');

  db.exec(`DROP TABLE IF EXISTS "${tableName}";`);
  db.exec(`CREATE TABLE "${tableName}" (${colsDef});`);

  const placeholders = meta.fields.map(() => '?').join(', ');
  const insertSQL = `INSERT INTO "${tableName}" (${meta.fields
    .map((f) => `"${sanitize(f)}"`)
    .join(', ')}) VALUES (${placeholders});`;

  const stmt = db.prepare(insertSQL);
  db.run('BEGIN TRANSACTION;');
  for (const row of data) {
    const vals = meta.fields.map((f) => (row[f] === undefined ? null : row[f]));
    stmt.run(vals);
  }
  db.run('COMMIT;');
  stmt.free();
}

/**
 * Execute a SQL query and return columns + values.
 */
export async function runQuery(
  sql: string,
  params: any[] = []
): Promise<{ columns: string[]; data: any[][] }> {
  if (!db) throw new Error('SQL not initialized. Call initSQL() first.');
  const cleaned = sql.replace(/\)\s*;*$/, ');').replace(/;;+/g, ';');
  const res = db.exec(cleaned, params);
  if (!res.length) return { columns: [], data: [] };
  return { columns: res[0].columns, data: res[0].values };
}