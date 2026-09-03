'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DataGrid from './DataGrid';
import { initSQL, loadCSV, runQuery } from '@/lib/sqlClient/browser';
import { visualizationConfigs } from '@/lib/constants';
import { useTheme } from '@/lib/useTheme';
import { pushCaseToGitHub } from '@/lib/githubPush';
import { startGitHubLogin } from '@/lib/authClient';
import { useSupabaseUser } from '@/lib/useSupabaseUser';
import { ChartBarIcon, FileTextIcon, CodeIcon } from '@/components/AppIcons';
import { IconPackage, IconCheck, IconX } from '@tabler/icons-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
const Spinner = dynamic(() => import('./Spinner'), { ssr: false });

interface ChartData {
  title: string;
  query: string;
  plotData: any[];
  layout: any;
  rows: Record<string, any>[];
  columns: string[];
}

interface VisualizationProps {
  domain: string;
  caseId: string;
  datasets: { name: string; file: string }[];
  plots?: any[];
}

export default function Visualizations({ domain, caseId, datasets }: VisualizationProps) {
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [selectedChart, setSelectedChart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'chart' | 'data' | 'code'>('chart');
  const { dark } = useTheme();
  const ghUser = useSupabaseUser();
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ success: boolean; repoUrl?: string; error?: string } | null>(null);
  const [userQuery, setUserQuery] = useState<string | null>(null);

  // Load user's saved query from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bleepx_solved_${domain}_${caseId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.query) setUserQuery(parsed.query);
      }
    } catch { /* ignore */ }
  }, [domain, caseId]);

  useEffect(() => {
    let mounted = true;
    async function buildCharts() {
      try {
        await initSQL();
        for (const ds of datasets) {
          try { await loadCSV(ds.name, ds.file); } catch { /* already loaded */ }
        }

        const configs = visualizationConfigs[domain]?.[caseId];
        if (!configs || configs.length === 0) {
          if (mounted) { setError(null); setCharts([]); setLoading(false); }
          return;
        }

        const built: ChartData[] = [];
        for (const cfg of configs) {
          try {
            const { columns, data } = await runQuery(cfg.query);
            const rows = data.map((row: unknown[]) =>
              Object.fromEntries(columns.map((c, i) => [c, row[i]]))
            );
            const plotData = cfg.dataMapper(rows);
            built.push({
              title: cfg.layout?.title?.text || `Chart ${built.length + 1}`,
              query: cfg.query,
              plotData,
              layout: cfg.layout || {},
              rows,
              columns,
            });
          } catch (err) {
            console.warn(`Viz query failed for ${caseId}:`, err);
          }
        }

        if (mounted) { setCharts(built); setLoading(false); }
      } catch (err: any) {
        if (mounted) { setError(err.message || 'Failed to build visualizations'); setLoading(false); }
      }
    }
    buildCharts();
    return () => { mounted = false; };
  }, [domain, caseId, datasets]);

  const currentChart = charts[selectedChart];

  const getJSCode = useCallback(() => {
    if (!currentChart) return '';
    return `// Plotly.js visualization for: ${currentChart.title}
// SQL Query: ${currentChart.query}

const data = ${JSON.stringify(currentChart.plotData, null, 2)};

const layout = ${JSON.stringify({ ...currentChart.layout, autosize: true }, null, 2)};

Plotly.newPlot('chart', data, layout, { responsive: true });`;
  }, [currentChart]);

  const getPythonCode = useCallback(() => {
    if (!currentChart) return '';
    const dsFile = datasets[0]?.file || 'data.csv';
    const chartType = currentChart.plotData[0]?.type || 'bar';
    const xCol = currentChart.columns[0] || 'x';
    const yCol = currentChart.columns[1] || 'y';

    return `"""
${currentChart.title}
SQL: ${currentChart.query}
"""
import pandas as pd
import plotly.express as px

# Load data
df = pd.read_csv('${dsFile}')

# Run equivalent query and plot
# (Adapt the SQL logic in pandas as needed)
${chartType === 'pie'
  ? `fig = px.pie(df, names='${xCol}', values='${yCol}', title='${currentChart.title}')`
  : chartType === 'scatter'
  ? `fig = px.scatter(df, x='${xCol}', y='${yCol}', title='${currentChart.title}')`
  : `fig = px.bar(df, x='${xCol}', y='${yCol}', title='${currentChart.title}')`
}
fig.show()
fig.write_html('${caseId}_chart.html')
print("Chart saved to ${caseId}_chart.html")`;
  }, [currentChart, datasets, caseId]);

  const handleDownloadProject = useCallback(() => {
    if (!currentChart) return;

    const readme = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} — ${currentChart.title}

## SwiftLink Training Program — BleepxQuery

**Domain:** ${domain}
**Case:** ${caseId}
**Skills:** SQL, Data Visualization, ${currentChart.plotData[0]?.type === 'pie' ? 'Pie Charts' : currentChart.plotData[0]?.type === 'scatter' ? 'Line Charts' : 'Bar Charts'}

### SQL Query
\`\`\`sql
${currentChart.query}
\`\`\`

### How to Run
1. Install dependencies: \`pip install pandas plotly\`
2. Run: \`python visualize.py\`
3. Open \`${caseId}_chart.html\` in your browser

### Results
${currentChart.rows.length} rows returned from the query.

---
*Generated by [BleepxQuery](https://bleepxacademy.vercel.app) — SwiftLink Training Program*
`;

    const csvContent = [
      currentChart.columns.join(','),
      ...currentChart.rows.map(row => currentChart.columns.map(c => JSON.stringify(row[c] ?? '')).join(','))
    ].join('\n');

    const htmlPage = `<!DOCTYPE html>
<html><head>
<title>${currentChart.title}</title>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
</head><body>
<h1>${currentChart.title}</h1>
<p>Domain: ${domain} | Case: ${caseId}</p>
<div id="chart"></div>
<script>
${getJSCode()}
</script>
<h2>Data</h2>
<pre>${JSON.stringify(currentChart.rows.slice(0, 10), null, 2)}</pre>
</body></html>`;

    const files: Record<string, string> = {
      'README.md': readme,
      'visualize.py': getPythonCode(),
      'chart.html': htmlPage,
      'chart.js': getJSCode(),
      [`${caseId}_data.csv`]: csvContent,
      'query.sql': currentChart.query,
    };

    Object.entries(files).forEach(([name, content]) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${domain}-${caseId}/${name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }, [currentChart, domain, caseId, datasets, getJSCode, getPythonCode]);

  if (loading) {
    return (
      <div className="flex flex-wrap items-center justify-center p-6 sm:p-8" aria-live="polite">
        <Spinner />
        <span className="ml-2 text-sm text-bleepx-gray">*bleep* Generating visualizations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 rounded-xl shadow-lg text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 max-w-[calc(100vw-1rem)]" role="alert">
        *bleep* Visualization error: {error}
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="p-6 sm:p-8 rounded-xl shadow-sm border text-center bg-bleepx-white border-bleepx-border">
        <div className="mb-3"><ChartBarIcon size={40} className="text-bleepx-text-secondary" /></div>
        <p className="text-sm font-medium text-bleepx-text-secondary">No visualizations configured for this challenge yet.</p>
        <p className="text-xs mt-1 text-bleepx-text-secondary">Visualizations are available for most challenges — try another one!</p>
        <Link href={`/cases/${domain}/${caseId}`} className="text-bleepx-blue text-sm hover:underline mt-3 inline-block">
          ← Back to challenge
        </Link>
      </div>
    );
  }

  const plotBg = dark ? '#1f2937' : 'transparent';
  const plotFont = dark ? '#e5e7eb' : undefined;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Chart selector */}
      {charts.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {charts.map((c, i) => (
            <button
              key={i}
              onClick={() => { setSelectedChart(i); setTab('chart'); }}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                i === selectedChart
                  ? 'bg-bleepx-blue text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-bleepx-gray hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-xl shadow-sm border overflow-hidden bg-bleepx-white border-bleepx-border">
        <div className="flex flex-wrap border-b border-bleepx-border">
          {(['chart', 'data', 'code'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-bleepx-blue border-b-2 border-bleepx-blue bg-blue-50/50 dark:bg-gray-700/50'
                  : 'text-bleepx-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t === 'chart' ? <span className="inline-flex flex-wrap items-center gap-1.5"><ChartBarIcon size={14} className="inline" /> Chart</span> : t === 'data' ? <span className="inline-flex flex-wrap items-center gap-1.5"><FileTextIcon size={14} className="inline" /> Data</span> : <span className="inline-flex flex-wrap items-center gap-1.5"><CodeIcon size={14} className="inline" /> Code</span>}
            </button>
          ))}
        </div>

        <div className="p-3 sm:p-6">
          {tab === 'chart' && currentChart && (
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-3 text-bleepx-text">{currentChart.title}</h3>
              <div className="w-full overflow-x-auto" style={{ minHeight: 300 }}>
                <Plot
                  data={currentChart.plotData}
                  layout={{
                    ...currentChart.layout,
                    autosize: true,
                    margin: { t: 50, b: 80, l: 60, r: 30 },
                    font: { size: 11, color: plotFont },
                    paper_bgcolor: plotBg,
                    plot_bgcolor: plotBg,
                  }}
                  config={{ responsive: true, displayModeBar: true }}
                  className="w-full"
                  style={{ width: '100%', minHeight: 300, maxHeight: 500 }}
                />
              </div>
              <p className="text-xs mt-2 text-bleepx-text-secondary">
                <span className="font-mono px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700">SQL</span>{' '}
                {currentChart.query}
              </p>
            </div>
          )}

          {tab === 'data' && currentChart && (
            <div>
              <div className="flex flex-wrap justify-between items-center mb-3">
                <h3 className="text-base font-bold text-bleepx-text">Query Results</h3>
                <span className="text-xs text-bleepx-text-secondary">{currentChart.rows.length} rows</span>
              </div>
              <div className="overflow-x-auto">
                <DataGrid data={currentChart.rows} />
              </div>
            </div>
          )}

          {tab === 'code' && currentChart && (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-bleepx-text">SQL Query</h4>
                  <button onClick={() => navigator.clipboard.writeText(currentChart.query)} className="text-[10px] text-bleepx-blue hover:underline">Copy</button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words">{currentChart.query}</pre>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-bleepx-text">JavaScript (Plotly.js)</h4>
                  <button onClick={() => navigator.clipboard.writeText(getJSCode())} className="text-[10px] text-bleepx-blue hover:underline">Copy</button>
                </div>
                <pre className="bg-gray-900 text-blue-300 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-[300px]">{getJSCode()}</pre>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-bleepx-text">Python (Plotly Express)</h4>
                  <button onClick={() => navigator.clipboard.writeText(getPythonCode())} className="text-[10px] text-bleepx-blue hover:underline">Copy</button>
                </div>
                <pre className="bg-gray-900 text-yellow-300 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-[300px]">{getPythonCode()}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User's Query */}
      {userQuery && (
        <div className="rounded-xl shadow-sm border p-4 sm:p-6 bg-bleepx-white border-bleepx-border">
          <h3 className="text-base font-bold mb-2 text-bleepx-text">Your SQL Query</h3>
          <p className="text-xs mb-2 text-bleepx-text-secondary">This is the query you wrote to solve this challenge.</p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words">{userQuery}</pre>
        </div>
      )}

      {/* Export section */}
      <div className="rounded-xl shadow-sm border p-4 sm:p-6 bg-bleepx-white border-bleepx-border">
        <h3 className="text-base font-bold mb-2 text-bleepx-text">Export as Portfolio Project</h3>
        <p className="text-xs mb-3 text-bleepx-text-secondary">
          *bleep* Push directly to GitHub or download a complete project with README, SQL, Python, JS, and data.
        </p>
        <div className="flex flex-wrap gap-2">
          {ghUser ? (
            <button
              disabled={pushing}
              onClick={async () => {
                if (!currentChart) return;
                setPushing(true);
                setPushResult(null);
                const domainTitle = domain.charAt(0).toUpperCase() + domain.slice(1);
                const queryToUse = userQuery || currentChart.query;
                const caseName = caseId.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                const csvContent = [
                  currentChart.columns.join(','),
                  ...currentChart.rows.map(row => currentChart.columns.map(c => JSON.stringify(row[c] ?? '')).join(','))
                ].join('\n');

                const files = [
                  {
                    path: `${domain}/${caseId}/README.md`,
                    content: `# ${domainTitle} — ${caseName}\n\n## BleepxQuery SwiftLink Training Program\n\n**Domain:** ${domainTitle}\n**Challenge:** ${caseName}\n**Visualization:** ${currentChart.title}\n\n### My SQL Query\n\`\`\`sql\n${queryToUse}\n\`\`\`\n\n### Visualization Query\n\`\`\`sql\n${currentChart.query}\n\`\`\`\n\n### How to Run\n1. Install dependencies: \`pip install pandas plotly\`\n2. Run: \`python visualize.py\`\n3. Open \`chart.html\` in your browser\n\n### Results\n${currentChart.rows.length} rows returned.\n\n---\n*Generated by [BleepxQuery](https://bleepxacademy.vercel.app) — SwiftLink Training Program*\n`,
                  },
                  {
                    path: `${domain}/${caseId}/query.sql`,
                    content: `-- ${caseName}\n-- Domain: ${domainTitle}\n-- My solution query\n\n${queryToUse}\n`,
                  },
                  {
                    path: `${domain}/${caseId}/visualize.py`,
                    content: getPythonCode(),
                  },
                  {
                    path: `${domain}/${caseId}/chart.js`,
                    content: getJSCode(),
                  },
                  {
                    path: `${domain}/${caseId}/data.csv`,
                    content: csvContent,
                  },
                ];
                const result = await pushCaseToGitHub(domain, caseId, caseName, files, (msg) => setPushMsg(msg));
                setPushResult(result);
                setPushing(false);
                setPushMsg(null);
              }}
              className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex flex-wrap items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              {pushing ? pushMsg || 'Pushing...' : 'Push to GitHub'}
            </button>
          ) : (
            <button
              onClick={() => startGitHubLogin()}
              className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex flex-wrap items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Sign In to Push to GitHub
            </button>
          )}
          <button
            onClick={handleDownloadProject}
            className="px-4 py-2 rounded-full bg-bleepx-blue text-white text-sm hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors"
          >
            <IconPackage size={16} className="inline" /> Download Project Files
          </button>
          <Link
            href={`/cases/${domain}/${caseId}`}
            className="px-4 py-2 rounded-full border text-sm transition-colors border-bleepx-border text-bleepx-gray hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ← Back to Challenge
          </Link>
        </div>
        {pushResult?.success && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            <IconCheck size={16} className="inline" /> Pushed! <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline text-bleepx-blue">{pushResult.repoUrl}</a>
          </p>
        )}
        {pushResult?.error && <p className="mt-2 text-sm text-red-600 inline-flex flex-wrap items-center gap-1.5"><IconX size={16} className="inline" /> {pushResult.error}</p>}
        <p className="text-xs mt-2 text-bleepx-text-secondary">
          Push creates a <code>sql-portfolio</code> repo organized as <code>{domain}/{caseId}/</code> with your query, visualizations, and data.
        </p>
      </div>
    </div>
  );
}