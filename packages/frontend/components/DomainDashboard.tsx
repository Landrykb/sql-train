'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Visualizations from './Visualizations';
import DataGrid from './DataGrid';
import ClientCaseGrid from './ClientCaseGrid';
import { useProgress } from '@/lib/useProgress';
import { caseOrder } from '@/lib/constants';

const Spinner = dynamic(() => import('./Spinner'), { ssr: false });

export interface PlotData {
  caseId: string;
  title: string;
  plot: {
    data: any[];
    layout: any;
    config: { responsive: boolean; displayModeBar: boolean };
  };
  queryResults: {
    columns: string[];
    rows: any[][];
  };
  matplotlibImage?: string;
}

export interface TableData {
  name: string;
  columns: string[];
  previewRows: Record<string, string | number | null>[];
}

interface Dataset {
  name: string;
  file: string;
}

interface Case {
  id: string;
  name: string;
  tier: number;
  skills: string[];
}

interface DomainDashboardProps {
  domain: string;
  datasets: Dataset[];
  plots: PlotData[];
}

export default function DomainDashboard({
  domain,
  datasets,
  plots,
}: DomainDashboardProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const progress = useProgress();
  const totalCases = caseOrder[domain]?.length || 0;
  const completedCases = progress.completed.size;

  const cases: Case[] = caseOrder[domain]?.map((caseId: string) => ({
    id: caseId,
    name: caseId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    tier: 1,
    skills: ['SQL'],
  })) || [];


  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        console.log('Starting CSV parsing for datasets:', datasets);
        const promises = datasets.map(async (ds) => {
          try {
            // Normalize the file path to ensure it points to /datasets/
            const filePath = ds.file.startsWith('/datasets/')
              ? ds.file
              : `/datasets/${ds.file.split('/').pop()}`;
            console.log(`Fetching dataset: ${filePath}`);
            const res = await fetch(filePath);
            if (!res.ok) {
              console.error(`Failed to fetch ${filePath}: ${res.status} ${res.statusText}`);
              return null;
            }
            const txt = await res.text();
            const parsed = Papa.parse<Record<string, string | number | null>>(txt, {
              header: true,
              preview: 5,
              transform: (v) =>
                v === '' || v == null ? null : isNaN(Number(v)) ? v : Number(v),
            });
            console.log(`Parsed dataset ${ds.name}:`, {
              columns: parsed.meta.fields,
              rows: parsed.data.length,
            });
            return {
              name: ds.name,
              columns: parsed.meta.fields ?? [],
              previewRows: parsed.data,
            };
          } catch (err) {
            console.error(`Error parsing ${ds.file}: ${err}`);
            return null;
          }
        });
        const allTables = (await Promise.all(promises)).filter(
          (t): t is TableData => !!t
        );
        console.log('Parsed tables:', allTables);
        setTables(allTables);

        if (!allTables.length) {
          setError('No datasets available. Ensure dataset CSV files exist in public/datasets/.');
        }
      } catch (e: any) {
        console.error('Error loading datasets:', e);
        setError(`Failed to load datasets: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [datasets, plots]);


  if (loading) {
    return (
      <Suspense fallback={<Spinner />}>
        <div className="flex items-center justify-center p-8" aria-live="polite">
          <Spinner />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      </Suspense>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 bg-gray-50 min-h-screen">
        <nav className="text-sm font-medium text-blue-600 mb-6">
          <Link href={`/cases/${domain}`} className="hover:underline">
            Back to {domain} Exercises
          </Link>
        </nav>
        <div className="p-6 bg-red-100 text-red-800 rounded-xl shadow-lg" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8 bg-gray-50 min-h-screen">
      <nav className="text-sm font-medium text-blue-600" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {' > '}
        <Link href="/cases" className="hover:underline">
          Exercises
        </Link>
        {' > '}
        <Link href={`/cases/${domain}`} className="hover:underline">
          {domain.charAt(0).toUpperCase() + domain.slice(1)}
        </Link>
        {' > '}
        <span className="font-semibold">Dashboard</span>
      </nav>

      <header className="bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">
          {domain.charAt(0).toUpperCase() + domain.slice(1)} Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Explore visualizations, query results, and datasets for the {domain} domain.
        </p>
      </header>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Progress</h2>
        <p className="text-gray-600 mb-4">
          Completed {completedCases} of {totalCases} cases.
        </p>
        <ClientCaseGrid domain={domain} cases={cases} />
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Visualizations and Query Results</h2>
        <Visualizations
          domain={domain}
          caseId="dashboard"
          datasets={datasets}
          plots={plots}
        />
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Datasets</h2>
        {tables.length > 0 ? (
          tables.map((table) => (
            <div key={table.name} className="mb-6">
              <h3 className="font-medium text-lg mb-2">Table: {table.name}</h3>
              <DataGrid data={table.previewRows} />
            </div>
          ))
        ) : (
          <p className="text-gray-600">
            No datasets available. Check the YAML case files and dataset files in public/datasets/.
          </p>
        )}
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Solved Queries</h2>
        {cases.filter((c) => {
          try { return !!localStorage.getItem(`bleepx_solved_${domain}_${c.id}`); } catch { return false; }
        }).length > 0 ? (
          <div className="space-y-3">
            {cases.map((c) => {
              try {
                const raw = localStorage.getItem(`bleepx_solved_${domain}_${c.id}`);
                if (!raw) return null;
                const { query } = JSON.parse(raw);
                return (
                  <div key={c.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-800">{c.name}</span>
                      <span className="text-xs text-green-600 font-semibold">✓ Solved</span>
                    </div>
                    <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{query}</pre>
                  </div>
                );
              } catch { return null; }
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No solved queries yet. Complete cases to see your solutions here.</p>
        )}
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Export</h2>
        <p className="text-gray-600 text-sm mb-4">Download your progress and solved queries as a report.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const solvedEntries = cases.map((c) => {
                try {
                  const raw = localStorage.getItem(`bleepx_solved_${domain}_${c.id}`);
                  if (!raw) return null;
                  const { query } = JSON.parse(raw);
                  return { name: c.name, id: c.id, query };
                } catch { return null; }
              }).filter(Boolean) as { name: string; id: string; query: string }[];

              const report = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} — Progress Report
## BleepxQuery SwiftLink Training Program

**Domain:** ${domain}
**Completed:** ${completedCases} of ${totalCases} cases
**Date:** ${new Date().toLocaleDateString()}

---

${solvedEntries.length > 0 ? solvedEntries.map((e) => `### ${e.name}\n\`\`\`sql\n${e.query}\n\`\`\`\n`).join('\n') : 'No solved queries yet.'}

---
*Generated by [BleepxQuery](https://bleepxacademy.vercel.app)*
`;
              const blob = new Blob([report], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${domain}_progress_report.md`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
          >
            📄 Download Report (.md)
          </button>
          <button
            onClick={() => {
              const solvedEntries = cases.map((c) => {
                try {
                  const raw = localStorage.getItem(`bleepx_solved_${domain}_${c.id}`);
                  if (!raw) return null;
                  const { query } = JSON.parse(raw);
                  return { name: c.name, id: c.id, query };
                } catch { return null; }
              }).filter(Boolean) as { name: string; id: string; query: string }[];

              const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${domain} Progress Report</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#1f2937}
h1{color:#2563eb}h2{border-bottom:2px solid #e5e7eb;padding-bottom:8px}
pre{background:#f3f4f6;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px}
.badge{display:inline-block;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600}
@media print{body{margin:0}}</style></head><body>
<h1>${domain.charAt(0).toUpperCase() + domain.slice(1)} — Progress Report</h1>
<p><strong>BleepxQuery SwiftLink Training Program</strong></p>
<p>Completed: <strong>${completedCases}</strong> of <strong>${totalCases}</strong> cases | Date: ${new Date().toLocaleDateString()}</p>
<hr>
${solvedEntries.length > 0 ? solvedEntries.map((e) => `<h2>${e.name} <span class="badge">✓ Solved</span></h2><pre>${e.query.replace(/</g,'&lt;')}</pre>`).join('\n') : '<p>No solved queries yet.</p>'}
<hr><p style="font-size:12px;color:#9ca3af">Generated by <a href="https://bleepxacademy.vercel.app">BleepxQuery</a></p>
</body></html>`;
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const w = window.open(url, '_blank');
              if (w) setTimeout(() => { w.print(); }, 800);
            }}
            className="px-4 py-2 rounded-full bg-gray-800 text-white text-sm hover:bg-gray-900 transition-colors"
          >
            🖨️ Print / Save as PDF
          </button>
          <Link href={`/cases/${domain}`}>
            <button className="px-4 py-2 border rounded-full hover:bg-gray-100 transition-colors text-sm">
              ← Back to Cases
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}