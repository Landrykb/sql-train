'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import dynamic from 'next/dynamic';
import DataGrid from './DataGrid';
import ClientCaseGrid from './ClientCaseGrid';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, fullCaseOrder, visualizationConfigs, CASE_TIERS } from '@/lib/constants';
import { pushPortfolioToGitHub } from '@/lib/githubPush';
import { startGitHubLogin } from '@/lib/authClient';
import { useSupabaseUser } from '@/lib/useSupabaseUser';

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
    const sorted = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const locMap: Record<string, number> = {};
    rows.forEach((r) => { if (r.location_description) locMap[r.location_description] = (locMap[r.location_description] || 0) + 1; });
    const locSorted = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return [
      { title: 'Crimes by Type', data: [{ y: sorted.map(([k]) => k), x: sorted.map(([, v]) => v), type: 'bar', orientation: 'h', marker: { color: '#9333ea' } }], layout: { title: { text: 'Top 8 Crime Types' }, margin: { l: 120 } } },
      { title: 'Top Locations', data: [{ y: locSorted.map(([k]) => k.length > 20 ? k.slice(0, 18) + '…' : k), x: locSorted.map(([, v]) => v), type: 'bar', orientation: 'h', marker: { color: '#ef4444' } }], layout: { title: { text: 'Top 8 Crime Locations' }, margin: { l: 140 } } },
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
    const sample = rows.length > 500 ? rows.filter((_, i) => i % Math.ceil(rows.length / 500) === 0) : rows;
    return [
      { title: 'Yield by Region', data: [{ x: regions, y: regions.map((r) => Math.round(regMap[r].yield / regMap[r].cnt * 100) / 100), type: 'bar', marker: { color: '#16a34a' } }], layout: { title: { text: 'Avg Yield by Region' } } },
      { title: 'NDVI vs Yield', data: [{ x: sample.map((r) => Number(r.ndvi)), y: sample.map((r) => Number(r.yield)), mode: 'markers', type: 'scatter', marker: { color: '#2563eb', size: 4, opacity: 0.5 } }], layout: { title: { text: 'NDVI vs Yield (sampled)' }, xaxis: { title: 'NDVI' }, yaxis: { title: 'Yield' } } },
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
    const byAvg = Object.entries(tickerMap).map(([tk, d]) => ({ tk, avg: d.close.reduce((a, b) => a + b, 0) / d.close.length })).sort((a, b) => b.avg - a.avg).slice(0, 10);
    const byVol = Object.entries(tickerMap).sort((a, b) => b[1].vol - a[1].vol).slice(0, 10);
    return [
      { title: 'Top 10 Avg Close Price', data: [{ x: byAvg.map((d) => d.tk), y: byAvg.map((d) => Math.round(d.avg * 100) / 100), type: 'bar', marker: { color: '#0ea5e9' } }], layout: { title: { text: 'Top 10 Tickers by Avg Close Price' }, xaxis: { tickangle: -30 } } },
      { title: 'Top 10 Volume', data: [{ x: byVol.map(([k]) => k), y: byVol.map(([, v]) => v.vol), type: 'bar', marker: { color: '#f59e0b' } }], layout: { title: { text: 'Top 10 Tickers by Total Volume' }, xaxis: { tickangle: -30 } } },
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
    const sorted = Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const lenBuckets: Record<string, number> = { 'Short (<50)': 0, 'Medium (50-150)': 0, 'Long (>150)': 0 };
    tweets.forEach((r) => { const len = (r.text || '').length; if (len < 50) lenBuckets['Short (<50)']++; else if (len <= 150) lenBuckets['Medium (50-150)']++; else lenBuckets['Long (>150)']++; });
    return [
      { title: 'Top 10 Tweeters', data: [{ x: sorted.map(([k]) => k), y: sorted.map(([, v]) => v), type: 'bar', marker: { color: '#1d9bf0' } }], layout: { title: { text: 'Top 10 Most Active Users' }, xaxis: { tickangle: -30 } } },
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
    const ptsDist = rows.map((r) => Number(r.points)).filter((v) => !isNaN(v));
    return [
      { title: 'Top Scorers', data: [{ x: top.map(([k]) => k), y: top.map(([, v]) => v.pts), type: 'bar', name: 'Points', marker: { color: '#f97316' } }, { x: top.map(([k]) => k), y: top.map(([, v]) => v.ast), type: 'bar', name: 'Assists', marker: { color: '#3b82f6' } }], layout: { title: { text: 'Top 10 Players: Points & Assists' }, barmode: 'group', xaxis: { tickangle: -30 } } },
      { title: 'Points Distribution', data: [{ x: ptsDist, type: 'histogram', nbinsx: 25, marker: { color: '#f97316' } }], layout: { title: { text: 'Points Scored Distribution' }, xaxis: { title: 'Points' }, yaxis: { title: 'Games' } } },
    ];
  },
};

export default function DomainDashboard({ domain, datasets }: DomainDashboardProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const ghUser = useSupabaseUser();
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ success: boolean; repoUrl?: string; error?: string } | null>(null);

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

  // Load solved entries from localStorage — include ALL completed cases
  // Fallback chain: bleepx_solved_ → bleepx_history_ (last successful query)
  const solvedEntries = useMemo<SolvedEntry[]>(() => {
    return cases
      .filter((c) => progress.completed.has(c.id))
      .map((c) => {
        // Primary: bleepx_solved_ has full data
        try {
          const raw = localStorage.getItem(`bleepx_solved_${domain}_${c.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.query) return { id: c.id, name: c.name, query: parsed.query, time: parsed.time, attempts: parsed.attempts, ts: parsed.ts };
          }
        } catch { /* ignore */ }
        // Fallback: pull last successful query from history
        try {
          const hist = localStorage.getItem(`bleepx_history_${domain}_${c.id}`);
          if (hist) {
            const entries = JSON.parse(hist) as { query: string; ts: number; success: boolean | null }[];
            const lastSuccess = entries.find((e) => e.success === true);
            if (lastSuccess) return { id: c.id, name: c.name, query: lastSuccess.query, ts: lastSuccess.ts };
          }
        } catch { /* ignore */ }
        return { id: c.id, name: c.name, query: '' };
      });
  }, [domain, completedCount, cases, progress.completed]);

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

  // Build comprehensive portfolio files for GitHub push / download
  const buildPortfolioFiles = () => {
    const dt = domain.charAt(0).toUpperCase() + domain.slice(1);
    const entriesWithQuery = solvedEntries.filter((e) => e.query);
    const avgTime = entriesWithQuery.filter((e) => e.time).length > 0
      ? Math.round(entriesWithQuery.filter((e) => e.time).reduce((s, e) => s + (e.time || 0), 0) / entriesWithQuery.filter((e) => e.time).length) : 0;
    const bestTime = entriesWithQuery.filter((e) => e.time).length > 0
      ? Math.min(...entriesWithQuery.filter((e) => e.time).map((e) => e.time!)) : 0;
    const firstTryCount = entriesWithQuery.filter((e) => (e.attempts || 1) === 1).length;

    const files: { path: string; content: string }[] = [];

    // 1. Domain README.md — comprehensive portfolio summary
    const vizConfigs = visualizationConfigs[domain] || {};
    const caseList = solvedEntries.map((e, i) => {
      const tier = CASE_TIERS[e.id] || 1;
      const level = tier <= 1 ? 'Beginner' : tier === 2 ? 'Intermediate' : tier === 3 ? 'Advanced' : tier === 4 ? 'Expert' : 'Master';
      const hasViz = !!vizConfigs[e.id];
      return `### ${i + 1}. [${e.name}](./${e.id}/query.sql)${hasViz ? ' 📊' : ''}\n- **Level:** ${level} ${'⭐'.repeat(Math.min(tier, 5))}\n${e.attempts ? `- **Attempts:** ${e.attempts}${(e.attempts || 1) === 1 ? ' (first try!)' : ''}` : ''}\n${e.time ? `- **Solve Time:** ${Math.floor(e.time / 60)}m ${e.time % 60}s` : ''}\n${e.query ? `\n\`\`\`sql\n${e.query}\n\`\`\`\n` : '*(query data not available)*\n'}`;
    }).join('\n');

    files.push({
      path: `${domain}/README.md`,
      content: `# ${dt} SQL Analytics Portfolio\n\n## About\nSQL data analysis projects completed through the **BleepxQuery SwiftLink Training Program**.\n\n| Metric | Value |\n|--------|-------|\n| Domain | **${dt}** |\n| Challenges Solved | **${solvedEntries.length}/${totalCases}** (${pct}%) |\n${avgTime ? `| Avg Solve Time | **${Math.floor(avgTime / 60)}m ${avgTime % 60}s** |\n` : ''}${bestTime ? `| Best Solve Time | **${Math.floor(bestTime / 60)}m ${bestTime % 60}s** |\n` : ''}| First-Try Solves | **${firstTryCount}/${entriesWithQuery.length}** |\n| Visualizations | **${Object.keys(vizConfigs).filter(k => solvedEntries.some(e => e.id === k)).length}** charts |\n\n## Skills Demonstrated\n- **Core SQL:** SELECT, WHERE, ORDER BY, LIMIT, DISTINCT\n- **Aggregation:** GROUP BY, HAVING, COUNT, SUM, AVG, MAX, MIN\n- **Joins:** INNER JOIN, LEFT JOIN, multi-table joins\n- **Advanced:** Window Functions (RANK, LAG, LEAD), CTEs, Subqueries\n- **Analysis:** CASE expressions, date functions, percentage calculations\n- **Real-world:** ${dt} industry data analysis & problem solving\n\n## Datasets\n${tables.map((t) => `### ${t.name}\n- **Rows:** ${t.rowCount.toLocaleString()}\n- **Columns:** ${t.columns.length}\n- **Schema:** \`${t.columns.join('`, `')}\`\n- **Preview:**\n\n| ${t.columns.join(' | ')} |\n| ${t.columns.map(() => '---').join(' | ')} |\n${t.previewRows.slice(0, 3).map(r => `| ${t.columns.map(c => String(r[c] ?? '')).join(' | ')} |`).join('\n')}\n`).join('\n')}\n\n## Projects\n\n${caseList}\n\n## How to Run\n1. Load the CSV datasets into any SQL database (SQLite, PostgreSQL, etc.)\n2. Run each query against the loaded tables\n3. Each challenge folder contains: \`query.sql\`, \`README.md\`, and visualization code\n4. Run \`python run_all.py\` to execute all queries (requires Python + SQLite)\n\n---\n*Generated by [BleepxQuery](https://bleepxacademy.vercel.app) — SwiftLink Training Program*\n`,
    });

    // 2. Per-case files: README, query.sql, and visualization code
    for (const e of solvedEntries) {
      const caseName = e.name;
      const tier = CASE_TIERS[e.id] || 1;
      const level = tier <= 1 ? 'Beginner' : tier === 2 ? 'Intermediate' : tier === 3 ? 'Advanced' : tier === 4 ? 'Expert' : 'Master';
      const caseViz = vizConfigs[e.id];

      // query.sql
      if (e.query) {
        files.push({
          path: `${domain}/${e.id}/query.sql`,
          content: `-- ${caseName}\n-- Domain: ${dt}\n-- Level: ${level}\n-- BleepxQuery SwiftLink Training Program\n--\n${e.attempts ? `-- Attempts: ${e.attempts}${(e.attempts || 1) === 1 ? ' (first try!)' : ''}\n` : ''}${e.time ? `-- Solve Time: ${Math.floor(e.time / 60)}m ${e.time % 60}s\n` : ''}-- Date: ${e.ts ? new Date(e.ts).toLocaleDateString() : 'N/A'}\n\n${e.query}\n`,
        });
      }

      // Per-case README.md
      let caseReadme = `# ${dt} — ${caseName}\n\n**Level:** ${level} ${'⭐'.repeat(Math.min(tier, 5))}\n**Domain:** ${dt}\n`;
      if (e.attempts) caseReadme += `**Attempts:** ${e.attempts}${(e.attempts || 1) === 1 ? ' (first try!)' : ''}\n`;
      if (e.time) caseReadme += `**Solve Time:** ${Math.floor(e.time / 60)}m ${e.time % 60}s\n`;
      if (e.query) caseReadme += `\n### My SQL Query\n\`\`\`sql\n${e.query}\n\`\`\`\n`;

      // Add visualization info if available
      if (caseViz && caseViz.length > 0) {
        caseReadme += `\n### Visualizations\n`;
        caseViz.forEach((v: any, vi: number) => {
          const title = v.layout?.title?.text || `Chart ${vi + 1}`;
          caseReadme += `\n#### ${title}\n\`\`\`sql\n${v.query}\n\`\`\`\n`;
        });
        caseReadme += `\n### How to Run Visualizations\n1. \`pip install pandas plotly\`\n2. \`python visualize.py\`\n3. Open the generated HTML file in your browser\n`;
      }

      caseReadme += `\n---\n*Generated by [BleepxQuery](https://bleepxacademy.vercel.app)*\n`;
      files.push({ path: `${domain}/${e.id}/README.md`, content: caseReadme });

      // Python visualization code (if viz config exists)
      if (caseViz && caseViz.length > 0) {
        const dsFile = datasets[0]?.file?.split('/').pop() || 'data.csv';
        let pyCode = `"""\n${caseName} — ${dt} Domain\nBleepxQuery SwiftLink Training Program\n"""\nimport sqlite3\nimport pandas as pd\nimport plotly.graph_objects as go\nfrom plotly.subplots import make_subplots\n\n# Load datasets\nconn = sqlite3.connect(':memory:')\n`;
        for (const ds of datasets) {
          const fname = ds.file.split('/').pop() || ds.name + '.csv';
          pyCode += `pd.read_csv('../../datasets/${fname}').to_sql('${ds.name}', conn, index=False, if_exists='replace')\n`;
        }
        pyCode += `\n`;
        caseViz.forEach((v: any, vi: number) => {
          const title = v.layout?.title?.text || `Chart ${vi + 1}`;
          pyCode += `# ${title}\ndf${vi} = pd.read_sql_query("""${v.query}""", conn)\nprint(f"${title}: {len(df${vi})} rows")\nprint(df${vi}.head())\n\n`;
        });
        pyCode += `conn.close()\nprint("\\nDone! All queries executed successfully.")\n`;
        files.push({ path: `${domain}/${e.id}/visualize.py`, content: pyCode });
      }
    }

    // 3. CSV datasets
    for (const t of tables) {
      const csvHeader = t.columns.join(',');
      const csvRows = t.fullData.slice(0, 100).map(r => t.columns.map(c => {
        const v = r[c];
        return typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : String(v ?? '');
      }).join(','));
      files.push({
        path: `${domain}/datasets/${t.name}_sample.csv`,
        content: `${csvHeader}\n${csvRows.join('\n')}\n`,
      });
    }

    // 4. Domain-level run_all.py script
    let runAll = `"""\n${dt} Domain — Run All Solved Queries\nBleepxQuery SwiftLink Training Program\n"""\nimport sqlite3\nimport pandas as pd\nimport os\n\n# Load datasets\nconn = sqlite3.connect(':memory:')\ndatasets_dir = os.path.join(os.path.dirname(__file__), 'datasets')\n`;
    for (const ds of datasets) {
      const fname = ds.file.split('/').pop() || ds.name + '.csv';
      runAll += `pd.read_csv(os.path.join(datasets_dir, '${fname.replace('.csv', '_sample.csv')}')).to_sql('${ds.name}', conn, index=False, if_exists='replace')\n`;
    }
    runAll += `\nprint("Datasets loaded. Running queries...\\n")\n\nqueries = {\n`;
    for (const e of solvedEntries) {
      if (e.query) {
        const escaped = e.query.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
        runAll += `    '${e.id}': """${escaped}""",\n`;
      }
    }
    runAll += `}\n\nfor name, sql in queries.items():\n    try:\n        df = pd.read_sql_query(sql, conn)\n        print(f"✓ {name}: {len(df)} rows")\n    except Exception as e:\n        print(f"✗ {name}: {e}")\n\nconn.close()\nprint("\\nDone!")\n`;
    files.push({ path: `${domain}/run_all.py`, content: runAll });

    return files;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
        <span className="ml-2 text-bleepx-text-secondary">*bleep* Loading your dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <section className="bg-bleepx-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Progress Ring */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" className="stroke-bleepx-border" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" className="stroke-bleepx-blue" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct * 2.64} 264`} style={{transition: 'all 1s'}} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-bleepx-text">{pct}%</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-bleepx-text">{domain.charAt(0).toUpperCase() + domain.slice(1)} Progress</h2>
            <p className="text-bleepx-text-secondary mt-1">{completedCount} of {totalCases} challenges completed</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">{solvedEntries.length} solved</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">{totalCases - completedCount} remaining</span>
              {solvedEntries.some((e) => e.time) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium">
                  Avg time: {Math.round(solvedEntries.filter((e) => e.time).reduce((s, e) => s + (e.time || 0), 0) / solvedEntries.filter((e) => e.time).length)}s
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Domain Completion Congratulations */}
      {pct === 100 && (
        <section className="p-6 rounded-xl shadow-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-2 border-green-400 dark:border-green-600 ring-2 ring-green-300 dark:ring-green-700">
          <div className="flex items-start gap-4">
            <span className="text-4xl animate-bounce">🏆</span>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-green-900 dark:text-green-200 mb-1">*bleep* Domain Complete!</h2>
              <p className="text-sm text-green-800 dark:text-green-300 mb-3">
                Congratulations, human. You&apos;ve conquered every challenge in the <strong>{domain.charAt(0).toUpperCase() + domain.slice(1)}</strong> domain.
                Push your SQL portfolio to GitHub to showcase your skills.
              </p>
              {ghUser ? (
                <div>
                  <button
                    disabled={pushing}
                    onClick={async () => {
                      setPushing(true);
                      setPushResult(null);
                      const files = buildPortfolioFiles();
                      const result = await pushPortfolioToGitHub(domain, files, (msg) => setPushMsg(msg));
                      setPushResult(result);
                      setPushing(false);
                      setPushMsg(null);
                    }}
                    className="px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    {pushing ? pushMsg || 'Pushing...' : 'Push Portfolio to GitHub'}
                  </button>
                  {pushResult?.success && (
                    <p className="mt-2 text-sm text-green-800 dark:text-green-300">
                      ✅ Pushed! <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">{pushResult.repoUrl}</a>
                    </p>
                  )}
                  {pushResult?.error && <p className="mt-2 text-sm text-red-700">❌ {pushResult.error}</p>}
                </div>
              ) : (
                <button
                  onClick={() => startGitHubLogin()}
                  className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  Sign In with GitHub to Push
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Case Grid */}
      <section className="bg-bleepx-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-bleepx-text mb-4">Challenge Map</h2>
        <ClientCaseGrid domain={domain} cases={cases} />
      </section>

      {/* Domain Charts — built from CSV data, no SQL needed */}
      {domainCharts.length > 0 && (
        <section className="bg-bleepx-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-bleepx-text mb-4">Data Insights</h2>
          <p className="text-sm text-bleepx-text-secondary mb-4">Visualizations built from the {domain} datasets.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {domainCharts.map((chart, i) => (
              <div key={i} className="border border-bleepx-border rounded-lg p-3 overflow-hidden">
                <Plot
                  data={chart.data}
                  layout={{ ...chart.layout, autosize: true, margin: { t: 50, b: 70, l: 60, r: 30 }, font: { size: 11, color: 'var(--bleepx-text)' }, paper_bgcolor: 'var(--bleepx-white)', plot_bgcolor: 'var(--bleepx-white)' }}
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
        <section className="bg-bleepx-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-bleepx-text mb-4">Performance by Challenge</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-bleepx-border">
                  <th className="text-left py-2 px-3 font-medium text-bleepx-text">Challenge</th>
                  <th className="text-left py-2 px-3 font-medium text-bleepx-text">Attempts</th>
                  <th className="text-left py-2 px-3 font-medium text-bleepx-text">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-bleepx-text">Rating</th>
                </tr>
              </thead>
              <tbody>
                {solvedEntries.map((e) => {
                  const rating = (e.attempts || 1) <= 1 ? '⭐⭐⭐' : (e.attempts || 1) <= 3 ? '⭐⭐' : '⭐';
                  return (
                    <tr key={e.id} className="border-b border-bleepx-border hover:bg-bleepx-blue/5">
                      <td className="py-2 px-3 font-medium text-bleepx-text">{e.name}</td>
                      <td className="py-2 px-3 text-bleepx-text-secondary">{e.attempts || '—'}</td>
                      <td className="py-2 px-3 text-bleepx-text-secondary">{e.time ? `${Math.floor(e.time / 60)}m ${e.time % 60}s` : '—'}</td>
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
      <section className="bg-bleepx-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-bleepx-text mb-4">Your Solved Queries</h2>
        {solvedEntries.length > 0 ? (
          <div className="space-y-3">
            {solvedEntries.map((e) => (
              <div key={e.id} className="border border-bleepx-border rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-bleepx-text">{e.name}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ Solved</span>
                </div>
                <pre className="text-xs text-bleepx-text-secondary bg-gray-900 dark:bg-gray-950 text-green-400 p-2 rounded overflow-x-auto whitespace-pre-wrap">{e.query}</pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-bleepx-text-secondary text-sm">No solved queries yet. Complete cases to see your solutions here.</p>
        )}
      </section>

      {/* Dataset Preview */}
      {tables.length > 0 && (
        <section className="bg-bleepx-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-bleepx-text mb-4">Datasets</h2>
          {tables.map((table) => (
            <div key={table.name} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-lg">{table.name}</h3>
                <span className="text-xs text-bleepx-text-secondary">({table.rowCount} rows, {table.columns.length} columns)</span>
              </div>
              <DataGrid data={table.previewRows} />
            </div>
          ))}
        </section>
      )}

      {/* Portfolio Export — Push to GitHub */}
      <section className="bg-bleepx-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-bleepx-text mb-2">Portfolio & Export</h2>
        <p className="text-sm text-bleepx-text-secondary mb-4">Push your SQL portfolio directly to GitHub, or export a progress report.</p>

        {solvedEntries.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {/* Push to GitHub */}
              {ghUser ? (
                <button
                  disabled={pushing}
                  onClick={async () => {
                    setPushing(true);
                    setPushResult(null);
                    const files = buildPortfolioFiles();
                    const result = await pushPortfolioToGitHub(domain, files, (msg) => setPushMsg(msg));
                    setPushResult(result);
                    setPushing(false);
                    setPushMsg(null);
                  }}
                  className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  {pushing ? pushMsg || 'Pushing...' : 'Push to GitHub'}
                </button>
              ) : (
                <button
                  onClick={() => startGitHubLogin()}
                  className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  Sign In to Push to GitHub
                </button>
              )}
              <button
                onClick={() => {
                  const dt = domain.charAt(0).toUpperCase() + domain.slice(1);
                  const avgT = solvedEntries.filter((e) => e.time).length > 0 ? Math.round(solvedEntries.filter((e) => e.time).reduce((s, e) => s + (e.time || 0), 0) / solvedEntries.filter((e) => e.time).length) : 0;
                  const bestT = solvedEntries.filter((e) => e.time).length > 0 ? Math.min(...solvedEntries.filter((e) => e.time).map((e) => e.time!)) : 0;
                  const ftc = solvedEntries.filter((e) => (e.attempts || 1) === 1).length;
                  const report = `# ${dt} SQL Analytics — Progress Report\n## BleepxQuery SwiftLink Training Program\n\n| Metric | Value |\n|--------|-------|\n| Domain | **${dt}** |\n| Completed | **${completedCount}/${totalCases}** (${pct}%) |\n${avgT ? `| Avg Solve Time | **${Math.floor(avgT / 60)}m ${avgT % 60}s** |\n` : ''}${bestT ? `| Best Solve Time | **${Math.floor(bestT / 60)}m ${bestT % 60}s** |\n` : ''}| First-Try Solves | **${ftc}/${solvedEntries.length}** |\n| Date | **${new Date().toLocaleDateString()}** |\n\n## Datasets Analyzed\n${tables.map((t) => `- **${t.name}** — ${t.rowCount.toLocaleString()} rows, ${t.columns.length} columns (\`${t.columns.slice(0, 6).join('`, `')}\`${t.columns.length > 6 ? ', ...' : ''})`).join('\n')}\n\n## Skills Demonstrated\nSELECT, WHERE, ORDER BY, GROUP BY, HAVING, JOIN, LEFT JOIN, CTE, Window Functions, Subqueries, CASE, Date Functions, Aggregation (COUNT, SUM, AVG, MAX, MIN)\n\n---\n\n## Solved Challenges\n\n${solvedEntries.map((e, i) => `### ${i + 1}. ${e.name}\n${e.attempts ? `- **Attempts:** ${e.attempts}${(e.attempts || 1) === 1 ? ' ✨ first try' : ''}` : ''}\n${e.time ? `- **Solve Time:** ${Math.floor(e.time / 60)}m ${e.time % 60}s` : ''}\n${e.ts ? `- **Date:** ${new Date(e.ts).toLocaleDateString()}` : ''}\n\n\`\`\`sql\n${e.query}\n\`\`\`\n`).join('\n')}\n\n---\n*Generated by [BleepxQuery](https://bleepxacademy.vercel.app) — SwiftLink Training Program*\n`;
                  const blob = new Blob([report], { type: 'text/markdown' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${domain}_progress.md`; a.click();
                }}
                className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
              >
                📄 Progress Report
              </button>
              <button
                onClick={() => {
                  const pdt = domain.charAt(0).toUpperCase() + domain.slice(1);
                  const pAvgT = solvedEntries.filter((e) => e.time).length > 0 ? Math.round(solvedEntries.filter((e) => e.time).reduce((s, e) => s + (e.time || 0), 0) / solvedEntries.filter((e) => e.time).length) : 0;
                  const pFtc = solvedEntries.filter((e) => (e.attempts || 1) === 1).length;
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${pdt} Portfolio</title><style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:20px;color:#1f2937}h1{color:#2563eb;border-bottom:3px solid #2563eb;padding-bottom:8px}h2{margin-top:32px;color:#374151}pre{background:#1e293b;color:#a5f3fc;padding:16px;border-radius:12px;overflow-x:auto;font-size:13px;line-height:1.5}.meta{display:flex;gap:16px;color:#6b7280;font-size:13px;margin:8px 0}.badge{display:inline-block;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-size:13px}th{background:#f3f4f6;font-weight:600}.ds{background:#f0fdf4;border-radius:8px;padding:12px;margin:8px 0;font-size:13px}@media print{body{margin:0}pre{background:#f1f5f9;color:#0f172a}}</style></head><body><h1>${pdt} SQL Analytics Portfolio</h1><p><strong>BleepxQuery SwiftLink Training</strong> | ${new Date().toLocaleDateString()}</p><table><tr><th>Metric</th><th>Value</th></tr><tr><td>Challenges Solved</td><td><strong>${completedCount}/${totalCases}</strong> (${pct}%)</td></tr>${pAvgT ? `<tr><td>Avg Solve Time</td><td>${Math.floor(pAvgT / 60)}m ${pAvgT % 60}s</td></tr>` : ''}<tr><td>First-Try Solves</td><td>${pFtc}/${solvedEntries.length}</td></tr></table><h2>Datasets</h2>${tables.map((t) => `<div class="ds"><strong>${t.name}</strong> — ${t.rowCount.toLocaleString()} rows, ${t.columns.length} cols<br><small>${t.columns.join(', ')}</small></div>`).join('')}<h2>Skills</h2><p>SELECT, WHERE, JOIN, LEFT JOIN, GROUP BY, HAVING, CTE, Window Functions, Subqueries, CASE, Aggregation, Date Functions</p><hr>${solvedEntries.map((e) => `<h2>${e.name} <span class="badge">Solved</span></h2><div class="meta">${e.attempts ? `<span>Attempts: ${e.attempts}${(e.attempts || 1) === 1 ? ' (first try!)' : ''}</span>` : ''}${e.time ? `<span>Time: ${Math.floor(e.time / 60)}m ${e.time % 60}s</span>` : ''}</div><pre>${e.query.replace(/</g,'&lt;')}</pre>`).join('')}<hr><p style="font-size:12px;color:#9ca3af;margin-top:24px">Generated by <a href="https://bleepxacademy.vercel.app" style="color:#2563eb">BleepxQuery</a> — SwiftLink Training Program</p></body></html>`;
                  const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
                  if (w) setTimeout(() => w.print(), 800);
                }}
                className="px-4 py-2 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
              >
                🖨️ Print / PDF
              </button>
            </div>
            {pushResult?.success && (
              <p className="text-sm text-green-700 dark:text-green-400">
                ✅ Portfolio pushed! <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline text-bleepx-blue">{pushResult.repoUrl}</a>
              </p>
            )}
            {pushResult?.error && <p className="text-sm text-red-600">❌ {pushResult.error}</p>}
            <p className="text-xs text-bleepx-text-secondary">Push creates a <code>sql-portfolio-{domain}</code> repo with README, SQL queries, per-case READMEs, Python visualization scripts, sample CSV datasets, and a run_all.py script.</p>
          </div>
        ) : (
          <p className="text-bleepx-text-secondary text-sm">Complete challenges to unlock portfolio export. Capstone and bonus missions make the strongest portfolio pieces!</p>
        )}
        <div className="mt-4 pt-4 border-t border-bleepx-border">
          <Link href={`/cases/${domain}`}>
            <button className="px-4 py-2 border border-bleepx-border rounded-full hover:bg-bleepx-blue/5 transition-colors text-sm text-bleepx-text-secondary">← Back to Cases</button>
          </Link>
        </div>
      </section>
    </div>
  );
}