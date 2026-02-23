'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Link from 'next/link';
import DataGrid from './DataGrid';
import DiffGrid from './DiffGrid';
import Papa from 'papaparse';
import { initSQL, loadCSV, runQuery } from '@/lib/sqlClient/browser';
import { compareResults } from '@/lib/compare';
import { useProgress } from '@/lib/useProgress';
import { fullCaseOrder, caseOrder, visualizationConfigs } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';
import { loadingMessages, queryMessages, getLockedMessage, getDomainCompleteMessage, getNextCaseMessage, getLoadError, pickRandom, alternativeMessages } from '@/lib/bleepxDialogue';
import { playBleep } from '@/lib/audio';
import { useTheme } from '@/lib/useTheme';

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
  thoughtProcess?: string[];
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
      const { oneDark } = await import('@codemirror/theme-one-dark');
      return (props: any & { isDark?: boolean }) => {
        const { isDark, ...rest } = props;
        const exts = isDark ? [sql(), oneDark] : [sql()];
        return <CM {...rest} basicSetup extensions={exts} theme={isDark ? 'dark' : 'light'} />;
      };
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
      playBleep();
      onClick();
    }}
    className="cursor-pointer px-3 py-1 m-1 bg-bleepx-blue/10 text-bleepx-gray text-xs rounded-full hover:bg-bleepx-blue/20 transition-all duration-200"
    role="button"
    aria-label={`Insert column ${label}`}
  >
    {label}
  </kbd>
);

type ValidDomain = 'business' | 'crime' | 'healthcare' | 'farming' | 'space' | 'finance' | 'sports' | 'social';

export default function SQLPlayground({ caseData }: { caseData: CaseData }) {
  const { id, name, description, instructions, hints = [], thoughtProcess = [], skills = [], datasets, seedQuery = '', templateQuery = '', expected = [], solutionQuery = '', domain: rawDomain, prerequisites = [], tier } = caseData;
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
  const [selectedTable, setSelectedTable] = useState<string | null>(datasets[0]?.name || null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [visibleHints, setVisibleHints] = useState(1);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [nextDestination, setNextDestination] = useState<{ url: string; label: string } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [savedQuery, setSavedQuery] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<{ query: string; ts: number; success: boolean | null }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [showExpected, setShowExpected] = useState(false);
  const [diffData, setDiffData] = useState<{ actual: Record<string, any>[]; expected: Record<string, any>[]; cols: string[] } | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { dark } = useTheme();

  useEffect(() => {
    if (!caseOrder[domain]) console.error(`Invalid domain: ${domain}`, { rawDomain, availableDomains: Object.keys(caseOrder) });
    console.log('Navigation Debug:', { id, rawDomain, normalizedDomain: domain, completed: Array.from(completed), currentIndex, currentOrder, nextCaseId, prerequisites, isUnlocked: isUnlocked(prerequisites) });
  }, [id, rawDomain, domain, completed, currentIndex, currentOrder, nextCaseId, prerequisites, isUnlocked]);

  // Load saved query + history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bleepx_solved_${domain}_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedQuery(parsed.query);
        if (!seedQuery && parsed.query) setQuery(parsed.query);
      }
    } catch { /* ignore */ }
    try {
      const hist = localStorage.getItem(`bleepx_history_${domain}_${id}`);
      if (hist) setQueryHistory(JSON.parse(hist));
    } catch { /* ignore */ }
    // Test mode: auto-start timer for capstone/hidden cases
    try {
      const profile = JSON.parse(localStorage.getItem('bleepx_profile') || '{}');
      if (profile.testModeEnabled && (id.startsWith('capstone') || id.startsWith('hidden_'))) {
        setTimerEnabled(true);
      }
    } catch { /* ignore */ }
  }, [domain, id]);

  // Timer
  useEffect(() => {
    if (timerEnabled && dbReady) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerEnabled, dbReady]);

  // Countdown for auto-navigation after success
  useEffect(() => {
    if (nextDestination && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            window.location.href = nextDestination.url;
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [nextDestination, countdown > 0]);

  // Replay saved query once DB is ready
  useEffect(() => {
    if (dbReady && savedQuery && resultRows.length === 0) {
      (async () => {
        try {
          const result = await runQuery(savedQuery);
          const cols = result?.columns ?? [];
          const data = result?.data ?? [];
          const grid = data.map((row: unknown[]) => Object.fromEntries(cols.map((c, i) => [c, row[i]]))) as Record<string, string | number | null>[];
          setResultRows(grid);
        } catch { /* ignore replay errors */ }
      })();
    }
  }, [dbReady, savedQuery]);

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
            } catch (err) { console.error(`[SQL] PRAGMA failed for ${dataset.name}:`, err); }

            let rowCount = 0;
            try {
              const cntRes = await runQuery(`SELECT COUNT(*) FROM "${dataset.name}"`);
              rowCount = cntRes.data[0]?.[0] as number;
            } catch (err) {
              throw err;
            }

            let previewRows: Record<string, string | number | null>[] = [];
            try {
              const url = dataset.file.startsWith('/datasets/') ? dataset.file : `/datasets/${dataset.file}`;
              const csvResp = await fetch(url);
              if (csvResp.ok) {
                const csvText = await csvResp.text();
                const parsed = Papa.parse(csvText.trim().replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true, preview: 5 });
                previewRows = (parsed.data as Record<string, any>[]).map((row) => {
                  const out: Record<string, string | number | null> = {};
                  for (const key of Object.keys(row)) {
                    const v = row[key];
                    out[key] = v === '' || v === undefined ? null : v;
                  }
                  return out;
                });
                console.log(`[SQL] preview for ${dataset.name}: ${previewRows.length} rows from CSV`);
              }
            } catch (err) { console.error(`[SQL] preview failed for ${dataset.name}:`, err); }

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

  const addHistory = useCallback((q: string, success: boolean | null) => {
    setQueryHistory((prev) => {
      const next = [{ query: q, ts: Date.now(), success }, ...prev].slice(0, 50);
      try { localStorage.setItem(`bleepx_history_${domain}_${id}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [domain, id]);

  const onRun = useCallback(async () => {
    if (query.length > 1000) {
      setMessage(queryMessages.tooLong);
      setAttempts((a) => a + 1);
      addHistory(query, false);
      setHasRun(true);
      return;
    }
    const trimmed = query.trim().toUpperCase();
    if (trimmed && !trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH') && !trimmed.startsWith('PRAGMA')) {
      setMessage('*bleep* Only SELECT / WITH queries are allowed here, human.');
      setAttempts((a) => a + 1);
      addHistory(query, false);
      setHasRun(true);
      return;
    }
    if (trimmed && (/(^|\s)(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\s/i.test(query))) {
      setMessage('*bleep* Nice try. Destructive statements are blocked.');
      setAttempts((a) => a + 1);
      addHistory(query, false);
      setHasRun(true);
      return;
    }
    setBusy(true);
    setDiffData(null);
    setShowDiff(false);

    try {
      console.log('[SQL] Running query:', query);
      setHasRun(true);
      const result = await runQuery(query);
      console.log('[SQL] Query result:', { columns: result?.columns, rowCount: result?.data?.length });
      const cols = result?.columns ?? [];
      const data = result?.data ?? [];
      const grid = data.map((row: unknown[]) => Object.fromEntries(cols.map((c, i) => [c, row[i]]))) as Record<string, string | number | null>[];
      console.log('[SQL] Grid built:', { gridLength: grid.length, firstRow: grid[0] });
      setResultRows(grid);
      // Scroll to results after a short delay for React to render
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      setAttempts((a) => a + 1);

      if (!expected.length) {
        addHistory(query, null);
        setMessage(queryMessages.noExpected);
        return;
      }

      const expectedArray = (expected as Record<string, any>[]).map((obj) => cols.map((colName) => obj[colName] as string | number | null));
      const { correct, feedback, alternative } = await compareResults(grid, expectedArray, solutionQuery, query, skills);
      const finalFeedback = correct
        ? alternative
          ? pickRandom(alternativeMessages)
          : pickRandom(queryMessages.correct)
        : feedback;
      setMessage(finalFeedback);
      addHistory(query, correct);

      if (!correct && expected.length > 0) {
        const expGrid = (expected as Record<string, any>[]);
        const expCols = expGrid.length > 0 ? Object.keys(expGrid[0]) : cols;
        setDiffData({ actual: grid, expected: expGrid, cols: expCols });
      } else {
        setDiffData(null);
      }

      if (correct && !completed.has(id)) {
        console.log('Correct answer! Marking complete:', id);
        markComplete(id, tier);
        setShowSuccess(true);
        setVisibleHints(hints.length);
        if (timerRef.current) clearInterval(timerRef.current);
        try { localStorage.setItem(`bleepx_solved_${domain}_${id}`, JSON.stringify({ query, ts: Date.now(), time: timerSeconds, attempts: attempts + 1 })); } catch { /* ignore */ }

        const allCompleted = currentOrder.length > 0 && currentOrder.every((caseId) => completed.has(caseId) || caseId === id);

        if (allCompleted && currentOrder.length > 0) {
          setNextDestination({ url: `/cases/${domain}/dashboard`, label: 'View Dashboard' });
        } else if (nextCaseId) {
          const nextName = nextCaseId.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          setNextDestination({ url: `/cases/${domain}/${nextCaseId}`, label: `Next: ${nextName}` });
        } else {
          setNextDestination({ url: `/cases/${domain}`, label: 'Back to Domain' });
        }
        setCountdown(30);
      } else if (attempts + 1 < hints.length) {
        setVisibleHints((v) => Math.min(v + 1, hints.length));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Query error:', msg);
      setResultRows([]);
      addHistory(query, false);
      setMessage(msg.includes('circular reference') ? `*bleep* Circular reference detected: ${msg}. Rename your CTEs (e.g., "returns" → "return_data").` : `${pickRandom(queryMessages.error)} — ${msg}`);
      setAttempts((a) => a + 1);
      if (attempts + 1 < hints.length) setVisibleHints((v) => Math.min(v + 1, hints.length));
    } finally {
      setBusy(false);
    }
  }, [query, expected, solutionQuery, id, markComplete, attempts, hints.length, completed, skills, domain, currentOrder, nextCaseId, tier, addHistory, timerSeconds]);

  const tryExampleQuery = useCallback(() => {
    const example = templateQuery || seedQuery;
    setQuery(example);
    setMessage('*bleep* Example query loaded. Review it, adapt it, then hit Run when ready.');
    setResultRows([]);
  }, [templateQuery, seedQuery]);

  const canRun = useMemo(() => dbReady && query.trim() !== '' && !busy, [dbReady, query, busy]);

  const hasVisualizations = useMemo(() => {
    return (visualizationConfigs[domain]?.[id]?.length ?? 0) > 0;
  }, [domain, id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canRun) onRun();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setQuery(''); setMessage(''); setResultRows([]); setAttempts(0); setShowSolution(false); setVisibleHints(1); setDiffData(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canRun, onRun]);

  if (!isUnlocked(prerequisites)) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-bleepx-bg min-h-screen">
        <div className="p-6 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-xl shadow-lg" role="alert">
          <div className="flex items-center gap-2">
            <img src="/bleepx-logo.png" alt="Bleepx" className="h-5 w-5" />
            <span>{getLockedMessage(prerequisites)}</span>
          </div>
          <div className="mt-4">
            <Link href={`/cases/${domain}`}>
                <button className="px-4 py-2 rounded-full bg-bleepx-blue text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition-all duration-200">Back to Challenges</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-bleepx-bg min-h-screen">
        <div className="p-6 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-xl shadow-lg" role="alert">{loadError}</div>
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

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 min-h-screen transition-colors bg-bleepx-bg text-bleepx-text">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 text-xs">
        <button onClick={() => { setTimerEnabled((v) => !v); if (!timerEnabled) setTimerSeconds(0); }} className={`px-2 py-1 rounded-full border transition-colors border-bleepx-border bg-bleepx-white text-bleepx-text-secondary ${timerEnabled ? 'ring-2 ring-bleepx-blue' : ''}`}>
          ⏱️ {timerEnabled ? fmtTime(timerSeconds) : 'Timer'}
        </button>
        {(id.startsWith('capstone') || id.startsWith('hidden_')) && timerEnabled && (
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            🧪 TEST MODE
          </span>
        )}
        <span className="hidden sm:inline px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">⌘/Ctrl+Enter = Run · ⌘/Ctrl+Shift+C = Clear</span>
      </div>

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
          <span className="text-xs sm:text-sm text-bleepx-gray">Mission {currentIndex >= 0 ? currentIndex + 1 : '?'} of {currentOrder.length || '?'} — {tier <= 1 ? 'Beginner' : tier === 2 ? 'Intermediate' : tier === 3 ? 'Advanced' : tier === 4 ? 'Expert' : 'Master'} {'⭐'.repeat(Math.min(tier || 1, 5))}</span>
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

      <div className="space-y-4 sm:space-y-6">
        {/* 1. Write Your Query — always on top */}
        <div className="p-3 sm:p-6 rounded-xl shadow-lg bg-bleepx-white">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-bleepx-gray">Write Your Query</h2>
          <CodeMirror
            value={query}
            height="200px"
            onChange={setQuery}
            isDark={dark}
            aria-label="SQL query editor"
            className="border rounded-lg border-bleepx-border"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => setShowSchema((v) => !v)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${showSchema ? 'bg-bleepx-blue text-white border-bleepx-blue' : 'border-bleepx-border text-bleepx-text-secondary hover:bg-bleepx-blue/5'}`}>
              {showSchema ? '✕ Hide Schema' : '📋 Schema Explorer'}
            </button>
            {expected.length > 0 && (
              <button onClick={() => setShowExpected((v) => !v)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${showExpected ? 'bg-green-600 text-white border-green-600' : 'border-bleepx-border text-bleepx-text-secondary hover:bg-bleepx-blue/5'}`}>
                {showExpected ? '✕ Hide Expected' : '🎯 Expected Output'}
              </button>
            )}
            <button onClick={() => setShowHistory((v) => !v)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${showHistory ? 'bg-purple-600 text-white border-purple-600' : 'border-bleepx-border text-bleepx-text-secondary hover:bg-bleepx-blue/5'}`}>
              {showHistory ? '✕ Hide History' : `📜 History (${queryHistory.length})`}
            </button>
          </div>
          {/* Schema Explorer */}
          {showSchema && tables.length > 0 && (
            <div className="mt-3 rounded-lg border p-3 text-xs bg-bleepx-bg border-bleepx-border">
              {tables.map((table) => (
                <div key={table.name} className="mb-3 last:mb-0">
                  <div className="font-semibold text-sm mb-1 flex items-center gap-1">
                    <span>🗂️</span>
                    <button onClick={() => setQuery((q) => `${q.replace(/;?\s*$/, '')} ${table.name} `)} className="hover:text-bleepx-blue cursor-pointer">
                      {table.name}
                    </button>
                    <span className="text-[10px] ml-1 text-bleepx-text-secondary">({table.rowCount} rows)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-5">
                    {table.columns.map((c) => (
                      <button key={c} onClick={() => { playBleep(); setQuery((q) => `${q.replace(/;?\s*$/, '')} ${c} `); }} className="px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors bg-bleepx-white hover:bg-bleepx-blue/10 text-bleepx-text-secondary border border-bleepx-border">
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Expected Output Preview */}
          {showExpected && expected.length > 0 && (
            <div className="mt-3 rounded-lg border p-3 text-xs bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <p className="font-semibold text-sm mb-2">🎯 Expected Output Shape</p>
              <p><strong>Columns:</strong> {expected.length > 0 ? Object.keys((expected as Record<string, any>[])[0]).join(', ') : '—'}</p>
              <p><strong>Rows:</strong> {expected.length}</p>
              <p className="mt-1 italic text-bleepx-text-secondary">Match these columns and row count to pass.</p>
            </div>
          )}
          {/* Query History */}
          {showHistory && (
            <div className="mt-3 rounded-lg border p-3 text-xs max-h-[200px] overflow-y-auto bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <p className="font-semibold text-sm mb-2">📜 Query History</p>
              {queryHistory.length === 0 ? (
                <p className="text-bleepx-text-secondary">No queries yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {queryHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 p-1.5 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30" onClick={() => { setQuery(h.query); setShowHistory(false); }}>
                      <span className="flex-shrink-0 mt-0.5">{h.success === true ? '✅' : h.success === false ? '❌' : '⚪'}</span>
                      <pre className="truncate flex-1 font-mono text-bleepx-text">{h.query}</pre>
                      <span className="flex-shrink-0 text-[10px] text-bleepx-text-secondary">{new Date(h.ts).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => {
                playBleep();
                onRun();
              }}
              data-run-btn
              disabled={!canRun}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-sm sm:text-base font-medium transition-all duration-200 ${canRun ? 'bg-bleepx-blue hover:bg-blue-700 dark:hover:bg-blue-500' : 'bg-gray-400 cursor-not-allowed'}`}
              aria-disabled={!canRun}
            >
              Run Query
            </button>
            <button
              onClick={() => {
                playBleep();
                setQuery('');
                setMessage('');
                setResultRows([]);
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
                  playBleep();
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
                  playBleep();
                  setShowSolution(true);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-bleepx-gray/20 text-bleepx-gray text-sm sm:text-base hover:bg-bleepx-blue/5 transition-all duration-200"
              >
                Solution
              </button>
            )}
            <Link href={`/cases/${domain}/${id}/visualizations`}>
              <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-600 text-white text-sm sm:text-base hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all duration-200">
                📊 Visualizations
              </button>
            </Link>
          </div>
          {message && (
            <div
              className={`mt-4 p-4 rounded-xl font-medium transition-all duration-500 ${
                message.includes('Correct') || message.includes('Moving') || message.includes('cleared')
                  ? 'bg-bleepx-blue/20 text-bleepx-gray'
                  : message.startsWith('*bleep* Syntax') || message.startsWith('*bleep* Circular') || message.includes('Error')
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  : 'bg-bleepx-blue/10 text-bleepx-gray'
              } ${showSuccess ? 'animate-pulse' : ''}`}
              role="status"
            >
              <div className="flex items-center gap-2">
                <img src="/bleepx-logo.png" alt="Bleepx" className="h-5 w-5" />
                <span>{message}</span>
              </div>
            </div>
          )}
          {showSolution && (
            <div className="mt-4 bg-bleepx-gray/5 p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-semibold text-bleepx-gray mb-2">*bleep* Fine. Here's how I'd do it:</h3>
              {solutionQuery ? (
                <pre className="text-sm text-bleepx-gray whitespace-pre-wrap" aria-label="Solution query">{solutionQuery}</pre>
              ) : (
                <p className="text-sm text-bleepx-gray italic">*bleep* No solution available for this challenge. You're on your own, human.</p>
              )}
            </div>
          )}
        </div>

        {/* 2. Hints & Thought Process — right below the query editor */}
        {(hints.length > 0 || thoughtProcess.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hints.length > 0 && (
              <div className="bg-bleepx-white p-3 sm:p-5 rounded-xl shadow-lg">
                <h2 className="text-base font-semibold text-bleepx-gray mb-2">Intel from Bleepx</h2>
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
                      playBleep();
                      setVisibleHints((v) => Math.min(v + 1, hints.length));
                    }}
                    className="mt-3 px-3 py-1 text-sm bg-bleepx-blue/10 hover:bg-bleepx-blue/20 rounded-full transition-all duration-200"
                  >
                    Show Next Hint
                  </button>
                )}
              </div>
            )}

            {thoughtProcess.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-3 sm:p-5 rounded-xl shadow-lg border border-amber-200/60 dark:border-amber-700/40">
                <button
                  onClick={() => {
                    playBleep();
                    setShowThoughtProcess((v) => !v);
                  }}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <span className="text-lg">💡</span> How to Think About This
                  </h2>
                  <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">{showThoughtProcess ? 'Hide' : 'Show'} Guide</span>
                </button>
                {showThoughtProcess && (
                  <div className="mt-4 space-y-3">
                    {thoughtProcess.slice(0, visibleSteps).map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{step}</p>
                      </div>
                    ))}
                    {visibleSteps < thoughtProcess.length && (
                      <button
                        onClick={() => {
                          playBleep();
                          setVisibleSteps((v) => Math.min(v + 1, thoughtProcess.length));
                        }}
                        className="mt-2 px-4 py-1.5 text-sm font-medium bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-800/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 rounded-full transition-all duration-200"
                      >
                        Next Step ({visibleSteps}/{thoughtProcess.length})
                      </button>
                    )}
                    {visibleSteps >= thoughtProcess.length && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 italic">You&apos;ve seen the full thought process. Now try writing the query!</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Success / Transition Panel */}
        {showSuccess && nextDestination && (
          <div className="p-4 sm:p-6 rounded-xl shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">🎉</span>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-300 mb-1">*bleep* Outstanding work, human!</h2>
                <p className="text-sm text-green-700 dark:text-green-400 mb-1">You cracked it{timerEnabled && timerSeconds > 0 ? ` in ${Math.floor(timerSeconds / 60)}m ${timerSeconds % 60}s` : ''}{attempts > 0 ? ` with ${attempts} attempt${attempts !== 1 ? 's' : ''}` : ''}. Your query results are below — take a moment to review them.</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-2">Moving to <strong>{nextDestination.label}</strong> in <strong>{countdown}s</strong>. You can stay here to review, or head there now.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); window.location.href = nextDestination.url; }}
                    className="px-4 py-2 rounded-full bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    {nextDestination.label} →
                  </button>
                  <button
                    onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); setNextDestination(null); setCountdown(0); setShowSuccess(false); }}
                    className="px-4 py-2 rounded-full border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    Stay & Review
                  </button>
                  {hasVisualizations && (
                    <Link href={`/cases/${domain}/${id}/visualizations`}>
                      <button className="px-4 py-2 rounded-full border border-green-400 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors">
                        View Visualizations
                      </button>
                    </Link>
                  )}
                </div>
                <div className="mt-3 w-full bg-green-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(countdown / 30) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Query Results — always visible */}
        <div ref={resultsRef} className={`p-3 sm:p-6 rounded-xl shadow-lg transition-all bg-bleepx-white ${!hasRun && !busy ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-bleepx-gray">
              Query Results
              {!busy && resultRows.length > 0 && <span className="text-xs font-normal ml-2 text-bleepx-text-secondary">({resultRows.length} row{resultRows.length !== 1 ? 's' : ''})</span>}
            </h2>
            {diffData && (
              <button onClick={() => setShowDiff((v) => !v)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${showDiff ? 'bg-red-600 text-white border-red-600' : 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
                {showDiff ? '✕ Hide Diff' : '🔍 Show Diff'}
              </button>
            )}
          </div>
          <div className="min-h-[80px] sm:min-h-[120px] overflow-x-auto">
            {busy ? (
              <div className="flex items-center" aria-live="polite">
                <Spinner />
                <span className="ml-2 text-bleepx-gray">{queryMessages.processing}</span>
              </div>
            ) : !hasRun ? (
              <div className="flex flex-col items-center justify-center py-6 text-bleepx-text-secondary">
                <span className="text-3xl mb-2">📊</span>
                <p className="text-sm font-medium">Run a query to see results here</p>
                <p className="text-xs mt-1">Press ⌘/Ctrl+Enter or click Run Query</p>
              </div>
            ) : showDiff && diffData ? (
              <DiffGrid actual={diffData.actual} expected={diffData.expected} expectedColumns={diffData.cols} />
            ) : resultRows.length > 0 ? (
              <DataGrid data={resultRows} />
            ) : (
              <p className="text-sm text-bleepx-text-secondary">Query returned 0 rows.</p>
            )}
          </div>
        </div>

        {/* 5. Dataset Preview — always visible */}
        <div className="p-3 sm:p-6 rounded-xl shadow-lg bg-bleepx-white">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-bleepx-gray">Dataset Preview</h2>
          {datasets.length > 1 && (
            <div className="mb-4">
              <select
                value={selectedTable || ''}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="p-2 border rounded-lg text-sm border-bleepx-border bg-bleepx-white text-bleepx-gray"
                aria-label="Select dataset to preview"
              >
                {tables.map((table) => (
                  <option key={table.name} value={table.name}>{table.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="min-h-[120px] sm:min-h-[200px] overflow-x-auto">
            <DataGrid data={tables.find((t) => t.name === selectedTable)?.previewRows || []} />
          </div>
          <div className="mt-4 text-sm text-bleepx-text-secondary">
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
  );
}