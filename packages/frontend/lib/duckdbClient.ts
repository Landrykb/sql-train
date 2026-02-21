// @ts-nocheck
// packages/frontend/lib/duckdbClient.ts — UNUSED, kept for reference
// The app uses lib/sqlClient/browser.ts (sql.js) instead.
console.log('🦆 [duckdbClient] module loaded');

import { AsyncDuckDB, ConsoleLogger } from '@duckdb/duckdb-wasm';

let db: AsyncDuckDB | null = null;
let conn: Awaited<ReturnType<AsyncDuckDB['connect']>> | null = null;

async function ensureDB(): Promise<void> {
  console.log('🦆 [duckdbClient] ensureDB() called');
  if (db && conn) {
    console.log('🦆 [duckdbClient] already initialized');
    return;
  }
  console.log('🦆 [duckdbClient] instantiating worker + wasm…');
  const worker = new Worker('/duckdb-browser-mvp.worker.js', { type: 'module' });
  db = new AsyncDuckDB(new ConsoleLogger(), worker);
  await db.instantiate('/duckdb-mvp.wasm');
  conn = await db.connect();
  console.log('🦆 [duckdbClient] DuckDB instantiated');
}

export async function initDuckDB(): Promise<void> {
  await ensureDB();
}

export async function loadCSV(tableName: string, fileName: string): Promise<void> {
  await ensureDB();
  console.log(`🦆 [duckdbClient] registerFileURL('${fileName}') → '/datasets/${fileName}'`);
  await (db as any).registerFileURL(
    fileName,
    `/datasets/${fileName}`,
    null,
    false
  );
  console.log(`🦆 [duckdbClient] creating table "${tableName}" from CSV`);
  await (conn as any).query(`
    CREATE OR REPLACE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('${fileName}', HEADER=TRUE);
  `);
  // sanity check row count
  try {
    const cntRes: any = await (conn as any).query(`SELECT COUNT(*) AS cnt FROM ${tableName};`);
    const rows = await cntRes.toArray();
    console.log(`🦆 [duckdbClient] table "${tableName}" row count =`, rows[0][0]);
  } catch (e) {
    console.warn('🦆 [duckdbClient] failed to count rows:', e);
  }
}

export async function runQuery(
  sql: string
): Promise<{ columns: string[]; data: any[][] }> {
  await ensureDB();
  console.log('🦆 [duckdbClient] runQuery:', sql.trim());
  try {
    const result: any = await (conn as any).query(sql);
    const data: any[][] = await result.toArray();
    const cols: string[] = Array.isArray(result.columns)
      ? result.columns
      : (result.schema?.fields || []).map((f: any) => f.name);
    console.log(`🦆 [duckdbClient] runQuery → ${data.length} rows, columns:`, cols);
    return { columns: cols, data };
  } catch (err) {
    console.error('🦆 [duckdbClient] runQuery error:', err);
    return { columns: [], data: [] };
  }
}