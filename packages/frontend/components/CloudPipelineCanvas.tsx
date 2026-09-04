'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { BleepxFace } from '@/components/BleepxIcons';
import { CheckBadge, AlertIcon, ToolsIcon, RocketIcon, ChartBarIcon, UploadIcon, RefreshIcon, BulbIcon } from '@/components/AppIcons';
import { getKaggleInfo } from '@/lib/kaggleDatasets';
import { getDataWorldInfo } from '@/lib/dataWorldDatasets';
import { PIPELINE_PRESETS } from '@/lib/cloud/pipelinePresets';
import { initSQL, loadCSVString, runQuery } from '@/lib/sqlClient/browser';
import { loadPyodide, runPythonCode } from '@/lib/pyodideRuntime';
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

const DEFAULT_PYTHON = `import pandas as pd
from io import StringIO

# Use the SQL result if it exists, otherwise the original raw CSV
input_csv = sql_result if 'sql_result' in globals() and sql_result else raw_csv
df = pd.read_csv(StringIO(input_csv))

# Bleepx tip: inspect your data before changing it
# print(df.head())
# print(df.columns)

# Try a transformation of your own, for example:
# - filter rows:  df = df[df['year'] >= 2015]
# - add a column: df['co2_per_capita'] = df['value'] / 1_000_000
# - compute summary: print(df.groupby('country_name')['value'].mean())

# Print the final CSV so it can continue to S3
print(df.to_csv(index=False))`;

const SQL_HINTS = [
  'Try filtering rows with WHERE, e.g. WHERE year >= 2015.',
  'Group results with GROUP BY and use COUNT, SUM, AVG, MIN or MAX.',
  'Compare periods by selecting year ranges and ordering by a calculated column.',
  'Add a meaningful alias so the output column is easy to read, e.g. SELECT country_name, value AS co2_kt.',
];

const PYTHON_HINTS = [
  "Inspect the data first with print(df.head()) and print(df.columns).",
  "Create a derived column: df['new_col'] = df['value'] * 2.",
  "Filter rows: df = df[df['year'] >= 2015].",
  "Aggregate: print(df.groupby('country_name')['value'].mean()).",
  "Always end with print(df.to_csv(index=False)) so the next step receives a CSV.",
];

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CloudPipelineCanvas() {
  const [pipeline, setPipeline] = useState<PipelineState>({
    sourceUrl: '',
    rawCsv: '',
    sqlQuery: DEFAULT_QUERY,
    sqlResult: '',
    pythonCode: DEFAULT_PYTHON,
    transformedCsv: '',
    s3Bucket: 'bleepx-pipeline-output',
    s3Key: 'output.csv',
    activeStep: 'extract',
  });
  const [execCount, setExecCount] = useState(0);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [pythonLoading, setPythonLoading] = useState(false);
  const [sqlHintIdx, setSqlHintIdx] = useState(-1);
  const [pythonHintIdx, setPythonHintIdx] = useState(-1);
  const pyodideRef = useRef<any>(null);

  const [sandbox, setSandbox] = useState<CloudSandboxState>(createEmptySandboxState());
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const loadPreset = useCallback((id: string) => {
    const preset = PIPELINE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPipeline((p) => ({
      ...p,
      sourceUrl: preset.sourceUrl,
      rawCsv: preset.rawCsv,
      sqlQuery: preset.sqlQuery,
      pythonCode: preset.pythonCode,
      s3Key: preset.s3Key,
      s3Bucket: 'bleepx-pipeline-output',
      activeStep: 'sql',
    }));
    setSelectedPresetId(id);
    setMessage(`Loaded "${preset.name}". Source: ${preset.sourceUrl}. Run SQL preview next.`);
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
    setPipeline((p) => ({ ...p, rawCsv: csv, activeStep: 'sql' }));
    setMessage('CSV loaded into the pipeline. Run SQL or Python next.');
  }, []);

  const runSql = useCallback(async () => {
    if (!pipeline.rawCsv.trim()) {
      setMessage('Paste or load a CSV first, then run SQL.');
      return;
    }
    setSqlLoading(true);
    setMessage('Running SQL on the in-browser database…');
    const nextCell = execCount + 1;
    try {
      await initSQL();
      await loadCSVString('dataset', pipeline.rawCsv);
      const { columns, data } = await runQuery(pipeline.sqlQuery || DEFAULT_QUERY);
      const csv = Papa.unparse({ fields: columns, data });
      setExecCount(nextCell);
      setPipeline((p) => ({ ...p, sqlResult: csv, sqlCell: nextCell, activeStep: 'python' }));
      const cols = columns.join(', ');
      setMessage(
        `SQL returned ${data.length} row(s) with columns: ${cols}. ` +
        `Try filtering, grouping, or adding a calculated column. Then run Python to transform the result before S3.`
      );
    } catch (err: any) {
      setMessage(`SQL error: ${err?.message || String(err)}`);
    } finally {
      setSqlLoading(false);
    }
  }, [pipeline.rawCsv, pipeline.sqlQuery, execCount]);

  const runPython = useCallback(async () => {
    if (!pipeline.rawCsv.trim()) {
      setMessage('Paste or load a CSV first, then run Python.');
      return;
    }
    setPythonLoading(true);
    setMessage('Loading Python runtime…');
    const nextCell = execCount + 1;
    try {
      if (!pyodideRef.current) {
        pyodideRef.current = await loadPyodide((msg) => setMessage(msg));
      }
      const { stdout, stderr } = await runPythonCode(pyodideRef.current, {
        code: pipeline.pythonCode || DEFAULT_PYTHON,
        globals: { raw_csv: pipeline.rawCsv, sql_result: pipeline.sqlResult || '' },
        timeoutMs: 30000,
        onProgress: (msg) => setMessage(msg),
      });
      const combined = stderr ? `${stdout}\n${stderr}` : stdout;
      const preview = Papa.parse(combined.trim(), { header: true, skipEmptyLines: true });
      const rows = preview.data.length;
      const cols = preview.meta.fields?.length ?? 0;
      const colList = preview.meta.fields?.join(', ') ?? '';
      setExecCount(nextCell);
      setPipeline((p) => ({ ...p, transformedCsv: combined.trim(), pythonCell: nextCell, activeStep: 'csv' }));
      setMessage(
        `Python produced ${rows} row(s) and ${cols} column(s)${colList ? `: ${colList}` : ''}. ` +
        `You can now upload the CSV to the S3 sandbox, or tweak the code and run again.`
      );
    } catch (err: any) {
      const detail = err?.stdout ? `${err.stdout}\n${err.message}` : err?.message || String(err);
      setPipeline((p) => ({ ...p, transformedCsv: detail.trim(), pythonCell: nextCell, activeStep: 'csv' }));
      setMessage(`Python error: ${err?.message || String(err)}`);
    } finally {
      setPythonLoading(false);
    }
  }, [pipeline.rawCsv, pipeline.pythonCode, execCount]);

  const uploadToS3 = useCallback(() => {
    let next = createS3Bucket(sandbox, pipeline.s3Bucket, sandbox.activeRegion);
    const bucket = next.s3.buckets[pipeline.s3Bucket];
    if (!bucket) {
      setMessage('Could not create bucket. It may already exist. Trying upload anyway.');
    }
    next = putS3Object(next, pipeline.s3Bucket, pipeline.s3Key, pipeline.transformedCsv || pipeline.rawCsv);
    setSandbox(next);
    setPipeline((p) => ({ ...p, activeStep: 's3' }));
    const last = next.events[next.events.length - 1];
    setMessage(last ? last.message : 'Uploaded to S3 sandbox.');
  }, [sandbox, pipeline.s3Bucket, pipeline.s3Key, pipeline.transformedCsv, pipeline.rawCsv]);

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
            { key: 'extract', label: 'Extract' },
            { key: 'sql', label: 'SQL' },
            { key: 'python', label: 'Python' },
            { key: 'csv', label: 'CSV' },
            { key: 's3', label: 'S3' },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`text-center px-3 py-2 rounded-lg transition-colors ${
                stepOrder.indexOf(s.key as PipelineStep) <= stepIndex
                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                {s.label}
              </div>
              {i < 4 && <span className="text-gray-400">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
          <BleepxFace /> {message}
        </div>
      )}

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
          onChange={(e) => setPipeline((p) => ({ ...p, rawCsv: e.target.value }))}
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
      </div>

      {/* SQL */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2">2. SQL Analysis</h2>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          Your query runs against the CSV you pasted above. Try changing it, then run again — the result is real.
        </p>
        <div className="mb-2 text-xs font-mono text-emerald-500">In[{pipeline.sqlCell ?? ' '}]</div>
        <textarea
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
            onClick={() => setSqlHintIdx((i) => (i + 1) % SQL_HINTS.length)}
            className="px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
          >
            <BulbIcon size={12} /> Hint
          </button>
        </div>
        {sqlHintIdx >= 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 mb-3">
            <strong>Hint:</strong> {SQL_HINTS[sqlHintIdx]}
          </div>
        )}
        {pipeline.sqlResult && (
          <CsvOutput csv={pipeline.sqlResult} cell={pipeline.sqlCell} title="SQL preview" />
        )}
      </div>

      {/* Python */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2">3. Python ETL</h2>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          The CSV is available in the <code>raw_csv</code> variable. Edit the code to transform it, then run — the output feeds the next step.
        </p>
        <div className="mb-2 text-xs font-mono text-emerald-500">In[{pipeline.pythonCell ?? ' '}]</div>
        <textarea
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
            onClick={() => setPythonHintIdx((i) => (i + 1) % PYTHON_HINTS.length)}
            className="px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
          >
            <BulbIcon size={12} /> Hint
          </button>
        </div>
        {pythonHintIdx >= 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 mb-3">
            <strong>Hint:</strong> {PYTHON_HINTS[pythonHintIdx]}
          </div>
        )}
        {pipeline.transformedCsv && (
          <CsvOutput csv={pipeline.transformedCsv} cell={pipeline.pythonCell} title="Python transform" />
        )}
      </div>

      {/* CSV / S3 */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2">4. Load to S3 Sandbox</h2>
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
        <button onClick={uploadToS3} disabled={!pipeline.rawCsv} className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-sky-600 to-teal-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 inline-flex flex-wrap items-center justify-center gap-1">
          <UploadIcon size={16} /> Upload CSV to S3 Sandbox
        </button>
      </div>

      {/* Reset + links */}
      <div className="flex flex-wrap items-center justify-between">
        <button
          onClick={() => { clearSandboxState(); setSandbox(createEmptySandboxState()); setMessage('Sandbox reset.'); }}
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
