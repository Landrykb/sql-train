'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Link from 'next/link';
import DataGrid from './DataGrid';
import { initSQL, loadCSV, runQuery } from '@/lib/sqlClient/browser';
import { compareResults } from '@/lib/compare';
import { useProgress } from '@/lib/useProgress';
import { fullCaseOrder, caseOrder } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';
import { loadingMessages, queryMessages, getLockedMessage, getDomainCompleteMessage, getNextCaseMessage, getLoadError, pickRandom } from '@/lib/bleepxDialogue';

const Spinner = dynamic(() => import('./Spinner'), { ssr: false });

interface ParseResult<T> {
  data: T[];
  errors: Array<{ message: string; row: number }>;
  meta: { fields?: string[]; delimiter: string; linebreak: string; aborted: boolean; truncated: boolean; cursor: number };
}

interface Dataset {
  name: string;
  file: string;
}

interface CaseData {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  hints?: string[];
  skills?: string[];
  datasets: Dataset[];
  seedQuery?: string;
  templateQuery?: string;
  expected?: any[][];
  solutionQuery?: string;
  domain: string;
  prerequisites?: string[];
  tier: number;
}

type Tab = 'preview' | 'results';

const CodeMirrorFallback: React.FC = () => (
  <textarea
    className="w-full h-[300px] border border-bleepx-gray/20 rounded-lg p-3 text-sm text-bleepx-gray placeholder-gray-400"
    placeholder="Enter your SQL query here, human..."
    aria-label="SQL query editor fallback"
  />
);

const CodeMirror = dynamic(
  async () => {
    try {
      const { default: CM } = await import('@uiw/react-codemirror');
      const { sql } = await import('@codemirror/lang-sql');
      return (props: any) => <CM {...props} basicSetup extensions={[sql()]} />;
    } catch (err) {
      console.error('Failed to load CodeMirror:', err);
      return CodeMirrorFallback;
    }
  },
  { ssr: false, loading: () => <div className="flex items-center justify-center p-4"><Spinner /><span className="ml-2 text-bleepx-gray">Bleepx is loading the editor...</span></div> }
);

const Chip: React.FC<{ label: string; onClick(): void }> = ({ label, onClick }) => (
  <kbd
    onClick={() => {
      new Audio('/bleep.mp3').play();
      onClick();
    }}
    className="cursor-pointer px-3 py-1 m-1 bg-bleepx-blue/10 text-bleepx-gray text-xs rounded-full hover:bg-bleepx-blue/20 transition-all duration-200"
    role="button"
    aria-label={`Insert column ${label}`}
  >
    {label}
  </kbd>
);

const TabButton: React.FC<{ tab: Tab; current: Tab; onSelect(t: Tab): void }> = ({ tab, current, onSelect }) => (
  <button
    onClick={() => {
      new Audio('/bleep.mp3').play();
      onSelect(tab);
    }}
    className={`py-2 px-4 font-medium text-sm transition-all duration-200 ${
      tab === current ? 'border-b-2 border-bleepx-blue text-bleepx-blue' : 'text-bleepx-gray hover:text-bleepx-blue hover:bg-bleepx-blue/5'
    }`}
    aria-selected={tab === current}
    role="tab"
  >
    {tab === 'preview' ? 'Dataset Preview' : 'Query Results'}
  </button>
);

type ValidDomain = 'business' | 'crime' | 'healthcare' | 'farming' | 'space' | 'finance' | 'sports' | 'social';

interface VisualizationConfigs {
  [key: string]: string[];
  business: string[];
  crime: string[];
  healthcare: string[];
  farming: string[];
  space: string[];
  finance: string[];
  sports: string[];
  social: string[];
}

export default function SQLPlayground({ caseData }: { caseData: CaseData }) {
  const { id, name, description, instructions, hints = [], skills = [], datasets, seedQuery = '', templateQuery = '', expected = [], solutionQuery = '', domain: rawDomain, prerequisites = [], tier } = caseData;
  const domain = normalizeDomain(rawDomain) as ValidDomain;
  const { markComplete, completed, isUnlocked } = useProgress();

  const currentOrder = fullCaseOrder[domain] || caseOrder[domain] || [];
  const currentIndex = currentOrder.indexOf(id);
  const nextCaseId = currentIndex >= 0 && currentIndex < currentOrder.length - 1 ? currentOrder[currentIndex + 1] : null;

  const [tables, setTables] = useState<{ name: string; file: string; columns: string[]; previewRows: Record<string, string | number | null>[]; rowCount: number | null }[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(seedQuery);
  const [resultRows, setResultRows] = useState<Record<string, unknown>[]>([]);
  const [tab, setTab] = useState<Tab>('preview');
  const [selectedTable, setSelectedTable] = useState<string | null>(datasets[0]?.name || null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [visibleHints, setVisibleHints] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!caseOrder[domain]) console.error(`Invalid domain: ${domain}`, { rawDomain, availableDomains: Object.keys(caseOrder) });
    console.log('Navigation Debug:', { id, rawDomain, normalizedDomain: domain, completed: Array.from(completed), currentIndex, currentOrder, nextCaseId, prerequisites, isUnlocked: isUnlocked(prerequisites) });
  }, [id, rawDomain, domain, completed, currentIndex, currentOrder, nextCaseId, prerequisites, isUnlocked]);

  const loadAttemptRef = useRef(0);

  useEffect(() => {
    if (!datasets.length) {
      setLoadError('No datasets specified for this case.');
      return;
    }

    const attempt = ++loadAttemptRef.current;
    setDbReady(false);
    setLoadError(null);

    (async () => {
      try {
        console.log('[SQL] init WASM...');
        await initSQL();
        if (attempt !== loadAttemptRef.current) return;
        console.log('[SQL] WASM ready');

        for (const dataset of datasets) {
          if (!/^[a-zA-Z0-9_]+$/.test(dataset.name)) throw new Error(`Invalid dataset name: ${dataset.name}`);
          console.log(`[SQL] loading ${dataset.name} from ${dataset.file}`);
          await loadCSV(dataset.name, dataset.file);
          if (attempt !== loadAttemptRef.current) return;
        }
        console.log('[SQL] all CSVs loaded');

        const tableData = await Promise.all(
          datasets.map(async (dataset) => {
            let sqlColumns: string[] = [];
            try {
              const colRes = await runQuery(`PRAGMA table_info("${dataset.name}");`);
              sqlColumns = colRes.data.length ? colRes.data.map((row) => row[1] as string) : [];
            } catch { /* ignore */ }

            let rowCount = 0;
            try {
              const cntRes = await runQuery(`SELECT COUNT(*) FROM "${dataset.name}"`);
              rowCount = cntRes.data[0]?.[0] as number;
            } catch (err) {
              throw err;
            }

            let previewRows: Record<string, string | number | null>[] = [];
            try {
              const prevRes = await runQuery(`SELECT * FROM "${dataset.name}" LIMIT 5`);
              previewRows = prevRes.data.map((row: unknown[]) => Object.fromEntries(prevRes.columns.map((c, i) => [c, row[i] as string | number | null])));
            } catch { /* ignore */ }

            return { name: dataset.name, file: dataset.file, columns: sqlColumns, previewRows, rowCount };
          })
        );

        if (attempt === loadAttemptRef.current) {
          console.log('[SQL] ready:', tableData.map(t => `${t.name}(${t.rowCount} rows)`));
          setTables(tableData);
          setSelectedTable(tableData[0]?.name || null);
          setDbReady(true);
          setLoadError(null);
        }
      } catch (err) {
        console.error('[SQL] load failed:', err);
        if (attempt === loadAttemptRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          setLoadError(getLoadError(msg));
        }
      }
    })();
  }, [id, datasets]);

  const onRun = useCallback(async () => {
    if (query.length > 1000) {
      setMessage(queryMessages.tooLong);
      return;
    }
    setBusy(true);
    setTab('results');

    try {
      console.log('Running query:', query);
      const { columns: cols, data } = await runQuery(query);
      const grid = data.map((row: unknown[]) => Object.fromEntries(cols.map((c, i) => [c, row[i]]))) as Record<string, string | number | null>[];
      setResultRows(grid);

      if (!expected.length) {
        setMessage(queryMessages.noExpected);
        return;
      }

      const expectedArray = (expected as Record<string, any>[]).map((obj) => cols.map((colName) => obj[colName] as string | number | null));
      const { correct, feedback } = await compareResults(grid, expectedArray, solutionQuery, query, skills);
      setMessage(feedback);
      setAttempts((a) => a + 1);

      if (correct && !completed.has(id)) {
        console.log('Correct answer! Marking complete:', id);
        markComplete(id, tier);
        setShowSuccess(true);
        setVisibleHints(hints.length);

        const allCompleted = currentOrder.length > 0 && currentOrder.every((caseId) => completed.has(caseId) || caseId === id);
        console.log('Completion Check:', { currentOrder, completed: Array.from(completed), allCompleted, nextCaseId });

        if (allCompleted && currentOrder.length > 0) {
          setMessage(getDomainCompleteMessage(domain));
          setTimeout(() => {
            setShowSuccess(false);
            console.log('Redirecting to:', `/cases/${domain}/dashboard`);
            window.location.href = `/cases/${domain}/dashboard`;
          }, 800);
        } else if (nextCaseId) {
          setMessage(getNextCaseMessage(nextCaseId));
          setTimeout(() => {
            setShowSuccess(false);
            console.log('Redirecting to:', `/cases/${domain}/${nextCaseId}`);
            window.location.href = `/cases/${domain}/${nextCaseId}`;
          }, 1200);
        } else {
          setMessage('*bleep* Mission complete. Head back to the domain hub for your next assignment.');
          setTimeout(() => {
            setShowSuccess(false);
            console.log('Redirecting to:', `/cases/${domain}`);
            window.location.href = `/cases/${domain}`;
          }, 1200);
        }
      } else if (attempts + 1 < hints.length) {
        setVisibleHints((v) => Math.min(v + 1, hints.length));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Query error:', msg);
      setResultRows([]);
      setMessage(msg.includes('circular reference') ? `*bleep* Circular reference detected: ${msg}. Rename your CTEs (e.g., "returns" → "return_data").` : `${pickRandom(queryMessages.error)} — ${msg}`);
      setAttempts((a) => a + 1);
      if (attempts + 1 < hints.length) setVisibleHints((v) => Math.min(v + 1, hints.length));
    } finally {
      setBusy(false);
    }
  }, [query, expected, solutionQuery, id, markComplete, attempts, hints.length, completed, skills, domain, currentOrder, nextCaseId, tier]);

  const tryExampleQuery = useCallback(() => {
    setQuery(templateQuery || seedQuery);
    setMessage('');
    setResultRows([]);
    setTab('preview');
  }, [templateQuery, seedQuery]);

  const canRun = useMemo(() => dbReady && query.trim() !== '' && !busy, [dbReady, query, busy]);

  const visualizationConfigs: VisualizationConfigs = {
    business: ['agg_revenue', 'joins_returns'],
    crime: ['crime_by_area'],
    healthcare: ['diagnosis_count'],
    farming: ['yield_by_crop'],
    space: ['velocity_by_type'],
    finance: ['balance_trend'],
    sports: ['score_by_team'],
    social: ['engagement_by_type'],
  };

  const hasVisualizations = useMemo(() => {
    return visualizationConfigs[domain]?.includes(id);
  }, [domain, id]);

  if (!isUnlocked(prerequisites)) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-gradient-to-b from-gray-50 to-bleepx-blue/10 min-h-screen">
        <div className="p-6 bg-yellow-100 text-yellow-800 rounded-xl shadow-lg" role="alert">
          <div className="flex items-center gap-2">
            <img src="/bleepx-logo.png" alt="Bleepx" className="h-5 w-5" />
            <span>{getLockedMessage(prerequisites)}</span>
          </div>
          <div className="mt-4">
            <Link href={`/cases/${domain}`}>
              <button className="px-4 py-2 rounded-full bg-bleepx-blue text-white hover:bg-bleepx-pink transition-all duration-200">Back to Challenges</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-gradient-to-b from-gray-50 to-bleepx-blue/10 min-h-screen">
        <div className="p-6 bg-yellow-100 text-yellow-800 rounded-xl shadow-lg" role="alert">{loadError}</div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center p-8"><Spinner /><span className="ml-2 text-bleepx-gray">Loading...</span></div>}>
        <div className="flex items-center justify-center p-8" aria-live="polite">
          <Spinner />
          <span className="ml-2 text-bleepx-gray">{pickRandom(loadingMessages)}</span>
        </div>
      </Suspense>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 bg-gradient-to-b from-gray-50 to-bleepx-blue/10 min-h-screen">
      <nav className="text-xs sm:text-sm font-medium text-bleepx-blue overflow-x-auto" aria-label="Breadcrumb">
        <ol className="flex space-x-1.5 sm:space-x-2 items-center whitespace-nowrap">
          <li><Link href="/" className="hover:underline">Home</Link></li>
          <li className="text-gray-400">/</li>
          <li className="hidden sm:block"><Link href="/cases" className="hover:underline">Challenges</Link></li>
          <li className="hidden sm:block text-gray-400">/</li>
          <li><Link href={`/cases/${domain}`} className="hover:underline">{domain.charAt(0).toUpperCase() + domain.slice(1).replace('_', ' ')}</Link></li>
          <li className="text-gray-400">/</li>
          <li className="text-bleepx-gray font-semibold truncate max-w-[120px] sm:max-w-none">{name}</li>
        </ol>
      </nav>

      <header className="bg-gradient-to-r from-bleepx-blue/10 to-bleepx-pink/10 p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <img src="/bleepx-logo.png" alt="Bleepx" className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse-logo" />
            <h1 className="text-xl sm:text-3xl font-bold text-bleepx-gray">{name}</h1>
          </div>
          <span className="text-xs sm:text-sm text-bleepx-gray">Mission {currentIndex >= 0 ? currentIndex + 1 : '?'} of {currentOrder.length || '?'} — Tier {tier}</span>
        </div>
        <p className="mt-2 text-bleepx-gray">{instructions || description}</p>
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <strong className="text-sm text-bleepx-gray mr-2">Skills:</strong>
            {skills.map((skill) => (
              <span key={skill} className="inline-block bg-bleepx-blue/10 text-bleepx-gray text-xs px-2 py-1 rounded-full">{skill}</span>
            ))}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-lg">
            <h2 className="text-base sm:text-lg font-semibold text-bleepx-gray mb-3 sm:mb-4">Write Your Query</h2>
            <CodeMirror
              value={query}
              height="200px"
              onChange={setQuery}
              aria-label="SQL query editor"
              className="border border-bleepx-gray/20 rounded-lg"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {tables.map((table) => table.columns.map((c) => (
                <Chip key={`${table.name}.${c}`} label={`${table.name}.${c}`} onClick={() => setQuery((q) => `${q.replace(/;?\s*$/, '')} ${table.name}.${c} `)} />
              )))}
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={() => {
                  new Audio('/bleep.mp3').play();
                  onRun();
                }}
                disabled={!canRun}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-sm sm:text-base font-medium transition-all duration-200 ${canRun ? 'bg-bleepx-blue hover:bg-bleepx-pink' : 'bg-gray-400 cursor-not-allowed'}`}
                aria-disabled={!canRun}
              >
                Run Query
              </button>
              <button
                onClick={() => {
                  new Audio('/bleep.mp3').play();
                  setQuery('');
                  setMessage('');
                  setResultRows([]);
                  setTab('preview');
                  setAttempts(0);
                  setShowSolution(false);
                  setVisibleHints(1);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-bleepx-gray/20 text-bleepx-gray text-sm sm:text-base hover:bg-bleepx-blue/5 transition-all duration-200"
              >
                Clear
              </button>
              {(templateQuery || seedQuery) && (
                <button
                  onClick={() => {
                    new Audio('/bleep.mp3').play();
                    tryExampleQuery();
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-bleepx-gray/20 text-bleepx-gray text-sm sm:text-base hover:bg-bleepx-blue/5 transition-all duration-200"
                >
                  Example
                </button>
              )}
              {attempts >= 3 && !showSolution && (
                <button
                  onClick={() => {
                    new Audio('/bleep.mp3').play();
                    setShowSolution(true);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-bleepx-gray/20 text-bleepx-gray text-sm sm:text-base hover:bg-bleepx-blue/5 transition-all duration-200"
                >
                  Solution
                </button>
              )}
              {hasVisualizations && (
                <Link href={`/cases/${domain}/${id}/visualizations`}>
                  <button className="px-4 py-2 rounded-full bg-bleepx-pink text-white hover:bg-bleepx-blue transition-all duration-200">
                    View Visualizations
                  </button>
                </Link>
              )}
            </div>
            {message && (
              <div
                className={`p-4 rounded-xl font-medium transition-all duration-500 ${
                  message.includes('Correct') || message.includes('Moving') || message.includes('cleared')
                    ? 'bg-bleepx-blue/20 text-bleepx-gray'
                    : message.startsWith('*bleep* Syntax') || message.startsWith('*bleep* Circular') || message.includes('Error')
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-bleepx-blue/10 text-bleepx-gray'
                } ${showSuccess ? 'animate-pulse' : ''}`}
                role="status"
              >
                <div className="flex items-center gap-2">
                  <img src="/bleepx-logo.png" alt="Bleepx" className="h-5 w-5" />
                  <span>{message}</span>
                </div>
                {message.includes('cleared') && (
                  <div className="mt-4">
                    <Link href={`/cases/${domain}/dashboard`}>
                      <button className="px-4 py-2 rounded-full bg-bleepx-blue text-white hover:bg-bleepx-pink transition-all duration-200">View Dashboard</button>
                    </Link>
                  </div>
                )}
              </div>
            )}
            {showSolution && solutionQuery && (
              <div className="bg-bleepx-gray/5 p-4 rounded-xl shadow-sm">
                <h3 className="text-sm font-semibold text-bleepx-gray mb-2">*bleep* Fine. Here's how I'd do it:</h3>
                <pre className="text-sm text-bleepx-gray whitespace-pre-wrap" aria-label="Solution query">{solutionQuery}</pre>
              </div>
            )}
          </div>

          {hints.length > 0 && (
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-lg">
              <h2 className="text-base sm:text-lg font-semibold text-bleepx-gray mb-3 sm:mb-4">Intel from Bleepx</h2>
              <ul className="list-disc pl-5 text-sm text-bleepx-gray space-y-2">
                {hints.slice(0, visibleHints).map((h, i) => {
                  const m = h.match(/Review the (\w+)/);
                  return (
                    <li key={i}>
                      {h}{' '}
                      {m && (
                        <a
                          href={`/cases/guide?fromDomain=${domain}&fromCase=${id}#${m[1].toLowerCase()}`}
                          className="text-bleepx-blue hover:underline ml-1"
                          rel="noopener"
                        >
                          (open SwiftLink GuideBook)
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
              {visibleHints < hints.length && attempts > 0 && (
                <button
                  onClick={() => {
                    new Audio('/bleep.mp3').play();
                    setVisibleHints((v) => Math.min(v + 1, hints.length));
                  }}
                  className="mt-4 px-3 py-1 text-sm bg-bleepx-blue/10 hover:bg-bleepx-blue/20 rounded-full transition-all duration-200"
                >
                  Show Next Hint
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-lg">
            <h2 className="text-base sm:text-lg font-semibold text-bleepx-gray mb-3 sm:mb-4">Dataset & Results</h2>
            <div className="flex border-b border-bleepx-gray/20">
              <TabButton tab="preview" current={tab} onSelect={setTab} />
              <TabButton tab="results" current={tab} onSelect={setTab} />
            </div>
            {tab === 'preview' && datasets.length > 1 && (
              <div className="mt-4">
                <select
                  value={selectedTable || ''}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="mb-4 p-2 border border-bleepx-gray/20 rounded-lg text-sm text-bleepx-gray"
                  aria-label="Select dataset to preview"
                >
                  {tables.map((table) => (
                    <option key={table.name} value={table.name}>{table.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="mt-3 sm:mt-4 min-h-[200px] sm:min-h-[300px] overflow-x-auto">
              {tab === 'preview' ? (
                <DataGrid data={tables.find((t) => t.name === selectedTable)?.previewRows || []} />
              ) : busy ? (
                <div className="flex items-center" aria-live="polite">
                  <Spinner />
                  <span className="ml-2 text-bleepx-gray">{queryMessages.processing}</span>
                </div>
              ) : (
                <DataGrid data={resultRows} />
              )}
            </div>
            <div className="mt-4 text-sm text-bleepx-gray">
              {tables.map((table) => (
                <div key={table.name} className="mb-2">
                  <p><strong>Dataset:</strong> <code>{table.file}</code></p>
                  <p><strong>Table:</strong> <code>{table.name}</code></p>
                  {table.rowCount !== null && <p><strong>Rows:</strong> {table.rowCount}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}