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

/**
 * Initialize the in-memory SQL.js database.
 */
export async function initSQL(wasmPath: string = '/static/wasm/sql-wasm.wasm'): Promise<void> {
  if (db) return;

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
    console.log('SQL.js initialized successfully');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize SQL.js: ${msg}`);
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
    console.log('Tables found:', tableNames);
    for (const table of tableNames) {
      console.log(`Dropping table "${table}"`);
      db.exec(`DROP TABLE IF EXISTS "${table}";`);
    }
    console.log('Database reset successfully');
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
    console.log(`Fetched CSV "${fileName}" (first 100 chars): ${cleanText.slice(0, 100)}`);

    const { data, meta, errors } = Papa.parse(cleanText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // <<-- parse numbers automatically
      transform: (value: string) => {
        if (value === '') return null;
        const trimmed = value.trim();
        const num = Number(trimmed);
        return isNaN(num) ? trimmed : num;
      },
    }) as ParseResult<Record<string, unknown>>;

    if (errors.length > 0) {
      console.warn(`Papa.parse errors for "${fileName}":`, errors);
    }

    console.log(`Parsed fields for "${fileName}":`, meta.fields);
    console.log(`Parsed data length: ${data.length}`);
    console.log(`First parsed row:`, data.length > 0 ? data[0] : 'No data rows');

    if (!meta.fields || meta.fields.length === 0) {
      throw new Error(`CSV "${fileName}" has no valid header row.`);
    }

    const sanitizeColumnName = (name: string) =>
      name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1').slice(0, 64);

    // Now when creating table, decide REAL or TEXT dynamically:
    const firstRow = data[0] || {};
    const colsDef = meta.fields.map((f: string) => {
      const sanitized = sanitizeColumnName(f);
      const value = firstRow[f];
      const type = typeof value === 'number' ? 'REAL' : 'TEXT';
      return `"${sanitized}" ${type}`;
    }).join(', ');

    console.log(`Columns definition: ${colsDef}`);

    db.exec(`DROP TABLE IF EXISTS "${tableName}";`);
    db.exec(`CREATE TABLE "${tableName}" (${colsDef});`);

    const placeholders = meta.fields.map(() => '?').join(', ');
    const insertSQL = `INSERT INTO "${tableName}" (${meta.fields.map(f => `"${sanitizeColumnName(f)}"`).join(', ')}) VALUES (${placeholders});`;
    console.log(`INSERT query: ${insertSQL}`);

    let insertedRows = 0;
    try {
      const stmt = db.prepare(insertSQL);
      db.run('BEGIN TRANSACTION;');
      (data as Record<string, unknown>[]).forEach((row, index) => {
        const vals = meta.fields!.map((f) => {
          const v = row[f];
          return v === undefined ? null : v;
        });

        if (vals.length !== meta.fields!.length) {
          console.error(`Row ${index} mismatch`, vals);
          throw new Error(`Invalid row ${index}: column count mismatch`);
        }

        stmt.run(vals);
        insertedRows++;
      });
      db.run('COMMIT;');
      stmt.free();
      console.log(`Successfully inserted ${insertedRows} rows into "${tableName}"`);
    } catch (e: unknown) {
      console.error(`INSERT transaction failed after ${insertedRows} rows`);
      db.run('ROLLBACK;');
      throw new Error(`INSERT transaction failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    const countRes = db.exec(`SELECT COUNT(*) AS count FROM "${tableName}";`);
    const rowCount = countRes[0].values[0][0];
    console.log(`Row count in "${tableName}": ${rowCount}`);
    if (rowCount !== data.length) {
      console.warn(`Row count mismatch: inserted ${rowCount} rows, expected ${data.length}`);
    }

    const colRes = db.exec(`PRAGMA table_info("${tableName}");`);
    const columns = colRes[0].values.map((row: any[]) => row[1]);
    console.log(`Columns in "${tableName}":`, columns);

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
    console.log(`Executing query: ${cleanedSql} with params: ${JSON.stringify(params)}`);
    const result = db.exec(cleanedSql, params);
    if (result.length === 0) {
      console.log('Query returned no results');
      return { columns: [], data: [] };
    }
    const { columns, values } = result[0];
    console.log(`Query result: ${values.length} rows`);
    return { columns, data: values };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Query failed: ${cleanedSql} - Error: ${msg}`);
    throw new Error(`Query failed: ${msg}`);
  }
}