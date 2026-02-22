'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import dynamic from 'next/dynamic';
import DataGrid from './DataGrid';
import ClientCaseGrid from './ClientCaseGrid';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, fullCaseOrder } from '@/lib/constants';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
const Spinner = dynamic(() => import('./Spinner'), { ssr: false });

interface Dataset { name: string; file: string; }
interface TableData { name: string; columns: string[]; previewRows: Record<string, any>[]; fullData: Record<string, any>[]; rowCount: number; }
interface SolvedEntry { id: string; name: string; query: string; time?: number; attempts?: number; ts?: number; }

interface DomainDashboardProps {
  domain: string;
  datasets: Dataset[];
  plots: any[];
}

// Domain-specific chart builders: take full CSV data and return Plotly traces + layout
const domainChartBuilders: Record<string, (tables: Record<string, Record<string, any>[]>) => { data: any[]; layout: any; title: string }[]> = {
  business: (t) => {
    const rows = t.business_retail || [];
    if (!rows.length) return [];
    // Revenue by product line
    const plMap: Record<string, number> = {};
    rows.forEach((r) => { plMap[r.product_line] = (plMap[r.product_line] || 0) + Number(r.total || 0); });
    const sorted = Object.entries(plMap).sort((a, b) => b[1] - a[1]);
    // Payment method distribution
    const payMap: Record<string, number> = {};
    rows.forEach((r) => { payMap[r.payment] = (payMap[r.payment] || 0) + 1; });
    // Rating distribution
    const ratings = rows.map((r) => Number(r.rating)).filter((r) => !isNaN(r));
    return [
      { title: 'Revenue by Product Line', data: [{ x: sorted.map(([k]) => k), y: sorted.map(([, v]) => Math.round(v)), type: 'bar', marker: { color: '#2563eb' } }], layout: { title: { text: 'Revenue by Product Line' }, xaxis: { title: 'Product Line' }, yaxis: { title: 'Total Revenue' } } },
      { title: 'Payment Methods', data: [{ labels: Object.keys(payMap), values: Object.values(payMap), type: 'pie', textinfo: 'percent+label', marker: { colors: ['#2563eb', '#ec4899', '#f59e0b'] } }], layout: { title: { text: 'Payment Method Distribution' } } },
      { title: 'Rating Distribution', data: [{ x: ratings, type: 'histogram', nbinsx: 20, marker: { color: '#10b981' } }], layout: { title: { text: 'Customer Rating Distribution' }, xaxis: { title: 'Rating' }, yaxis: { title: 'Count' } } },
    ];
  },
  crime: (t) => {
    const rows = t.crime_chicago || [];
    if (!rows.length) return [];
    const typeMap: Record<string, number> = {};
    rows.forEach((r) => { typeMap[r.primary_type] = (typeMap[r.primary_type] || 0) + 1; });
    const sorted = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const locMap: Record<string, number> = {};
    rows.forEach((r) => { if (r.location_description) locMap[r.location_description] = (locMap[r.location_description] || 0) + 1; });
    const locSorted = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return [
      { title: 'Crimes by Type', data: [{ x: sorted.map(([k]) => k), y: sorted.map(([, v]) => v), type: 'bar', marker: { color: '#9333ea' } }], layout: { title: { text: 'Top Crime Types' }, xaxis: { tickangle: -45 } } },
      { title: 'Top Locations', data: [{ x: locSorted.map(([k]) => k), y: locSorted.map(([, v]) => v), type: 'bar', marker: { color: '#ef4444' } }], layout: { title: { text: 'Top Crime Locations' }, xaxis: { tickangle: -45 } } },
    ];
  },
  farming: (t) => {
    const rows = t.farming_yield || [];
    if (!rows.length) return [];
    const regMap: Record<string, { yield: number; ndvi: number; cnt: number }> = {};
    rows.forEach((r) => {
      const reg = r.region || 'Unknown';
      if (!regMap[reg]) regMap[reg] = { yield: 0, ndvi: 0, cnt: 0 };
      regMap[reg].yield += Number(r.yield || 0); regMap[reg].ndvi += Number(r.ndvi || 0); regMap[reg].cnt++;
    });
    const regions = Object.keys(regMap);
    return [
      { title: 'Yield by Region', data: [{ x: regions, y: regions.map((r) => Math.round(regMap[r].yield)), type: 'bar', marker: { color: '#16a34a' } }], layout: { title: { text: 'Total Yield by Region' } } },
      { title: 'NDVI vs Yield', data: [{ x: rows.map((r) => Number(r.ndvi)), y: rows.map((r) => Number(r.yield)), mode: 'markers', type: 'scatter', marker: { color: '#2563eb', size: 4, opacity: 0.5 } }], layout: { title: { text: 'NDVI vs Yield (Scatter)' }, xaxis: { title: 'NDVI' }, yaxis: { title: 'Yield' } } },
    ];
  },
  finance: (t) => {
    const rows = t.finance_stocks || [];
    if (!rows.length) return [];
    const tickerMap: Record<string, { close: number[]; vol: number }> = {};
    rows.forEach((r) => {
      const tk = r.ticker || 'UNK';
      if (!tickerMap[tk]) tickerMap[tk] = { close: [], vol: 0 };
      tickerMap[tk].close.push(Number(r.close || 0)); tickerMap[tk].vol += Number(r.volume || 0);
    });
    const tickers = Object.keys(tickerMap);
    return [
      { title: 'Avg Close Price', data: [{ x: tickers, y: tickers.map((tk) => Math.round(tickerMap[tk].close.reduce((a, b) => a + b, 0) / tickerMap[tk].close.length * 100) / 100), type: 'bar', marker: { color: '#0ea5e9' } }], layout: { title: { text: 'Average Close Price by Ticker' } } },
      { title: 'Total Volume', data: [{ labels: tickers, values: tickers.map((tk) => tickerMap[tk].vol), type: 'pie', textinfo: 'percent+label' }], layout: { title: { text: 'Trading Volume Distribution' } } },
    ];
  },
  healthcare: (t) => {
    const treatments = t.treatments || [];
    const patients = t.patients || [];
    if (!treatments.length && !patients.length) return [];
    const charts: { data: any[]; layout: any; title: string }[] = [];
    if (treatments.length) {
      const diagMap: Record<string, number> = {};
      treatments.forEach((r) => { diagMap[r.diagnosis] = (diagMap[r.diagnosis] || 0) + 1; });
      const sorted = Object.entries(diagMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      charts.push({ title: 'Top Diagnoses', data: [{ labels: sorted.map(([k]) => k), values: sorted.map(([, v]) => v), type: 'pie', textinfo: 'percent+label' }], layout: { title: { text: 'Top 10 Diagnoses' } } });
    }
    if (patients.length) {
      const ages = patients.map((r) => Number(r.age)).filter((a) => !isNaN(a));
      charts.push({ title: 'Age Distribution', data: [{ x: ages, type: 'histogram', nbinsx: 20, marker: { color: '#ef4444' } }], layout: { title: { text: 'Patient Age Distribution' }, xaxis: { title: 'Age' }, yaxis: { title: 'Count' } } });
    }
    return charts;
  },
  social: (t) => {
    const tweets = t.tweets || [];
    if (!tweets.length) return [];
    const userMap: Record<string, number> = {};
    tweets.forEach((r) => { userMap[r.user_id] = (userMap[r.user_id] || 0) + 1; });
    const sorted = Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const lenBuckets: Record<string, number> = { 'Short (<50)': 0, 'Medium (50-150)': 0, 'Long (>150)': 0 };
    tweets.forEach((r) => { const len = (r.text || '').length; if (len < 50) lenBuckets['Short (<50)']++; else if (len <= 150) lenBuckets['Medium (50-150)']++; else lenBuckets['Long (>150)']++; });
    return [
      { title: 'Top Tweeters', data: [{ x: sorted.map(([k]) => k), y: sorted.map(([, v]) => v), type: 'bar', marker: { color: '#1d9bf0' } }], layout: { title: { text: 'Most Active Users' } } },
      { title: 'Tweet Length', data: [{ labels: Object.keys(lenBuckets), values: Object.values(lenBuckets), type: 'pie', textinfo: 'percent+label', marker: { colors: ['#93c5fd', '#3b82f6', '#1e40af'] } }], layout: { title: { text: 'Tweet Length Distribution' } } },
    ];
  },
  space: (t) => {
    const rows = t.space_neo || [];
    if (!rows.length) return [];
    const hazMap: Record<string, number> = {};
    rows.forEach((r) => { const h = String(r.is_potentially_hazardous); hazMap[h] = (hazMap[h] || 0) + 1; });
    const velocities = rows.map((r) => Number(r.relative_velocity_km_s)).filter((v) => !isNaN(v));
    return [
      { title: 'Hazardous Objects', data: [{ labels: Object.keys(hazMap), values: Object.values(hazMap), type: 'pie', textinfo: 'percent+label', marker: { colors: ['#22c55e', '#ef4444'] } }], layout: { title: { text: 'Potentially Hazardous NEOs' } } },
      { title: 'Velocity Distribution', data: [{ x: velocities, type: 'histogram', nbinsx: 30, marker: { color: '#8b5cf6' } }], layout: { title: { text: 'Relative Velocity Distribution (km/s)' }, xaxis: { title: 'Velocity (km/s)' } } },
    ];
  },
  sports: (t) => {
    const rows = t.nba_games || [];
    if (!rows.length) return [];
    const playerMap: Record<string, { pts: number; ast: number; reb: number; games: number }> = {};
    rows.forEach((r) => {
      const p = r.player_id || 'UNK';
      if (!playerMap[p]) playerMap[p] = { pts: 0, ast: 0, reb: 0, games: 0 };
      playerMap[p].pts += Number(r.points || 0); playerMap[p].ast += Number(r.assists || 0); playerMap[p].reb += Number(r.rebounds || 0); playerMap[p].games++;
    });
    const top = Object.entries(playerMap).sort((a, b) => b[1].pts - a[1].pts).slice(0, 10);
    return [
      { title: 'Top Scorers', data: [{ x: top.map(([k]) => k), y: top.map(([, v]) => v.pts), type: 'bar', name: 'Points', marker: { color: '#f97316' } }, { x: top.map(([k]) => k), y: top.map(([, v]) => v.ast), type: 'bar', name: 'Assists', marker: { color: '#3b82f6' } }], layout: { title: { text: 'Top Players: Points & Assists' }, barmode: 'group' } },
      { title: 'Points vs Rebounds', data: [{ x: rows.map((r) => Number(r.points)), y: rows.map((r) => Number(r.rebounds)), mode: 'markers', type: 'scatter', marker: { color: '#f97316', size: 4, opacity: 0.4 } }], layout: { title: { text: 'Points vs Rebounds' }, xaxis: { title: 'Points' }, yaxis: { title: 'Rebounds' } } },
    ];
  },
};

export default function DomainDashboard({ domain, datasets }: DomainDashboardProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  const progress = useProgress();
  const allCases = fullCaseOrder[domain] || caseOrder[domain] || [];
  const totalCases = allCases.length;
  const completedCount = allCases.filter((c) => progress.completed.has(c)).length;
  const pct = totalCases > 0 ? Math.round((completedCount / totalCases) * 100) : 0;

  const cases = allCases.map((caseId) => ({
    id: caseId,
    name: caseId.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    tier: 1,
    skills: ['SQL'],
  }));

  // Load solved entries from localStorage
  const solvedEntries = useMemo<SolvedEntry[]>(() => {
    return cases.map((c) => {
      try {
        const raw = localStorage.getItem(`bleepx_solved_${domain}_${c.id}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return { id: c.id, name: c.name, query: parsed.query, time: parsed.time, attempts: parsed.attempts, ts: parsed.ts };
      } catch { return null; }
    }).filter(Boolean) as SolvedEntry[];
  }, [domain, completedCount]);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.all(
          datasets.map(async (ds) => {
            const url = ds.file.startsWith('/datasets/') ? ds.file : `/datasets/${ds.file.split('/').pop()}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const txt = await res.text();
            const parsed = Papa.parse(txt.trim().replace(/^\uFEFF/, ''), {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true,
            });
            const data = parsed.data as Record<string, any>[];
            return { name: ds.name, columns: parsed.meta.fields ?? [], previewRows: data.slice(0, 5), fullData: data, rowCount: data.length };
          })
        );
        setTables(results.filter(Boolean) as TableData[]);
      } catch (err) {
        console.error('Dashboard CSV load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [datasets]);

  // Build domain-specific charts from CSV data
  const domainCharts = useMemo(() => {
    const tableMap: Record<string, Record<string, any>[]> = {};
    tables.forEach((t) => { tableMap[t.name] = t.fullData; });
    const builder = domainChartBuilders[domain];
    return builder ? builder(tableMap) : [];
  }, [tables, domain]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
        <span className="ml-2 text-gray-600">*bleep* Loading your dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <section className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Progress Ring */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct * 2.64} 264`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{pct}%</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-900">{domain.charAt(0).toUpperCase() + domain.slice(1)} Progress</h2>
            <p className="text-gray-600 mt-1">{completedCount} of {totalCases} challenges completed</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">{solvedEntries.length} solved</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{totalCases - completedCount} remaining</span>
              {solvedEntries.some((e) => e.time) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                  Avg time: {Math.round(solvedEntries.filter((e) => e.time).reduce((s, e) => s + (e.time || 0), 0) / solvedEntries.filter((e) => e.time).length)}s
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Case Grid */}
      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Challenge Map</h2>
        <ClientCaseGrid domain={domain} cases={cases} />
      </section>

      {/* Domain Charts — built from CSV data, no SQL needed */}
      {domainCharts.length > 0 && (
        <section className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Insights</h2>
          <p className="text-sm text-gray-500 mb-4">Visualizations built from the {domain} datasets.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {domainCharts.map((chart, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 overflow-hidden">
                <Plot
                  data={chart.data}
                  layout={{ ...chart.layout, autosize: true, margin: { t: 50, b: 70, l: 60, r: 30 }, font: { size: 11 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
                  config={{ responsive: true, displayModeBar: false }}
                  className="w-full"
                  style={{ width: '100%', height: 320 }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Per-Case Performance */}
      {solvedEntries.length > 0 && (
        <section className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance by Challenge</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Challenge</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Attempts</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Rating</th>
                </tr>
              </thead>
              <tbody>
                {solvedEntries.map((e) => {
                  const rating = (e.attempts || 1) <= 1 ? '⭐⭐⭐' : (e.attempts || 1) <= 3 ? '⭐⭐' : '⭐';
                  return (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{e.name}</td>
                      <td className="py-2 px-3">{e.attempts || '—'}</td>
                      <td className="py-2 px-3">{e.time ? `${Math.floor(e.time / 60)}m ${e.time % 60}s` : '—'}</td>
                      <td className="py-2 px-3">{rating}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Solved Queries */}
      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Solved Queries</h2>
        {solvedEntries.length > 0 ? (
          <div className="space-y-3">
            {solvedEntries.map((e) => (
              <div key={e.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-800">{e.name}</span>
                  <span className="text-xs text-green-600 font-semibold">✓ Solved</span>
                </div>
                <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{e.query}</pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No solved queries yet. Complete cases to see your solutions here.</p>
        )}
      </section>

      {/* Dataset Preview */}
      {tables.length > 0 && (
        <section className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Datasets</h2>
          {tables.map((table) => (
            <div key={table.name} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-lg">{table.name}</h3>
                <span className="text-xs text-gray-500">({table.rowCount} rows, {table.columns.length} columns)</span>
              </div>
              <DataGrid data={table.previewRows} />
            </div>
          ))}
        </section>
      )}

      {/* Export */}
      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Export</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const report = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} — Progress Report\n## BleepxQuery SwiftLink Training Program\n\n**Completed:** ${completedCount} of ${totalCases} (${pct}%)\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n${solvedEntries.length > 0 ? solvedEntries.map((e) => `### ${e.name}${e.attempts ? ` (${e.attempts} attempts)` : ''}${e.time ? ` — ${Math.floor(e.time / 60)}m ${e.time % 60}s` : ''}\n\`\`\`sql\n${e.query}\n\`\`\`\n`).join('\n') : 'No solved queries yet.'}\n\n---\n*Generated by [BleepxQuery](https://bleepxacademy.vercel.app)*\n`;
              const blob = new Blob([report], { type: 'text/markdown' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${domain}_progress.md`; a.click();
            }}
            className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
          >
            📄 Download Report
          </button>
          <button
            onClick={() => {
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${domain} Report</title><style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:20px}h1{color:#2563eb}pre{background:#f3f4f6;padding:12px;border-radius:8px;font-size:13px}.g{color:#16a34a;font-weight:600}@media print{body{margin:0}}</style></head><body><h1>${domain.charAt(0).toUpperCase() + domain.slice(1)} Progress — ${pct}%</h1><p>${completedCount}/${totalCases} completed | ${new Date().toLocaleDateString()}</p><hr>${solvedEntries.map((e) => `<h3>${e.name} <span class="g">✓</span></h3><pre>${e.query.replace(/</g,'&lt;')}</pre>`).join('')}<hr><p style="font-size:12px;color:#999">Generated by BleepxQuery</p></body></html>`;
              const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
              if (w) setTimeout(() => w.print(), 800);
            }}
            className="px-4 py-2 rounded-full bg-gray-800 text-white text-sm hover:bg-gray-900 transition-colors"
          >
            🖨️ Print / PDF
          </button>
          <Link href={`/cases/${domain}`}>
            <button className="px-4 py-2 border rounded-full hover:bg-gray-100 transition-colors text-sm">← Back to Cases</button>
          </Link>
        </div>
      </section>
    </div>
  );
}