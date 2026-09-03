// @ts-nocheck
// packages/frontend/lib/duckdbClient.ts — UNUSED, kept for reference
// The app uses lib/sqlClient/browser.ts (sql.js) instead.
console.log('[duckdbClient] module loaded');

let db: any = null;
let conn: any = null;

async function ensureDB(): Promise<void> {
  if (db && conn) return;

  // lazy‐load the browser build at runtime
  const { AsyncDuckDB, ConsoleLogger } = await import(
    /* webpackChunkName: "duckdb-wasm" */
    '@duckdb/duckdb-wasm'
  );

  // instantiate against the files you placed in public/
  const worker = new Worker('/duckdb-browser-mvp.worker.js', {
    type: 'module',
  });
  db = new AsyncDuckDB(new ConsoleLogger(), worker);
  await db.instantiate('/duckdb-mvp.wasm');
  conn = await db.connect();
}

export async function initDuckDB(): Promise<void> {
  await ensureDB();
}

export async function loadCSV(
  tableName: string,
  fileName: string
): Promise<void> {
  await ensureDB();

  // tell DuckDB about your file
  await (db as any).registerFileURL(
    fileName,
    `/datasets/${fileName}`,
    null,
    false
  );

  console.log(`[duckdbClient] creating table "${tableName}" from CSV`);
  // use explicit read_csv (faster, more predictable than auto)
  await conn.query(`
    CREATE OR REPLACE TABLE ${tableName} AS
      SELECT * FROM read_csv(
        '${fileName}',
        HEADER=TRUE,
        DELIMITER=','
      );
  `);
}

export async function runQuery(
  sql: string
): Promise<{ columns: string[]; data: any[][] }> {
  await ensureDB();
  try {
    const result: any = await conn.query(sql);
    const data: any[][] = await result.toArray();
    const cols: string[] = Array.isArray(result.columns)
      ? result.columns
      : (result.schema?.fields || []).map((f: any) => f.name);
    return { columns: cols, data };
  } catch (err) {
    console.error('[duckdbClient] runQuery error', err);
    return { columns: [], data: [] };
  }
}