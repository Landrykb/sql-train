'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { BleepxFace } from '@/components/BleepxIcons';
import { CheckBadge, AlertIcon, ToolsIcon, RocketIcon, ChartBarIcon, UploadIcon, RefreshIcon, BulbIcon } from '@/components/AppIcons';
import { getKaggleInfo } from '@/lib/kaggleDatasets';
import { getDataWorldInfo } from '@/lib/dataWorldDatasets';
import { PIPELINE_PRESETS, DEFAULT_PYTHON } from '@/lib/cloud/pipelinePresets';
import { initSQL, loadCSVString, runQuery } from '@/lib/sqlClient/browser';
import { getSqlErrorHelp } from '@/lib/sqlErrorHelper';
import { getPyErrorHelp } from '@/lib/pyErrorHelper';
import { loadPyodide, runPythonCode } from '@/lib/pyodideRuntime';
import type { BleepxHint } from '@/lib/bleepxLinter';
import {
  createEmptySandboxState,
  loadSandboxState,
  saveSandboxState,
  clearSandboxState,
  type CloudSandboxState,
} from '@/lib/cloud/sandbox';
import { createS3Bucket, putS3Object } from '@/lib/cloud/sandboxActions';

// ─── Types ───────────────────────────────────────────────────────────────────

type PipelineStep = 'extract' | 'sql' | 'python' | 'csv' | 's3';

interface PipelineState {
  sourceUrl: string;
  rawCsv: string;
  sqlQuery: string;
  sqlResult: string;
  pythonCode: string;
  transformedCsv: string;
  s3Bucket: string;
  s3Key: string;
  activeStep: PipelineStep;
  sqlCell?: number;
  pythonCell?: number;
}

const DEFAULT_QUERY = `SELECT *
FROM dataset
LIMIT 10;`;

const GENERIC_SQL_HINTS = [
  'Try filtering rows with WHERE, e.g. WHERE year >= 2015.',
  'Group results with GROUP BY and use COUNT, SUM, AVG, MIN or MAX.',
  'Compare periods by selecting year ranges and ordering by a calculated column.',
  'Add a meaningful alias so the output column is easy to read, e.g. SELECT country_name, value AS co2_kt.',
];

const GENERIC_PYTHON_HINTS = [
  "Inspect the data first with print(df.head()) and print(df.columns).",
  "Create a derived column: df['new_col'] = df['value'] * 2.",
  "Filter rows: df = df[df['year'] >= 2015].",
  "Aggregate: print(df.groupby('country_name')['value'].mean()).",
  "Always end with print(df.to_csv(index=False)) so the next step receives a CSV.",
];

interface DataColumn {
  name: string;
  type: 'numeric' | 'date' | 'categorical' | 'text';
  sample?: unknown;
}

function normalizeCsv(csv: string): string {
  const text = csv.trim();
  if (!text) return csv;
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const fields = parsed.meta.fields || [];
  if (fields.length === 0 || parsed.data.length === 0) return csv;
  return Papa.unparse({ fields, data: parsed.data });
}

function analyzeCsv(csv: string): DataColumn[] {
  const text = csv.trim();
  if (!text) return [];
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    preview: 100,
    transformHeader: (h) => h.trim(),
  });
  const fields = parsed.meta.fields || [];
  if (fields.length === 0 || parsed.data.length === 0) return [];
  return fields.map((name) => {
    const values = parsed.data.map((row) => row[name]).filter((v) => v !== '' && v != null);
    const nonNull = values.slice(0, 30);
    const unique = new Set(nonNull);
    const isNumeric = nonNull.length > 0 && nonNull.every((v) => typeof v === 'number');
    const isDate = !isNumeric && nonNull.length > 0 && nonNull.every((v) => /^\d{4}-\d{2}-\d{2}/.test(String(v)));
    const isCategorical = !isNumeric && !isDate && unique.size > 1 && unique.size <= Math.min(8, nonNull.length);
    return {
      name,
      type: isNumeric ? 'numeric' : isDate ? 'date' : isCategorical ? 'categorical' : 'text',
      sample: nonNull[0],
    };
  });
}

function formatLiteral(value: unknown): string {
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '?';
}

function generateHints(rawCsv: string, sqlResult: string): { sql: string[]; python: string[]; columns: DataColumn[] } {
  const input = sqlResult || rawCsv;
  const cols = analyzeCsv(input);
  if (cols.length === 0) {
    return { sql: GENERIC_SQL_HINTS, python: GENERIC_PYTHON_HINTS, columns: [] };
  }
  const numeric = cols.filter((c) => c.type === 'numeric').slice(0, 3);
  const categorical = cols.filter((c) => c.type === 'categorical').slice(0, 3);
  const text = cols.filter((c) => c.type === 'text' || c.type === 'date').slice(0, 2);
  const date = cols.filter((c) => c.type === 'date').slice(0, 1);
  const groupCol = categorical[0] || text[0];
  const sql: string[] = [];
  const python: string[] = [];

  sql.push('Use SELECT * FROM dataset LIMIT 10 to preview the table.');
  python.push("Inspect the data first with print(df.head()) and print(df.columns).");

  if (numeric.length) {
    const n = numeric[0].name;
    sql.push(`Filter rows where ${n} is above average: WHERE ${n} > (SELECT AVG(${n}) FROM dataset).`);
    sql.push(`Order by ${n} DESC and add LIMIT 10 to see the top rows.`);
    python.push(`Create a derived column: df['scaled_${n}'] = df['${n}'] * 2.`);
    python.push(`Filter rows: df = df[df['${n}'] >= df['${n}'].mean()].`);
  }

  if (groupCol) {
    const cat = groupCol.name;
    sql.push(`Group by ${cat} and use COUNT(*), AVG, MIN or MAX.`);
    if (numeric.length) {
      sql.push(`Group by ${cat} and compute AVG(${numeric[0].name}) with a meaningful alias.`);
      python.push(`Aggregate: print(df.groupby('${cat}')['${numeric[0].name}'].mean()).`);
      python.push(`Plot a bar chart: df.groupby('${cat}')['${numeric[0].name}'].mean().plot(kind='bar')`);
    }
    if (groupCol.sample != null) {
      sql.push(`Filter by a category: WHERE ${cat} = ${formatLiteral(groupCol.sample)}.`);
    }
  }

  if (date.length) {
    const d = date[0].name;
    sql.push(`Filter by date: WHERE ${d} >= '2020-01-01'.`);
  }

  python.push("Always end with print(df.to_csv(index=False)) so the next step receives a CSV.");

  return { sql, python, columns: cols };
}

function generatePythonStarter(rawCsv: string, sqlResult: string): string {
  const input = sqlResult || rawCsv;
  const cols = analyzeCsv(input);
  const numeric = cols.filter((c) => c.type === 'numeric').slice(0, 3);
  const categorical = cols.filter((c) => c.type === 'categorical' || c.type === 'text' || c.type === 'date').slice(0, 3);
  const date = cols.filter((c) => c.type === 'date').slice(0, 1);
  const groupCol = categorical[0] || (cols.find((c) => c.name.toLowerCase().includes('name') || c.name.toLowerCase().includes('id')) ?? cols[0]);
  const colList = cols.map((c) => c.name).join(', ') || '...';

  let body = `# Columns available: ${colList}\n`;

  if (numeric.length) {
    const n = numeric[0].name;
    body += `\n# Derived column example\ndf['scaled_${n}'] = df['${n}'] * 2\n`;
    if (numeric[1]) {
      body += `df['${n}_per_${numeric[1].name}'] = df['${n}'] / df['${numeric[1].name}'].replace(0, float('nan'))\n`;
    }
    body += `\n# Filter to above-average rows\ndf = df[df['${n}'] >= df['${n}'].mean()]\n`;
  }

  if (date.length) {
    const d = date[0].name;
    body += `\n# Filter by date example\n# df = df[df['${d}'] >= '2020-01-01']\n`;
  }

  if (groupCol && numeric.length) {
    const cat = groupCol.name;
    body += `\n# Aggregate and plot\nprint(df.groupby('${cat}')['${numeric[0].name}'].mean())\ndf.groupby('${cat}')['${numeric[0].name}'].mean().plot(kind='bar')\n`;
  } else if (groupCol) {
    body += `\n# Count categories\nprint(df['${groupCol.name}'].value_counts())\n`;
  }

  return `import pandas as pd
import matplotlib.pyplot as plt
from io import StringIO

# Use the SQL result if it exists, otherwise the original raw CSV
input_csv = sql_result if 'sql_result' in globals() and sql_result else raw_csv
df = pd.read_csv(StringIO(input_csv))

${body}
# Print the final CSV so it can continue to S3
print(df.to_csv(index=False))`;
}

function extractLastCsv(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const blocks = trimmed.split(/\n\s*\n/).filter(Boolean);
  for (let i = blocks.length - 1; i >= 0; i--) {
    const candidate = blocks[i].trim();
    const parsed = Papa.parse<Record<string, unknown>>(candidate, { header: true, skipEmptyLines: true, dynamicTyping: true });
    if (parsed.errors.length === 0 && parsed.meta.fields && parsed.meta.fields.length > 0 && parsed.data.length > 0) {
      const expected = parsed.meta.fields.length;
      const consistent = parsed.data.every((row) => Object.keys(row).length === expected);
      if (consistent) return candidate;
    }
  }
  return trimmed;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CsvOutput({ csv, cell, title }: { csv: string; cell?: number; title: string }) {
  const parsed = React.useMemo(() => {
    const text = csv.trim();
    if (!text) return null;
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
    const fields = result.meta.fields || [];
    if (result.errors.length > 0 || fields.length === 0) {
      return { raw: true as const, text };
    }
    return { raw: false as const, headers: fields, rows: result.data.slice(0, 20) };
  }, [csv]);

  return (
    <div className="mt-3 rounded-lg border border-gray-700 overflow-hidden bg-gray-950">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-700 text-xs font-mono">
        <span className="text-emerald-400 font-bold">Out[{cell ?? ' '}]</span>
        <span className="text-gray-400">{title}</span>
      </div>
      {parsed ? (
        parsed.raw ? (
          <pre className="p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-words max-w-full">{parsed.text}</pre>
        ) : (
          <div className="overflow-x-auto max-w-full max-h-80">
            <table className="w-full text-xs font-mono">
              <thead className="bg-gray-900 text-gray-300 sticky top-0">
                <tr>
                  {parsed.headers.map((h, i) => (
                    <th key={i} className="px-2 py-1 text-left border-b border-gray-700 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {parsed.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0 even:bg-gray-900/30">
                    {parsed.headers.map((h, j) => (
                      <td key={j} className="px-2 py-1 whitespace-nowrap">{String((row as Record<string, unknown>)[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <pre className="p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-words max-w-full">{csv}</pre>
      )}
    </div>
  );
}

function ImageOutput({ images, cell, title }: { images: Array<{ mime: string; data: string }>; cell?: number; title: string }) {
  if (!images.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-gray-700 overflow-hidden bg-gray-950">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-700 text-xs font-mono">
        <span className="text-emerald-400 font-bold">Out[{cell ?? ' '}]</span>
        <span className="text-gray-400">{title}</span>
      </div>
      <div className="p-3 flex flex-wrap gap-3">
        {images.map((img, i) => (
          <img
            key={i}
            src={`data:${img.mime};base64,${img.data}`}
            alt={`Plot ${i + 1}`}
            className="max-w-full h-auto rounded border border-gray-700"
          />
        ))}
      </div>
    </div>
  );
}

function ConsoleOutput({ text, cell, title }: { text: string; cell?: number; title: string }) {
  if (!text.trim()) return null;
  return (
    <div className="mt-3 rounded-lg border border-gray-700 overflow-hidden bg-gray-950">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-700 text-xs font-mono">
        <span className="text-emerald-400 font-bold">Out[{cell ?? ' '}]</span>
        <span className="text-gray-400">{title}</span>
      </div>
      <pre className="p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-words max-w-full">{text}</pre>
    </div>
  );
}

function StatusLog({ logs, onClear }: { logs: string[]; onClear: () => void }) {
  if (!logs.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-sky-200 dark:border-sky-800 overflow-hidden bg-sky-50 dark:bg-sky-900/10">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-sky-100 dark:bg-sky-900/20 border-b border-sky-200 dark:border-sky-800 text-xs font-mono">
        <span className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1"><BleepxFace size={14} /> Bleepx status log</span>
        <button onClick={onClear} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">Clear</button>
      </div>
      <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="text-xs text-sky-700 dark:text-sky-300 break-words">{log}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CloudPipelineCanvas() {
  const [pipeline, setPipeline] = useState<PipelineState>({
    sourceUrl: '',
    rawCsv: '',
    sqlQuery: DEFAULT_QUERY,
    sqlResult: '',
    pythonCode: generatePythonStarter('', ''),
    transformedCsv: '',
    s3Bucket: 'bleepx-pipeline-output',
    s3Key: 'output.csv',
    activeStep: 'extract',
  });
  const [execCount, setExecCount] = useState(0);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [pythonLoading, setPythonLoading] = useState(false);
  const [pythonImages, setPythonImages] = useState<Array<{ mime: string; data: string }>>([]);
  const [pythonConsole, setPythonConsole] = useState<string>('');
  const [sqlHintIdx, setSqlHintIdx] = useState(-1);
  const [pythonHintIdx, setPythonHintIdx] = useState(-1);
  const pyodideRef = useRef<any>(null);
  const lastGeneratedPython = useRef<string>(generatePythonStarter('', ''));

  const [sandbox, setSandbox] = useState<CloudSandboxState>(createEmptySandboxState());
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 25));
  }, []);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [lastSqlError, setLastSqlError] = useState<{ message: string; query: string } | null>(null);
  const [lastPythonError, setLastPythonError] = useState<{ message: string; code: string } | null>(null);
  const [pythonSource, setPythonSource] = useState<'auto' | 'sql' | 'raw'>('auto');

  const activeRawCsv = useMemo(() => normalizeCsv(pipeline.rawCsv), [pipeline.rawCsv]);
  const effectivePythonCode = useMemo(
    () => generatePythonStarter(activeRawCsv, pythonSource === 'raw' ? '' : pipeline.sqlResult),
    [activeRawCsv, pipeline.sqlResult, pythonSource]
  );
  const { sql: sqlHints, python: pythonHints, columns: dataColumns } = useMemo(
    () => generateHints(activeRawCsv, pipeline.sqlResult),
    [activeRawCsv, pipeline.sqlResult]
  );

  useEffect(() => {
    if (
      pipeline.pythonCode === lastGeneratedPython.current ||
      pipeline.pythonCode === '' ||
      pipeline.pythonCode === DEFAULT_PYTHON
    ) {
      setPipeline((p) => ({ ...p, pythonCode: effectivePythonCode }));
    }
    lastGeneratedPython.current = effectivePythonCode;
  }, [effectivePythonCode]);

  const loadPreset = useCallback((id: string) => {
    const preset = PIPELINE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const clean = normalizeCsv(preset.rawCsv);
    const starter = generatePythonStarter(clean, '');
    setPythonSource('auto');
    setPipeline((p) => ({
      ...p,
      sourceUrl: preset.sourceUrl,
      rawCsv: clean,
      sqlQuery: preset.sqlQuery,
      pythonCode: starter,
      s3Key: preset.s3Key,
      s3Bucket: 'bleepx-pipeline-output',
      activeStep: 'sql',
    }));
    lastGeneratedPython.current = starter;
    setSelectedPresetId(id);
    addLog(`Loaded "${preset.name}" with ${clean.split('\n').length - 1} data row(s). Source: ${preset.sourceUrl}. Run SQL preview next.`);
  }, []);

  useEffect(() => {
    const saved = loadSandboxState();
    if (saved) setSandbox(saved);
  }, []);

  useEffect(() => {
    saveSandboxState(sandbox);
  }, [sandbox]);

  const sourceInfo = useMemo(() => {
    return getKaggleInfo(pipeline.sourceUrl) || getDataWorldInfo(pipeline.sourceUrl);
  }, [pipeline.sourceUrl]);

  const loadSample = useCallback((csv: string) => {
    const clean = normalizeCsv(csv);
    const starter = generatePythonStarter(clean, '');
    setPythonSource('auto');
    setPipeline((p) => ({ ...p, rawCsv: clean, pythonCode: starter, activeStep: 'sql' }));
    lastGeneratedPython.current = starter;
    addLog('CSV loaded into the pipeline. Run SQL or Python next.');
  }, []);

  const runSql = useCallback(async () => {
    if (!pipeline.rawCsv.trim()) {
      addLog('Paste or load a CSV first, then run SQL.');
      return;
    }
    setSqlLoading(true);
    addLog('Running SQL on the in-browser database…');
    const nextCell = execCount + 1;
    try {
      await initSQL();
      await loadCSVString('dataset', pipeline.rawCsv);
      const { columns, data } = await runQuery(pipeline.sqlQuery || DEFAULT_QUERY);
      const csv = Papa.unparse({ fields: columns, data });
      setExecCount(nextCell);
      setLastSqlError(null);
      setPythonSource('auto');
      setPipeline((p) => ({ ...p, sqlResult: csv, sqlCell: nextCell, activeStep: 'python' }));
      const cols = columns.join(', ');
      addLog(
        `SQL returned ${data.length} row(s) with columns: ${cols}. ` +
        `Try filtering, grouping, or adding a calculated column. Then run Python to transform the result before S3.`
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      setLastSqlError({ message: msg, query: pipeline.sqlQuery || DEFAULT_QUERY });
      addLog(`SQL error: ${msg}`);
    } finally {
      setSqlLoading(false);
    }
  }, [pipeline.rawCsv, pipeline.sqlQuery, execCount]);

  const runPython = useCallback(async () => {
    if (!pipeline.rawCsv.trim()) {
      addLog('Paste or load a CSV first, then run Python.');
      return;
    }
    setPythonLoading(true);
    addLog('Loading Python runtime…');
    setPythonImages([]);
    setPythonConsole('');
    const nextCell = execCount + 1;
    try {
      if (!pyodideRef.current) {
        pyodideRef.current = await loadPyodide((msg) => addLog(msg));
      }
      const { stdout, stderr, images } = await runPythonCode(pyodideRef.current, {
        code: pipeline.pythonCode || effectivePythonCode,
        globals: { raw_csv: activeRawCsv, sql_result: pipeline.sqlResult || '' },
        timeoutMs: 30000,
        onProgress: (msg) => addLog(msg),
      });
      const combined = stderr ? `${stdout}\n${stderr}` : stdout;
      const csvOut = extractLastCsv(stdout);
      const preview = Papa.parse(csvOut, { header: true, skipEmptyLines: true });
      const rows = preview.data.length;
      const cols = preview.meta.fields?.length ?? 0;
      const colList = preview.meta.fields?.join(', ') ?? '';
      setExecCount(nextCell);
      setLastPythonError(null);
      setPythonImages(images || []);
      setPythonConsole(combined.trim());
      setPipeline((p) => ({ ...p, transformedCsv: csvOut, pythonCell: nextCell, activeStep: 'csv' }));
      addLog(
        `Python produced ${rows} row(s) and ${cols} column(s)${colList ? `: ${colList}` : ''}. ` +
        `You can now upload the CSV to the S3 sandbox, or tweak the code and run again.`
      );
    } catch (err: any) {
      const detail = err?.stdout ? `${err.stdout}\n${err.message}` : err?.message || String(err);
      setLastPythonError({ message: detail, code: pipeline.pythonCode });
      setPythonImages(err?.images || []);
      setPythonConsole(detail.trim());
      setPipeline((p) => ({ ...p, transformedCsv: '', pythonCell: nextCell, activeStep: 'csv' }));
      addLog(`Python error: ${err?.message || String(err)}`);
    } finally {
      setPythonLoading(false);
    }
  }, [pipeline.rawCsv, pipeline.pythonCode, pipeline.sqlResult, activeRawCsv, effectivePythonCode, execCount]);

  const buildBleepxHint = useCallback((): BleepxHint => {
    if (lastPythonError) {
      const help = getPyErrorHelp(lastPythonError.message, lastPythonError.code);
      const keyMatch = lastPythonError.message.match(/KeyError:\s*['"]([^'"]+)['"]/);
      if (keyMatch && pipeline.sqlResult) {
        const key = keyMatch[1];
        const sqlCols = analyzeCsv(pipeline.sqlResult).map((c) => c.name);
        const rawCols = analyzeCsv(activeRawCsv).map((c) => c.name);
        if (!sqlCols.includes(key) && rawCols.includes(key)) {
          return {
            message: `${help.title}: ${help.explanation}\n\nThe SQL result no longer contains the column '${key}'. In this ETL step, Python should transform the SQL output, which has columns: ${sqlCols.join(', ')}.`,
            fix: `Use SQL result columns such as ${sqlCols.slice(0, 3).map((c) => `'${c}'`).join(', ')}. Example: df.groupby('${sqlCols[0]}')['${sqlCols.find((c) => c.toLowerCase().includes('avg')) || sqlCols[1]}'].mean().`,
            severity: 'error',
            snippet: help.suggestions[0],
          };
        }
      }
      return {
        message: `${help.title}: ${help.explanation}`,
        fix: help.suggestions.slice(0, 3).join(' '),
        severity: 'error',
        snippet: help.suggestions[0],
      };
    }
    if (lastSqlError) {
      const help = getSqlErrorHelp(lastSqlError.message, lastSqlError.query);
      return {
        message: `${help.title}: ${help.explanation}`,
        fix: help.suggestions.slice(0, 3).join(' '),
        severity: 'error',
        snippet: help.suggestions[0],
      };
    }
    if (pipeline.activeStep === 'extract') {
      return {
        message: 'Start by loading or pasting a CSV. Bleepx will analyze the columns and suggest SQL/Python next.',
        fix: 'Pick a preset, paste a CSV, or click one of the sample CSV buttons.',
        severity: 'tip',
      };
    }
    if (pipeline.activeStep === 'sql') {
      return {
        message: 'SQL is for exploring and summarizing the raw data before Python transforms it.',
        fix: sqlHints[0] || 'SELECT * FROM dataset LIMIT 10',
        severity: 'tip',
      };
    }
    if (pipeline.activeStep === 'python') {
      return {
        message: 'Python transforms the SQL result (sql_result) or the raw CSV (raw_csv) and produces the final CSV.',
        fix: pythonHints[0] || "Use df['column'] and end with print(df.to_csv(index=False)).",
        severity: 'tip',
      };
    }
    return {
      message: 'Bleepx is watching. Run a step or upload the final CSV to S3.',
      fix: 'Click Run SQL, Run Python transform, or Upload to S3.',
      severity: 'tip',
    };
  }, [lastPythonError, lastSqlError, pipeline.sqlResult, activeRawCsv, pipeline.activeStep, sqlHints, pythonHints]);

  const askBleepx = useCallback((targetId: string) => {
    const hint = buildBleepxHint();
    const target = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('bleepx:hint', { detail: { hint, value: logs[0] || '', target } }));
    }
  }, [buildBleepxHint, logs]);

  const uploadToS3 = useCallback(() => {
    let next = createS3Bucket(sandbox, pipeline.s3Bucket, sandbox.activeRegion);
    const bucket = next.s3.buckets[pipeline.s3Bucket];
    if (!bucket) {
      addLog('Could not create bucket. It may already exist. Trying upload anyway.');
    }
    next = putS3Object(next, pipeline.s3Bucket, pipeline.s3Key, pipeline.transformedCsv || pipeline.rawCsv);
    setSandbox(next);
    setPipeline((p) => ({ ...p, activeStep: 's3' }));
    const last = next.events[next.events.length - 1];
    addLog(last ? last.message : 'Uploaded to S3 sandbox.');
  }, [sandbox, pipeline.s3Bucket, pipeline.s3Key, pipeline.transformedCsv, pipeline.rawCsv]);

  const validateOutput = useCallback(() => {
    if (!pipeline.transformedCsv) {
      addLog('No Python output to validate yet. Run the Python transform first.');
      return;
    }
    const parsed = Papa.parse<Record<string, unknown>>(pipeline.transformedCsv, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      addLog(`Validation failed: ${parsed.errors.length} parse error(s) in the output CSV.`);
      return;
    }
    const rows = parsed.data.length;
    const cols = parsed.meta.fields?.length ?? 0;
    const emptyRows = parsed.data.filter((row) => Object.values(row).some((v) => v === null || v === '')).length;
    const check = emptyRows === 0 ? 'passed' : `warning: ${emptyRows} row(s) with empty cells`;
    addLog(`Data quality check: ${rows} row(s), ${cols} column(s) — ${check}.`);
  }, [pipeline.transformedCsv]);

  const stepOrder: PipelineStep[] = ['extract', 'sql', 'python', 'csv', 's3'];
  const stepIndex = stepOrder.indexOf(pipeline.activeStep);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-sky-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-extrabold flex flex-wrap items-center gap-2"><ToolsIcon size={24} /> Bleepx Pipeline Canvas</h1>
        <p className="text-white/80 text-sm mt-1">
          Extract data from Kaggle or data.world, analyze it with SQL and Python, then ship the final CSV to the AWS S3 sandbox.
        </p>
      </div>

      {/* Step visualizer */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between text-sm font-bold gap-2">
          {[
            { key: 'extract', label: 'Extract', badge: 'Bronze' },
            { key: 'sql', label: 'SQL', badge: 'Silver' },
            { key: 'python', label: 'Python', badge: 'Gold' },
            { key: 'csv', label: 'CSV', badge: 'Gold' },
            { key: 's3', label: 'S3', badge: 'Load' },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`text-center px-3 py-2 rounded-lg transition-colors ${
                stepOrder.indexOf(s.key as PipelineStep) <= stepIndex
                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <div className="text-xs font-bold">{s.badge}</div>
                <div className="text-sm">{s.label}</div>
              </div>
              {i < 4 && <span className="text-gray-400">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Project picker */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2 flex flex-wrap items-center gap-2"><RocketIcon size={18} /> Load a Project</h2>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          Pick a SQLverse lab, a data.world dataset, or a carbon-credit / regenerative agriculture ML project. It pre-fills the source URL, SQL, Python, and S3 destination.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <select
            value={selectedPresetId}
            onChange={(e) => { if (e.target.value) loadPreset(e.target.value); }}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">Choose a project preset...</option>
            {PIPELINE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.tags.join(', ')}</option>
            ))}
          </select>
          <select
            onChange={(e) => {
              const tag = e.target.value;
              if (!tag) { setSelectedPresetId(''); return; }
              const first = PIPELINE_PRESETS.find((p) => p.tags.includes(tag));
              if (first) loadPreset(first.id);
            }}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">Filter by tag...</option>
            <option value="SQLverse">SQLverse</option>
            <option value="data.world">data.world</option>
            <option value="carbon-credits">Carbon credits</option>
            <option value="ML">Machine Learning</option>
          </select>
        </div>
        {selectedPresetId && (() => {
          const p = PIPELINE_PRESETS.find((x) => x.id === selectedPresetId)!;
          return (
            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-200">
              <strong>{p.name}</strong> — {p.description}<br/>
              <span className="text-xs">Source: {p.sourceUrl}</span>
            </div>
          );
        })()}
      </div>

      {/* Extract */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2">1. Extract</h2>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          Paste a Kaggle or data.world dataset URL, then paste a sample CSV (or use the buttons below for quick samples).
        </p>
        <input
          value={pipeline.sourceUrl}
          onChange={(e) => setPipeline((p) => ({ ...p, sourceUrl: e.target.value }))}
          placeholder="https://www.kaggle.com/datasets/owner/dataset or https://data.world/owner/dataset"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm mb-3"
        />
        {sourceInfo && (
          <p className="text-xs text-sky-600 dark:text-sky-400 mb-3">
            <span className="inline-flex flex-wrap items-center gap-1"><ChartBarIcon size={12} /> Detected {sourceInfo.filename} from {pipeline.sourceUrl.includes('kaggle') ? 'Kaggle' : 'data.world'}.</span>
          </p>
        )}
        <textarea
          value={pipeline.rawCsv}
          onChange={(e) => setPipeline((p) => ({ ...p, rawCsv: normalizeCsv(e.target.value) }))}
          onBlur={(e) => setPipeline((p) => ({ ...p, rawCsv: normalizeCsv(e.target.value) }))}
          placeholder="id,name,quantity,price\n1,Alice,2,9.99\n2,Bob,5,4.50\n3,Carol,1,19.99"
          rows={6}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono mb-3"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => loadSample('id,name,quantity,price\n1,Alice,2,9.99\n2,Bob,5,4.50\n3,Carol,1,19.99\n4,Dave,3,7.25')}
            className="text-xs px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-200 transition-colors"
          >
            Load sample sales CSV
          </button>
          <button
            onClick={() => loadSample('sensor,temperature,humidity\nA,22.5,60\nB,21.0,65\nC,23.1,58\nD,20.4,72')}
            className="text-xs px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-200 transition-colors"
          >
            Load sample IoT CSV
          </button>
        </div>
        {dataColumns.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 text-xs">
            <div className="font-bold text-bleepx-text mb-1.5">Bleepx sees {dataColumns.length} columns:</div>
            <div className="flex flex-wrap gap-1.5">
              {dataColumns.map((col) => (
                <span key={col.name} className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" title={`Sample: ${String(col.sample ?? 'n/a')}`}>
                  {col.name} <span className="opacity-60 ml-1">({col.type})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SQL */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2">2. SQL Analysis</h2>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          Your query runs against the CSV you pasted above. Try changing it, then run again — the result is real.
        </p>
        <div className="mb-2 text-xs font-mono text-emerald-500">In[{pipeline.sqlCell ?? ' '}]</div>
        <textarea
          id="sql-code"
          value={pipeline.sqlQuery}
          onChange={(e) => setPipeline((p) => ({ ...p, sqlQuery: e.target.value }))}
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono mb-3"
        />
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button onClick={runSql} disabled={sqlLoading || !pipeline.rawCsv} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-50">
            {sqlLoading ? 'Running…' : 'Run SQL preview'}
          </button>
          <button
            onClick={() => setSqlHintIdx((i) => (i + 1) % sqlHints.length)}
            className="px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
          >
            <BulbIcon size={12} /> Hint
          </button>
          <button
            onClick={() => askBleepx('sql-code')}
            className="px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-sm font-bold hover:bg-rose-200 transition-colors inline-flex items-center gap-1"
          >
            <BleepxFace size={14} /> Stuck? Ask Bleepx
          </button>
        </div>
        {sqlHintIdx >= 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 mb-3">
            <strong>Hint:</strong> {sqlHints[sqlHintIdx]}
          </div>
        )}
        {pipeline.sqlResult && (
          <CsvOutput csv={pipeline.sqlResult} cell={pipeline.sqlCell} title="SQL preview" />
        )}
      </div>

      {/* Python */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2">3. Python ETL</h2>
        <p className="text-xs text-bleepx-text-secondary mb-2">
          Python transforms the chosen data source and produces the final CSV. Pick the source that best fits your analysis.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => {
              setPythonSource('auto');
              setPipeline((p) => ({ ...p, pythonCode: generatePythonStarter(activeRawCsv, p.sqlResult) }));
            }}
            disabled={pythonSource === 'auto'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              pythonSource === 'auto'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200'
            }`}
            title="Use the SQL result if it exists, otherwise the raw CSV. Best for summarised/aggregated data."
          >
            Auto: SQL result first
          </button>
          <button
            onClick={() => {
              setPythonSource('sql');
              if (pipeline.sqlResult) {
                setPipeline((p) => ({ ...p, pythonCode: generatePythonStarter(activeRawCsv, p.sqlResult) }));
              }
            }}
            disabled={pythonSource === 'sql' || !pipeline.sqlResult}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
              pythonSource === 'sql'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-200'
            }`}
            title="Use the columns from the last SQL run. Best when SQL already computed the fields you need."
          >
            Use SQL output
          </button>
          <button
            onClick={() => {
              setPythonSource('raw');
              setPipeline((p) => ({ ...p, pythonCode: generatePythonStarter(activeRawCsv, '') }));
            }}
            disabled={pythonSource === 'raw'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              pythonSource === 'raw'
                ? 'bg-violet-600 text-white'
                : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200'
            }`}
            title="Use the original raw CSV with all row-level columns. Best when you need columns that SQL dropped or aggregated."
          >
            Use raw CSV
          </button>
        </div>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          {pythonSource === 'raw'
            ? 'Code is now using the original raw CSV columns.'
            : pipeline.sqlResult
              ? 'Code is now using the SQL result columns.'
              : 'No SQL result yet — code is using the raw CSV columns until you run SQL.'}
        </p>
        <div className="mb-2 text-xs font-mono text-emerald-500">In[{pipeline.pythonCell ?? ' '}]</div>
        <textarea
          id="python-code"
          value={pipeline.pythonCode}
          onChange={(e) => setPipeline((p) => ({ ...p, pythonCode: e.target.value }))}
          rows={8}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono mb-3"
        />
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button onClick={runPython} disabled={pythonLoading || !pipeline.rawCsv} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-50">
            {pythonLoading ? 'Running…' : 'Run Python transform'}
          </button>
          <button
            onClick={validateOutput}
            disabled={!pipeline.transformedCsv}
            className="px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold hover:bg-emerald-200 transition-colors disabled:opacity-50"
          >
            Validate output
          </button>
          <button
            onClick={() => setPythonHintIdx((i) => (i + 1) % pythonHints.length)}
            className="px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
          >
            <BulbIcon size={12} /> Hint
          </button>
          <button
            onClick={() => askBleepx('python-code')}
            className="px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-sm font-bold hover:bg-rose-200 transition-colors inline-flex items-center gap-1"
          >
            <BleepxFace size={14} /> Stuck? Ask Bleepx
          </button>
        </div>
        {pythonHintIdx >= 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 mb-3">
            <strong>Hint:</strong> {pythonHints[pythonHintIdx]}
          </div>
        )}
        {pipeline.transformedCsv && (
          <CsvOutput csv={pipeline.transformedCsv} cell={pipeline.pythonCell} title="Python transform CSV" />
        )}
        <ImageOutput images={pythonImages} cell={pipeline.pythonCell} title="Python plots" />
        <ConsoleOutput text={pythonConsole} cell={pipeline.pythonCell} title="Python console" />
      </div>

      {/* CSV / S3 */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2 flex flex-wrap items-center gap-2"><UploadIcon size={18} /> 4. Load to S3 Sandbox</h2>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          This is the final step: the Gold-layer CSV is written to the AWS S3 sandbox bucket and key below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            value={pipeline.s3Bucket}
            onChange={(e) => setPipeline((p) => ({ ...p, s3Bucket: e.target.value }))}
            placeholder="Bucket name"
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
          <input
            value={pipeline.s3Key}
            onChange={(e) => setPipeline((p) => ({ ...p, s3Key: e.target.value }))}
            placeholder="Object key"
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <button onClick={uploadToS3} disabled={!pipeline.rawCsv} className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-sky-600 to-teal-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 inline-flex flex-wrap items-center justify-center gap-1">
            <UploadIcon size={16} /> Upload CSV to S3 Sandbox
          </button>
          {pipeline.transformedCsv && (
            <button
              onClick={() => {
                const blob = new Blob([pipeline.transformedCsv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = pipeline.s3Key || 'output.csv';
                a.click();
                URL.revokeObjectURL(url);
                addLog(`Downloaded ${a.download} (${blob.size} bytes).`);
              }}
              className="w-full px-4 py-3 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-bold hover:bg-violet-200 transition-colors inline-flex items-center justify-center gap-1"
            >
              <ChartBarIcon size={16} /> Download output CSV
            </button>
          )}
        </div>
        {pipeline.activeStep === 's3' && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">Uploaded and ready — what next?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <Link href="/cloud/sandbox" className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors">
                View S3 sandbox
              </Link>
              <button
                onClick={() => {
                  const summary = [
                    `Bleepx ETL run: ${pipeline.s3Bucket}/${pipeline.s3Key}`,
                    `Source: ${pipeline.sourceUrl || 'local CSV'}`,
                    `Rows after Python: ${pipeline.transformedCsv ? pipeline.transformedCsv.split('\\n').length - 1 : 0}`,
                    `SQL: ${pipeline.sqlQuery.trim()}`,
                    `Python: ${pipeline.pythonCode.trim().slice(0, 200)}...`,
                  ].join('\\n');
                  navigator.clipboard.writeText(summary).then(() => addLog('Run summary copied to clipboard.'));
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors"
              >
                Copy run summary
              </button>
              <button
                onClick={() => { setPipeline((p) => ({ ...p, activeStep: 'extract', sqlResult: '', transformedCsv: '' })); addLog('Pipeline reset for a new run.'); }}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors"
              >
                Run another pipeline
              </button>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Tip: open the S3 sandbox to verify the object, download the CSV, or start another ETL run with a different dataset.
            </p>
          </div>
        )}
      </div>

      <StatusLog logs={logs} onClear={() => setLogs([])} />

      {/* Reset + links */}
      <div className="flex flex-wrap items-center justify-between">
        <button
          onClick={() => { clearSandboxState(); setSandbox(createEmptySandboxState()); addLog('Sandbox reset.'); }}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span className="inline-flex flex-wrap items-center gap-1"><RefreshIcon size={12} /> Reset Pipeline</span>
        </button>
        <Link href="/cloud" className="text-sm text-sky-600 hover:underline font-medium">
          ← Back to BleepxCloud
        </Link>
      </div>
    </div>
  );
}
