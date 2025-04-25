'use client';

import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { basicSetup } from '@codemirror/basic-setup';
import { sql } from '@codemirror/lang-sql';
import { initDuckDB, loadCSV, runQuery } from '@/lib/duckdbClient';
import { DataGrid } from './Table';

interface CaseData {
  name: string;
  description: string;
  instructions?: string;
  hints?: string[];
  datasets: { name: string; file: string }[];
  seedQuery?: string;
  expected?: any[];
}

export default function SQLPlayground({ caseData }: { caseData: CaseData }) {
  const { name, description, instructions, hints = [], datasets, seedQuery, expected = [] } = caseData;

  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState(seedQuery || '');
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    (async () => {
      await initDuckDB();
      for (const ds of datasets) {
        await loadCSV(ds.name, ds.file);
      }
      // fetch columns
      const info = await runQuery(\`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='main'
        ORDER BY ordinal_position;
      \`);
      const colRows = info.toArray();
      setColumns(colRows.map((r: any[]) => r[0]));

      if (seedQuery) {
        try { await runQuery(seedQuery); } catch {}
      }
      setReady(true);
      loadPreview();
    })();
  }, [datasets, seedQuery]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await runQuery('SELECT * FROM main LIMIT 5;');
      const data = res.toArray();
      const grid = data.map((row: any[]) =>
        Object.fromEntries(res.columns.map((c, i) => [c, row[i]]))
      );
      setPreviewRows(grid);
    } catch {
      setPreviewRows([]);
    }
    setLoadingPreview(false);
  };

  const onRun = async () => {
    try {
      const res = await runQuery(query);
      const data = res.toArray();
      const grid = data.map((row: any[]) =>
        Object.fromEntries(res.columns.map((c, i) => [c, row[i]]))
      );
      setRows(grid);
      setMsg(
        grid.length > 0 && JSON.stringify(grid) === JSON.stringify(expected)
          ? 'Correct'
          : 'Try again'
      );
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };

  if (!ready) return <p>Loading database…</p>;

  return (
    <div className="space-y-6 p-6 bg-white border rounded-lg shadow">
      {/* Header */}
      <h2 className="text-2xl font-bold">{name}</h2>
      <p className="text-gray-700">{description}</p>
      {instructions && <pre className="p-4 bg-gray-100 rounded text-sm">{instructions}</pre>}
      {hints.length > 0 && <ul className="list-disc ml-5 text-sm text-gray-600">{hints.map((h,i)=><li key={i}>{h}</li>)}</ul>}

      {/* Columns */}
      <div className="flex flex-wrap gap-2">
        {(columns||[]).map((col) => (
          <button
            key={col}
            className="px-2 py-1 bg-gray-200 rounded text-sm"
            onClick={() => setQuery((q) => q.replace(/;?\\s*$/, '') + ` ${col} `)}
          >
            {col}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div>
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Dataset Preview</h3>
          <button
            onClick={loadPreview}
            disabled={loadingPreview}
            className="text-blue-600 disabled:opacity-50"
          >
            {loadingPreview ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <DataGrid data={previewRows} />
        <p className="text-xs text-gray-500">Schema hint: <code>SELECT * FROM main LIMIT 0;</code></p>
      </div>

      {/* Editor */}
      <CodeMirror
        value={query}
        height="180px"
        extensions={[basicSetup, sql()]}
        onChange={setQuery}
      />

      {/* Run */}
      <button
        onClick={onRun}
        disabled={!ready}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Run Query
      </button>
      {msg && (
        <p className={\`mt-2 inline-block px-3 py-1 rounded \${
          msg === 'Correct'
            ? 'bg-green-100 text-green-800'
            : msg.startsWith('Error')
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }\`}>{msg}</p>
      )}

      {/* Results */}
      <DataGrid data={rows} />

      {/* GuideBook links */}
      <div className="text-sm text-blue-600">
        See GuideBook:
        {hints.map((h,i) => {
          const skill = h.match(/Review the (\\w+)/)?.[1] || '';
          return <a key={i} href={\`/guides/\${skill}.md\`} className="ml-2 hover:underline">{skill}</a>;
        })}
      </div>
    </div>
  );
}
