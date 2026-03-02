'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DataGrid from './DataGrid';
import DiffGrid from './DiffGrid';
import SqlDiff from './SqlDiff';
import { initSQL, loadCSV, runQuery } from '@/lib/sqlClient/browser';
import { compareResults } from '@/lib/compare';
import { useProgress } from '@/lib/useProgress';
import { fullCaseOrder, caseOrder, visualizationConfigs, trialDifficulties, testModeTimeLimits } from '@/lib/constants';
import type { TrialDifficulty } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';
import { loadingMessages, queryMessages, getLockedMessage, getDomainCompleteMessage, getNextCaseMessage, getLoadError, pickRandom, alternativeMessages } from '@/lib/bleepxDialogue';
import { playBleep } from '@/lib/audio';
import { useTheme } from '@/lib/useTheme';
import { getSqlErrorHelp } from '@/lib/sqlErrorHelper';
import GuideModal from './GuideModal';
import { FREE_HINTS, HINT_COST, SKIP_COST, TRIAL_UNLOCK_COST, getStoreState, getActivePerks, purchaseSkip as purchaseSkipFn, unlockTrial as unlockTrialFn } from '@/lib/pointsStore';

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
        const sqlExt = sql({ upperCaseKeywords: true });
        const exts = isDark ? [sqlExt, oneDark] : [sqlExt];
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

type ValidDomain = 'business' | 'crime' | 'healthcare' | 'farming' | 'space' | 'finance' | 'sports' | 'social' | 'trials';

export default function SQLPlayground({ caseData, guideData }: { caseData: CaseData; guideData?: any }) {
  const { id, name, description, instructions, hints = [], thoughtProcess = [], skills = [], datasets, seedQuery = '', templateQuery = '', expected = [], solutionQuery = '', domain: rawDomain, prerequisites = [], tier } = caseData;
  const domain = normalizeDomain(rawDomain) as ValidDomain;
  const router = useRouter();
  const { markComplete, completed, isUnlocked, points, spendPoints } = useProgress();

  const currentOrder = fullCaseOrder[domain] || caseOrder[domain] || [];
  const currentIndex = currentOrder.indexOf(id);
  const nextCaseId = currentIndex >= 0 && currentIndex < currentOrder.length - 1 ? currentOrder[currentIndex + 1] : null;

  const [tables, setTables] = useState<{ name: string; file: string; columns: string[]; previewRows: Record<string, string | number | null>[]; rowCount: number | null }[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [resultRows, setResultRows] = useState<Record<string, unknown>[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(datasets[0]?.name || null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionView, setSolutionView] = useState<'diff' | 'clean'>('diff');
  const [visibleHints, setVisibleHints] = useState(1);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [nextDestination, setNextDestination] = useState<{ url: string; label: string } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
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
  const [trialBriefing, setTrialBriefing] = useState(false); // show start screen for trials
  const [selectedDifficulty, setSelectedDifficulty] = useState<TrialDifficulty | null>(null);
  const [timeLimit, setTimeLimit] = useState(0); // countdown from this value (seconds)
  const [showTestModePicker, setShowTestModePicker] = useState(false); // in-trial test mode toggle
  const [timeExpired, setTimeExpired] = useState(false);
  const { dark } = useTheme();
  const editorViewRef = useRef<any>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSection, setGuideSection] = useState<string | undefined>(undefined);
  const [errorHelp, setErrorHelp] = useState<{ title: string; explanation: string; suggestions: string[]; guideSection?: string } | null>(null);
  const [skippedCases, setSkippedCases] = useState<string[]>(() => { try { return getStoreState().skippedCases; } catch { return []; } });

  const insertAtCursor = useCallback((text: string) => {
    const view = editorViewRef.current;
    if (view) {
      const pos = view.state.selection.main.head;
      view.dispatch({ changes: { from: pos, insert: text } });
      view.focus();
    } else {
      setQuery((q) => q + text);
    }
  }, []);

  const isTrial = domain === 'trials' || id.startsWith('trial_');
  const prevCaseId = currentIndex > 0 ? currentOrder[currentIndex - 1] : null;

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
    // Show trial briefing for trial challenges (don't auto-start)
    if (isTrial) {
      setTrialBriefing(true);
    } else {
      // For non-trial challenges, check test mode
      try {
        const profile = JSON.parse(localStorage.getItem('bleepx_profile') || '{}');
        if (profile.testModeEnabled) {
          const limit = id.startsWith('capstone') ? testModeTimeLimits.capstone
            : id.startsWith('hidden_') ? testModeTimeLimits.hidden
            : testModeTimeLimits.regular;
          setTimeLimit(limit);
          setTimerSeconds(limit);
          setTimerEnabled(true);
        }
      } catch { /* ignore */ }
    }
  }, [domain, id]);

  // Timer — counts DOWN if timeLimit > 0, counts UP otherwise
  useEffect(() => {
    if (timerEnabled && dbReady && !timeExpired) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (timeLimit > 0) {
            // Countdown mode
            if (s <= 1) {
              setTimeExpired(true);
              return 0;
            }
            return s - 1;
          }
          // Count-up mode
          return s + 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerEnabled, dbReady, timeExpired, timeLimit]);

  // Auto-scroll to success panel when it appears
  useEffect(() => {
    if (showSuccess && nextDestination && successRef.current) {
      setTimeout(() => successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
  }, [showSuccess, nextDestination]);

  // Countdown for auto-navigation after success
  useEffect(() => {
    if (nextDestination && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            router.push(nextDestination.url);
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
              const previewRes = await runQuery(`SELECT * FROM "${dataset.name}" LIMIT 5`);
              previewRows = previewRes.data.map((row) => {
                const out: Record<string, string | number | null> = {};
                previewRes.columns.forEach((col, i) => { out[col] = row[i] as string | number | null; });
                return out;
              });
              console.log(`[SQL] preview for ${dataset.name}: ${previewRows.length} rows from DB`);
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
    if (query.length > 3000) {
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
    setErrorHelp(null);

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
        try { localStorage.setItem(`bleepx_solved_${domain}_${id}`, JSON.stringify({ query, ts: Date.now(), time: timerSeconds, attempts: attempts + 1, tier })); } catch { /* ignore */ }

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
      const help = getSqlErrorHelp(msg, query);
      setErrorHelp(help);
      setMessage(`${pickRandom(queryMessages.error)} — ${msg}`);
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

  if (!isTrial && !isUnlocked(prerequisites) && !skippedCases.includes(id)) {
    const skipPerks = getActivePerks();
    const skipCost = skipPerks.effectiveSkipCost;
    const canSkip = points >= skipCost;
    return (
      <div className="max-w-6xl mx-auto p-8 bg-bleepx-bg min-h-screen">
        <div className="p-6 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-xl shadow-lg" role="alert">
          <div className="flex items-center gap-2">
            <img src="/bleepx-logo.png" alt="Bleepx" className="h-5 w-5" />
            <span>{getLockedMessage(prerequisites)}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/cases/${domain}`}>
                <button className="px-4 py-2 rounded-full bg-bleepx-blue text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition-all duration-200">Back to Challenges</button>
            </Link>
            <button
              onClick={() => {
                if (!canSkip) return;
                if (!window.confirm(`Skip this prerequisite for ${skipCost} pts?\n\nYour balance: ${points} pts → ${points - skipCost} pts`)) return;
                playBleep();
                const result = purchaseSkipFn(id, points);
                if (result.success) {
                  spendPoints(skipCost);
                  setSkippedCases(result.store.skippedCases);
                }
              }}
              disabled={!canSkip}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                canSkip ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canSkip ? `⚡ Skip Prerequisite (${skipCost} pts)` : `🔒 Need ${skipCost} pts to skip`}
            </button>
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

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!dbReady && !trialBriefing) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center p-8"><Spinner /><span className="ml-2 text-bleepx-gray">Loading...</span></div>}>
        <div className="flex items-center justify-center p-8" aria-live="polite">
          <Spinner />
          <span className="ml-2 text-bleepx-gray">{pickRandom(loadingMessages)}</span>
        </div>
      </Suspense>
    );
  }

  // Start a trial with a selected difficulty (title perks add bonus time)
  const startTrial = (diff: TrialDifficulty) => {
    const trialPerks = getActivePerks();
    const totalTime = diff.timeLimitSeconds + trialPerks.trialTimeBonus;
    setSelectedDifficulty(diff);
    setTimeLimit(totalTime);
    setTimerSeconds(totalTime);
    setTimerEnabled(true);
    setTrialBriefing(false);
    setTimeExpired(false);
    setShowTestModePicker(false);
  };

  // Start practice mode (no timer)
  const startPractice = () => {
    setSelectedDifficulty(null);
    setTimeLimit(0);
    setTimerSeconds(0);
    setTimerEnabled(false);
    setTrialBriefing(false);
    setTimeExpired(false);
  };

  // Activate test mode mid-trial (from toolbar toggle)
  const activateTestMode = (diff: TrialDifficulty) => {
    const trialPerks = getActivePerks();
    const totalTime = diff.timeLimitSeconds + trialPerks.trialTimeBonus;
    setSelectedDifficulty(diff);
    setTimeLimit(totalTime);
    setTimerSeconds(totalTime);
    setTimerEnabled(true);
    setTimeExpired(false);
    setShowTestModePicker(false);
  };

  // Deactivate test mode (back to practice)
  const deactivateTestMode = () => {
    setSelectedDifficulty(null);
    setTimeLimit(0);
    setTimerSeconds(0);
    setTimerEnabled(false);
    setTimeExpired(false);
    setShowTestModePicker(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Trial briefing overlay
  if (trialBriefing && isTrial) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-16 min-h-screen flex flex-col items-center justify-center bg-bleepx-bg text-bleepx-text">
        <div className="w-full bg-bleepx-white rounded-2xl shadow-2xl p-6 sm:p-10 border border-bleepx-border">
          <div className="flex items-center gap-3 mb-6">
            <img src="/bleepx-logo.png" alt="Bleepx" className="h-10 w-10 animate-pulse-logo" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-gray">{name}</h1>
              <p className="text-sm text-bleepx-text-secondary">Trial Challenge</p>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-bleepx-blue/10 to-bleepx-pink/10">
            <p className="text-sm text-bleepx-gray">{instructions || description}</p>
          </div>

          {/* Practice Mode — always available */}
          <div className="mb-6">
            <button
              onClick={() => { playBleep(); startPractice(); }}
              className="w-full p-4 rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:shadow-lg hover:scale-[1.01] transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📝</span>
                <span className="font-bold text-bleepx-gray">Practice Mode</span>
                <span className="ml-auto text-xs font-mono font-bold text-blue-600 dark:text-blue-400">No timer</span>
              </div>
              <p className="text-xs text-bleepx-text-secondary">Take your time — no countdown. You can toggle test mode anytime from the toolbar.</p>
            </button>
          </div>

          {/* Test Mode — timed difficulties */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-bleepx-gray mb-2">🧪 Test Mode</h2>
            <p className="text-xs text-bleepx-text-secondary mb-4">Start with a countdown. Higher difficulty = less time, more glory. You can also switch to test mode anytime during practice.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trialDifficulties.map((diff) => {
                const storeNow = getStoreState();
                const isDiffUnlocked = storeNow.unlockedTrials.includes(diff.id);
                const unlockCost = TRIAL_UNLOCK_COST[diff.id] ?? 0;
                const canAffordUnlock = points >= unlockCost;
                return (
                  <button
                    key={diff.id}
                    onClick={() => {
                      if (isDiffUnlocked) {
                        playBleep();
                        startTrial(diff);
                      } else if (canAffordUnlock) {
                        if (!window.confirm(`Unlock ${diff.label} difficulty for ${unlockCost} pts?\n\nYour balance: ${points} pts → ${points - unlockCost} pts`)) return;
                        playBleep();
                        const result = unlockTrialFn(diff.id, points);
                        if (result.success) {
                          spendPoints(unlockCost);
                        }
                      }
                    }}
                    disabled={!isDiffUnlocked && !canAffordUnlock}
                    className={`group relative p-4 rounded-xl border-2 text-left transition-all ${
                      !isDiffUnlocked ? 'opacity-75 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                      : diff.id === 'legendary' || diff.id === 'senior_pro'
                      ? 'border-purple-400 dark:border-purple-600 hover:border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:shadow-lg hover:scale-[1.02]'
                      : diff.id === 'elite'
                      ? 'border-red-300 dark:border-red-700 hover:border-red-400 bg-red-50/50 dark:bg-red-900/10 hover:shadow-lg hover:scale-[1.02]'
                      : diff.id === 'advanced'
                      ? 'border-yellow-300 dark:border-yellow-700 hover:border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10 hover:shadow-lg hover:scale-[1.02]'
                      : 'border-green-300 dark:border-green-700 hover:border-green-400 bg-green-50/50 dark:bg-green-900/10 hover:shadow-lg hover:scale-[1.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{isDiffUnlocked ? diff.emoji : '🔒'}</span>
                      <span className="font-bold text-bleepx-gray">{diff.label}</span>
                      <span className="ml-auto text-xs font-mono font-bold text-bleepx-text-secondary">
                        {isDiffUnlocked ? fmtTime(diff.timeLimitSeconds) : `${unlockCost} pts to unlock`}
                      </span>
                    </div>
                    <p className="text-xs text-bleepx-text-secondary">
                      {isDiffUnlocked ? diff.description : canAffordUnlock ? 'Tap to unlock this difficulty' : `Need ${unlockCost} pts`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link href={`/cases/${domain}`}>
              <button className="px-4 py-2 rounded-full border border-bleepx-border text-sm text-bleepx-text-secondary hover:bg-bleepx-blue/5 transition-colors">← Back to Trials</button>
            </Link>
            <p className="text-xs text-bleepx-text-secondary">*bleep* Practice freely or test yourself, human.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-6xl mx-auto px-3 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 min-h-screen transition-colors bg-bleepx-bg text-bleepx-text">
      {/* Time expired overlay */}
      {timeExpired && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-bleepx-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
            <img src="/bleepx-logo.png" alt="Bleepx" className="h-12 w-12 mx-auto mb-4 opacity-60" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Time&apos;s Up!</h2>
            <p className="text-sm text-bleepx-text-secondary mb-4">
              *bleep* The clock has spoken, human. {selectedDifficulty ? `${selectedDifficulty.label} difficulty — ${selectedDifficulty.description.split('—')[0].trim()}.` : 'Time limit reached.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => { setTimeExpired(false); setTimerEnabled(false); setTimeLimit(0); }} className="px-5 py-2.5 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-bleepx-blue/90 transition-colors">Continue Without Timer</button>
              {isTrial && <button onClick={() => { setTimeExpired(false); setTrialBriefing(true); setTimerEnabled(false); }} className="px-5 py-2.5 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-bleepx-blue/5 transition-colors">Try Again</button>}
              {nextCaseId && <Link href={`/cases/${domain}/${nextCaseId}`}><button className="px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors">Next Case →</button></Link>}
            </div>
          </div>
        </div>
      )}

      {/* Next Case bar for completed challenges */}
      {completed.has(id) && !showSuccess && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold text-sm">✓ Completed</span>
            {prevCaseId && (
              <Link href={`/cases/${domain}/${prevCaseId}`}>
                <button className="px-3 py-1 rounded-full text-xs border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors">← Previous</button>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {nextCaseId ? (
              <Link href={`/cases/${domain}/${nextCaseId}`}>
                <button className="px-4 py-1.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">Next Case →</button>
              </Link>
            ) : (
              <Link href={`/cases/${domain}/dashboard`}>
                <button className="px-4 py-1.5 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-bleepx-blue/90 transition-colors shadow-sm">View Dashboard</button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 text-xs relative">
        {!isTrial && (
          <button onClick={() => {
            if (timerEnabled) { setTimerEnabled(false); setTimeLimit(0); setTimerSeconds(0); }
            else { setTimerSeconds(0); setTimerEnabled(true); }
          }} className={`px-2 py-1 rounded-full border transition-colors border-bleepx-border bg-bleepx-white text-bleepx-text-secondary ${timerEnabled ? 'ring-2 ring-bleepx-blue' : ''}`}>
            ⏱️ {timerEnabled ? fmtTime(timerSeconds) : 'Timer'}
          </button>
        )}
        {/* Trial: test mode toggle + countdown display */}
        {isTrial && !timerEnabled && (
          <button
            onClick={() => setShowTestModePicker((v) => !v)}
            className={`px-3 py-1.5 rounded-full border-2 transition-all font-medium ${
              showTestModePicker ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-2 ring-amber-300'
              : 'border-bleepx-border bg-bleepx-white text-bleepx-text-secondary hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10'
            }`}
          >
            🧪 Test Mode
          </button>
        )}
        {isTrial && timerEnabled && (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold font-mono shadow-sm ${
              timerSeconds <= 30 ? 'bg-red-600 text-white animate-pulse' :
              timerSeconds <= 60 ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
              'bg-bleepx-blue/10 text-bleepx-blue'
            }`}>
              ⏱ {fmtTime(timerSeconds)} {selectedDifficulty && <span className="text-xs ml-1">{selectedDifficulty.emoji} {selectedDifficulty.label}</span>}
            </span>
            <button
              onClick={deactivateTestMode}
              className="px-2 py-1 rounded-full border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
              title="Stop test mode"
            >
              ✕ Stop
            </button>
            <button
              onClick={() => setShowTestModePicker((v) => !v)}
              className="px-2 py-1 rounded-full border border-bleepx-border text-bleepx-text-secondary hover:bg-bleepx-blue/5 transition-colors"
              title="Change difficulty"
            >
              ↻ Change
            </button>
          </div>
        )}
        {/* Test mode difficulty picker dropdown (for trials) */}
        {isTrial && showTestModePicker && (
          <div className="absolute right-0 top-full mt-2 z-40 w-72 bg-bleepx-white rounded-xl shadow-2xl border border-bleepx-border p-3 space-y-2">
            <p className="text-xs font-bold text-bleepx-gray mb-2">Select difficulty — countdown starts immediately</p>
            {trialDifficulties.map((diff) => {
              const storeNow = getStoreState();
              const isDiffUnlocked = storeNow.unlockedTrials.includes(diff.id);
              const unlockCost = TRIAL_UNLOCK_COST[diff.id] ?? 0;
              const canAffordUnlock = points >= unlockCost;
              return (
                <button
                  key={diff.id}
                  onClick={() => {
                    if (isDiffUnlocked) {
                      playBleep();
                      activateTestMode(diff);
                    } else if (canAffordUnlock) {
                      if (!window.confirm(`Unlock ${diff.label} for ${unlockCost} pts?`)) return;
                      playBleep();
                      const result = unlockTrialFn(diff.id, points);
                      if (result.success) spendPoints(unlockCost);
                    }
                  }}
                  disabled={!isDiffUnlocked && !canAffordUnlock}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all text-xs ${
                    !isDiffUnlocked ? 'opacity-60 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                    : 'border-bleepx-border hover:border-bleepx-blue hover:bg-bleepx-blue/5'
                  }`}
                >
                  <span className="font-bold">{isDiffUnlocked ? diff.emoji : '🔒'} {diff.label}</span>
                  <span className="ml-auto float-right font-mono">{isDiffUnlocked ? fmtTime(diff.timeLimitSeconds) : `${unlockCost} pts`}</span>
                </button>
              );
            })}
            <button onClick={() => setShowTestModePicker(false)} className="w-full text-center text-xs text-bleepx-text-secondary hover:text-bleepx-blue py-1">Cancel</button>
          </div>
        )}
        {!isTrial && timerEnabled && timeLimit > 0 && (
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
            timerSeconds <= 60 ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          }`}>
            🧪 TEST MODE — {fmtTime(timerSeconds)}
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
            onCreateEditor={(view: any) => { editorViewRef.current = view; }}
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
                    <button onClick={() => insertAtCursor(table.name + ' ')} className="hover:text-bleepx-blue cursor-pointer">
                      {table.name}
                    </button>
                    <span className="text-[10px] ml-1 text-bleepx-text-secondary">({table.rowCount} rows)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-5">
                    {table.columns.map((c) => (
                      <button key={c} onClick={() => { playBleep(); insertAtCursor(c + ' '); }} className="px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors bg-bleepx-white hover:bg-bleepx-blue/10 text-bleepx-text-secondary border border-bleepx-border">
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
            <div className="mt-4 flex items-start gap-2.5" role="status">
              <img src="/bleepx-logo.png" alt="Bleepx" className="h-7 w-7 rounded-full ring-2 ring-bleepx-blue/30 flex-shrink-0 mt-0.5" />
              <div
                className={`relative px-4 py-3 rounded-2xl rounded-tl-sm shadow-md max-w-[90%] text-sm font-medium transition-all duration-500 ${
                  message.includes('Correct') || message.includes('Moving') || message.includes('cleared')
                    ? 'bg-gradient-to-r from-blue-100 to-sky-100 dark:from-blue-900/40 dark:to-sky-900/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700'
                    : message.startsWith('*bleep* Syntax') || message.startsWith('*bleep* Circular') || message.includes('Error')
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-700'
                    : 'bg-gradient-to-r from-slate-100 to-blue-50 dark:from-slate-800/60 dark:to-blue-900/30 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600'
                } ${showSuccess ? 'animate-pulse' : ''}`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-bleepx-blue/70 mb-1">Bleepx</span>
                <span>{message}</span>
              </div>
            </div>
          )}
          {errorHelp && (
            <div className="mt-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm animate-fade-in">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200 flex items-center gap-2 mb-2">
                <span>🔍</span> {errorHelp.title}
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mb-3 leading-relaxed">{errorHelp.explanation}</p>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-red-800 dark:text-red-200">How to fix:</p>
                {errorHelp.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
              {errorHelp.guideSection && guideData && (
                <button
                  onClick={() => { setGuideSection(errorHelp.guideSection); setGuideOpen(true); }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors"
                >
                  <span>📖</span> Open {errorHelp.guideSection.toUpperCase()} in GuideBook
                </button>
              )}
            </div>
          )}
          {showSolution && (
            <div className="mt-4 bg-bleepx-gray/5 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-bleepx-gray">*bleep* Fine. Here&apos;s how I&apos;d do it:</h3>
                {solutionQuery && (
                  <div className="flex rounded-full bg-gray-200 dark:bg-gray-700 p-0.5 text-[11px] font-medium">
                    <button
                      onClick={() => setSolutionView('diff')}
                      className={`px-3 py-1 rounded-full transition-colors ${solutionView === 'diff' ? 'bg-bleepx-blue text-white shadow-sm' : 'text-bleepx-text-secondary hover:text-bleepx-text'}`}
                    >
                      Diff
                    </button>
                    <button
                      onClick={() => setSolutionView('clean')}
                      className={`px-3 py-1 rounded-full transition-colors ${solutionView === 'clean' ? 'bg-bleepx-blue text-white shadow-sm' : 'text-bleepx-text-secondary hover:text-bleepx-text'}`}
                    >
                      Clean
                    </button>
                  </div>
                )}
              </div>
              {solutionQuery ? (
                <>
                  {solutionView === 'diff' ? (
                    <>
                      <SqlDiff userQuery={query} solutionQuery={solutionQuery} />
                      <div className="mt-2 flex gap-3 text-[10px] text-bleepx-text-secondary">
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-200 dark:bg-green-900/50" /> Missing from your query</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-200 dark:bg-red-900/50" /> Extra in your query</span>
                      </div>
                    </>
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap leading-relaxed text-bleepx-gray bg-gray-900 dark:bg-gray-950 text-green-400 p-3 rounded-lg overflow-x-auto">{solutionQuery}</pre>
                  )}
                </>
              ) : (
                <p className="text-sm text-bleepx-gray italic">*bleep* No solution available for this challenge. You&apos;re on your own, human.</p>
              )}
            </div>
          )}
        </div>

        {/* 2. Hints, Thought Process & GuideBook — right below the query editor */}
        {(
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hints.length > 0 && (
              <div className="bg-bleepx-white p-3 sm:p-5 rounded-xl shadow-lg">
                <h2 className="text-base font-semibold text-bleepx-gray mb-2">Intel from Bleepx</h2>
                <ul className="list-disc pl-5 text-sm text-bleepx-gray space-y-2">
                  {hints.slice(0, visibleHints).map((h, i) => {
                    const hStr = typeof h === 'string' ? h : String(h);
                    const m = hStr.match(/Review the (\w+)/);
                    return (
                      <li key={i}>
                        {h}{' '}
                        {m && guideData && (
                          <button
                            onClick={() => { setGuideSection(m[1].toLowerCase()); setGuideOpen(true); }}
                            className="text-bleepx-blue hover:underline ml-1 cursor-pointer"
                          >
                            (open SwiftLink GuideBook)
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {visibleHints < hints.length && attempts > 0 && (() => {
                  const perks = getActivePerks();
                  const needsPayment = visibleHints >= perks.totalFreeHints;
                  const hintCost = perks.effectiveHintCost;
                  const canAfford = points >= hintCost;
                  return (
                    <button
                      onClick={() => {
                        if (needsPayment) {
                          if (!canAfford) return;
                          if (!window.confirm(`Unlock next hint for ${hintCost} pts?\n\nYour balance: ${points} pts → ${points - hintCost} pts`)) return;
                          spendPoints(hintCost);
                        }
                        playBleep();
                        setVisibleHints((v) => Math.min(v + 1, hints.length));
                      }}
                      disabled={needsPayment && !canAfford}
                      className={`mt-3 px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                        needsPayment && !canAfford
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-bleepx-blue/10 hover:bg-bleepx-blue/20'
                      }`}
                    >
                      {needsPayment ? (canAfford ? `🔓 Unlock Hint (${hintCost} pts)` : `🔒 Need ${hintCost} pts`) : 'Show Next Hint'}
                    </button>
                  );
                })()}
                <div className="mt-4 pt-3 border-t border-bleepx-border">
                  <button
                    onClick={() => { setGuideSection(undefined); setGuideOpen(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                    <span>📖</span> Open SQL GuideBook
                  </button>
                </div>
              </div>
            )}

            {!hints.length && (
              <div className="bg-bleepx-white p-3 sm:p-5 rounded-xl shadow-lg flex flex-col justify-center">
                <p className="text-sm text-bleepx-text-secondary mb-3">Need help with SQL syntax?</p>
                <button
                  onClick={() => { setGuideSection(undefined); setGuideOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors w-fit">
                  <span>📖</span> Open SQL GuideBook
                </button>
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
          <div ref={successRef} className="p-4 sm:p-6 rounded-xl shadow-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-2 border-green-400 dark:border-green-600 animate-fade-in ring-2 ring-green-300 dark:ring-green-700">
            <div className="flex items-start gap-3">
              <img src="/bleepx-logo.png" alt="Bleepx" className="h-12 w-12 flex-shrink-0 animate-bounce rounded-full ring-2 ring-green-400" />
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-200 mb-2">*bleep* Outstanding work, human!</h2>
                <p className="text-sm text-green-800 dark:text-green-300 mb-2">
                  You cracked it
                  {timeLimit > 0 && selectedDifficulty
                    ? ` on ${selectedDifficulty.emoji} ${selectedDifficulty.label} with ${fmtTime(timeLimit - timerSeconds)} remaining`
                    : timerEnabled && timerSeconds > 0 ? ` in ${fmtTime(timerSeconds)}` : ''}
                  {attempts > 0 ? ` with ${attempts} attempt${attempts !== 1 ? 's' : ''}` : ''}.
                  Your query results are below — take a moment to review them.
                </p>
                <div className="flex items-center gap-2 mt-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-600 text-white text-sm font-bold shadow-md">
                    ⏱ {countdown}s
                  </span>
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">until <strong>{nextDestination.label}</strong></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); router.push(nextDestination.url); }}
                    className="px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-md"
                  >
                    {nextDestination.label} →
                  </button>
                  {nextCaseId && !nextDestination.label.startsWith('Next:') && (
                    <Link href={`/cases/${domain}/${nextCaseId}`}>
                      <button
                        onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); }}
                        className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-md"
                      >
                        Next Case →
                      </button>
                    </Link>
                  )}
                  <button
                    onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); setNextDestination(null); setCountdown(0); setShowSuccess(false); }}
                    className="px-5 py-2.5 rounded-full border-2 border-green-500 dark:border-green-500 text-green-800 dark:text-green-200 text-sm font-bold hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
                  >
                    Stay & Review
                  </button>
                  {hasVisualizations && (
                    <Link href={`/cases/${domain}/${id}/visualizations`}>
                      <button className="px-5 py-2.5 rounded-full border-2 border-green-500 text-green-800 dark:text-green-200 text-sm font-bold hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors">
                        View Visualizations
                      </button>
                    </Link>
                  )}
                </div>
                <div className="mt-3 w-full bg-green-300 dark:bg-green-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${(countdown / 30) * 100}%` }} />
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
    <GuideModal
      isOpen={guideOpen}
      onClose={() => setGuideOpen(false)}
      guideData={guideData}
      scrollToSection={guideSection}
    />
    </>
  );
}