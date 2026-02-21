export function initDuckDB(): Promise<void>;
export function loadCSV(tableName: string, fileName: string): Promise<void>;
export function runQuery(sql: string): Promise<any>;