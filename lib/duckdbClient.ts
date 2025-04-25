import { AsyncDuckDB, ConsoleLogger } from '@duckdb/duckdb-wasm';

export interface QueryResult {
  columns: string[];
  data: any[][];
}

let db: AsyncDuckDB | null = null;
let conn: Awaited<ReturnType<AsyncDuckDB['connect']>> | null = null;

async function ensureDB() {
  if (db) return;
  const worker = new Worker('/duckdb-browser-mvp.worker.js', { type: 'module' });
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
  await db!.registerFileURL(fileName, `/datasets/${fileName}`, null, false);
  await conn!.query(
    \`CREATE OR REPLACE TABLE \${tableName} AS
       SELECT * FROM read_csv_auto('\${fileName}', HEADER=TRUE);\`
  );
}

export async function runQuery(sql: string): Promise<QueryResult> {
  await ensureDB();
  try {
    const result = await conn!.query(sql);
    const data = await result.toArray();
    const columns = Array.isArray(result.columns) ? result.columns : [];
    return { columns, data };
  } catch (err) {
    console.error('runQuery error:', err);
    return { columns: [], data: [] };
  }
}
