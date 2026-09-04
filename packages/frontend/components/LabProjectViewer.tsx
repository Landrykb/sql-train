'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BleepxFace, BleepxGhost, BleepxGitHub } from '@/components/BleepxIcons';
import {
  EyeIcon, EyeOffIcon, SendIcon, CopyIcon, FlaskIcon, BrainIcon,
  ChartBarIcon, TargetIcon, FolderIcon, CodeIcon, BulbIcon, FileTextIcon,
  ExternalLinkIcon, ClockIcon
} from '@/components/AppIcons';
import { IconBrandPython, IconLetterR, IconConfetti, IconCheck } from '@tabler/icons-react';
import PythonTerminal, { type PythonTerminalHandle } from '@/components/PythonTerminal';
import { makeScaffold } from '@/lib/pyScaffold';
import { useProgress } from '@/lib/useProgress';
import { playBleep } from '@/lib/audio';
import { getGitHubUser, getGitHubToken } from '@/lib/authClient';
import { pushLabProjectToGitHub } from '@/lib/githubPush';
import { LAB_CASE_TIERS, LAB_TEST_MODE_LIMITS } from '@/lib/labConstants';
import { track, Events } from '@/lib/analytics';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Section {
  title: string;
  content: string;
  code: string;
  r_code?: string;
  explanation: string;
}

interface LabProjectViewerProps {
  projectId: string;
  name: string;
  domain: string;
  project: string;
  description: string;
  stepNumber: number;
  skills: string[];
  language: string;
  datasetUrl?: string;
  /** The exact filename Kaggle ships inside the dataset ZIP. */
  kaggleFilename?: string;
  /** Optional short human-readable note about the dataset. */
  kaggleNote?: string;
  /** The exact filename data.world ships inside the dataset export. */
  dataWorldFilename?: string;
  /** Optional short human-readable note about the dataset. */
  dataWorldNote?: string;
  /** Optional data.world table / file name. */
  dataWorldTable?: string;
  /** The `/datasets/...csv` path the lab code reads from (auto-detected). */
  datasetPath?: string | null;
  sections: Section[];
  hints: string[];
  learningObjectives: string[];
  thoughtProcess?: string[];
  solutionCode?: string;
  rSolutionCode?: string;
  expectedOutput?: string;
  rExpectedOutput?: string;
  schema?: string[];
  prevStep?: { id: string; name: string } | null;
  nextStep?: { id: string; name: string } | null;
}

// ─── Inline copy pill — compact "filename + copy" chip used in the dataset panel

function CopyInline({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);
  return (
    <button
      onClick={copy}
      title={`Copy ${value}`}
      className="w-full text-left flex flex-wrap items-center gap-1.5 group"
    >
      <code className="text-sm font-mono text-bleepx-text break-all min-w-0 flex-1">{value}</code>
      <span className={`text-xs px-1.5 py-0.5 rounded font-bold transition-colors flex-shrink-0 ${copied ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-teal-500 group-hover:text-white'}`}>
        {copied ? <IconCheck size={10} /> : <CopyIcon size={10} />}
      </span>
    </button>
  );
}

// ─── How It Works banner — collapsible; preference persists in localStorage.

const HOW_IT_WORKS_KEY = 'bleepx_lab_how_it_works_collapsed';

function HowItWorksBanner() {
  // Default to EXPANDED for first-time users; remember choice otherwise.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(HOW_IT_WORKS_KEY) === '1');
    } catch { /* ignore */ }
  }, []);
  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(HOW_IT_WORKS_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };
  return (
    <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-900/10">
      <button
        onClick={toggle}
        className="w-full flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 text-left"
        aria-expanded={!collapsed}
      >
        <div className="flex flex-wrap items-center gap-3">
          <BleepxFace size={22} />
          <h3 className="text-sm font-bold text-teal-800 dark:text-teal-200 min-w-0">
            How this step works
          </h3>
        </div>
        <span className={`text-xs text-teal-700 dark:text-teal-300 transition-transform ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>
      {!collapsed && (
        <ol className="text-xs text-teal-900/80 dark:text-teal-200/80 space-y-1 list-decimal list-inside leading-relaxed px-4 sm:px-5 pb-4 sm:pb-5 pl-10 sm:pl-12">
          <li>Write your solution in the <strong>Try It Yourself</strong> editor below — matplotlib/seaborn figures and pandas tables render inline.</li>
          <li>Stuck? Expand a section and click <strong className="whitespace-nowrap">↑ Send to editor</strong> to stack its snippet into the editor, notebook-style.</li>
          <li>Hit <strong>▶ Run</strong> (or <kbd className="px-1 py-0.5 rounded bg-white dark:bg-gray-800 border border-teal-300 dark:border-teal-700 text-xs">⌘↵</kbd>) — once your output matches the expected result, the step is marked solved.</li>
          <li>Use <strong>↺ Reset</strong> to restore the starter code at any time.</li>
        </ol>
      )}
    </div>
  );
}

// ─── Spoiler Code Block ─────────────────────────────────────────────────────

function SpoilerCodeBlock({
  code,
  language,
  onSendToEditor,
}: {
  code: string;
  language: string;
  onSendToEditor?: (code: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const handleSend = useCallback(() => {
    if (!onSendToEditor) return;
    onSendToEditor(code);
    setSent(true);
    setTimeout(() => setSent(false), 1800);
  }, [code, onSendToEditor]);

  if (!revealed) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20">
        <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex flex-wrap items-center justify-center">
            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
            *bleep* Try writing the code yourself first, human!
          </p>
          <button
            onClick={() => { setRevealed(true); playBleep(); }}
            className="px-4 py-1.5 rounded-full text-xs font-bold border-2 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
          >
            <EyeIcon size={14} className="inline" /> Reveal Reference Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-bleepx-text-secondary uppercase">{language}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">Reference</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRevealed(false)}
            className="text-xs px-2 py-1 rounded-md text-bleepx-text-secondary hover:text-bleepx-text transition-colors"
          >
            <EyeOffIcon size={14} className="inline" /> Hide
          </button>
          {onSendToEditor && (
            <button
              onClick={handleSend}
              className="text-xs px-2.5 py-1 rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium"
              title="Append this snippet to the Try It Yourself editor above"
            >
              {sent ? <span className="inline-flex flex-wrap items-center gap-1"><IconCheck size={12} /> Sent!</span> : <span className="inline-flex flex-wrap items-center gap-1"><SendIcon size={12} className="inline" /> Send to editor</span>}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-bleepx-text-secondary hover:text-bleepx-text hover:border-teal-400 transition-colors"
          >
            {copied ? <span className="inline-flex flex-wrap items-center gap-1"><IconCheck size={12} /> Copied!</span> : <span className="inline-flex flex-wrap items-center gap-1"><CopyIcon size={12} className="inline" /> Copy</span>}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto max-w-full bg-gray-50 dark:bg-gray-900 text-sm leading-relaxed">
        <code className="text-bleepx-text font-mono whitespace-pre-wrap break-all">{code}</code>
      </pre>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LabProjectViewer({
  projectId,
  name,
  domain,
  project,
  description,
  stepNumber,
  skills,
  language,
  datasetUrl,
  kaggleFilename,
  kaggleNote,
  dataWorldFilename,
  dataWorldNote,
  dataWorldTable,
  datasetPath,
  sections,
  hints,
  learningObjectives,
  thoughtProcess,
  solutionCode,
  rSolutionCode,
  expectedOutput,
  rExpectedOutput,
  schema,
  prevStep,
  nextStep,
}: LabProjectViewerProps) {
  const sourceFilename = kaggleFilename || dataWorldFilename;
  const sourceName = kaggleFilename ? 'Kaggle' : dataWorldFilename ? 'data.world' : 'Source';
  const labBasename = datasetPath ? datasetPath.split('/').pop() : null;
  const sourceMatchesPath = !!(sourceFilename && labBasename && sourceFilename === labBasename);

  const terminalRef = useRef<PythonTerminalHandle | null>(null);
  const editorSectionRef = useRef<HTMLDivElement | null>(null);

  /** Append a snippet to the main editor and scroll it into view — the
   *  Jupyter-notebook-style "send a cell to the runner" pattern. */
  const sendToEditor = useCallback((snippet: string) => {
    terminalRef.current?.appendCode(snippet);
    editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [showHints, setShowHints] = useState(false);
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [stepSolved, setStepSolved] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [showVizGuide, setShowVizGuide] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isDualLang = language.toLowerCase().includes('r');
  const [codeLang, setCodeLang] = useState<'python' | 'r'>('python');
  const { markComplete: markProgressComplete } = useProgress();

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Restore completion state from localStorage
  useEffect(() => {
    track(Events.LAB_VIEWED, { project_id: projectId, domain, step_number: stepNumber, language });
    const key = `bleepx_lab_step_${projectId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.completed) setCompletedSections(new Set(data.completedSections || []));
        if (data.solved) setStepSolved(true);
      } catch { /* ignore */ }
    }
    // Check test mode from profile
    try {
      const profile = JSON.parse(localStorage.getItem('bleepx_profile') || '{}');
      if (profile.testModeEnabled) {
        const tier = LAB_CASE_TIERS[projectId] || 1;
        const limit = LAB_TEST_MODE_LIMITS[tier] || 60 * 60;
        setTimeLimit(limit);
        setTimerSeconds(limit);
        setTimerEnabled(true);
      }
    } catch { /* ignore */ }
  }, [projectId]);

  // Countdown timer for test mode
  useEffect(() => {
    if (timerEnabled && !timeExpired && !stepSolved) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (timeLimit > 0) {
            if (s <= 1) { setTimeExpired(true); return 0; }
            return s - 1;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerEnabled, timeExpired, timeLimit, stepSolved]);

  // Save completion state
  useEffect(() => {
    if (completedSections.size > 0 || stepSolved) {
      const key = `bleepx_lab_step_${projectId}`;
      localStorage.setItem(key, JSON.stringify({
        completed: completedSections.size >= sections.length,
        completedSections: Array.from(completedSections),
        solved: stepSolved,
        ts: Date.now(),
      }));
    }
  }, [completedSections, stepSolved, projectId, sections.length]);

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const markSectionComplete = (idx: number) => {
    playBleep();
    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.add(idx);
      if (idx + 1 < sections.length) {
        setExpandedSections((p) => new Set(p).add(idx + 1));
      }
      return next;
    });
  };

  const handleStepSolved = useCallback(() => {
    if (!stepSolved) {
      setStepSolved(true);
      playBleep();
      try {
        markProgressComplete(projectId, LAB_CASE_TIERS[projectId] || 1);
        track(Events.LAB_SOLVED, { project_id: projectId, domain, step_number: stepNumber, language, points_earned: LAB_CASE_TIERS[projectId] || 1 });
      } catch { /* ignore */ }
    }
  }, [stepSolved, projectId, markProgressComplete, domain, stepNumber, language]);

  // GitHub export handler
  const handleGitHubPush = useCallback(async () => {
    const ghUser = getGitHubUser();
    const token = await getGitHubToken();
    if (!ghUser || !token) {
      setPushStatus('Sign in with GitHub first (Profile → Sign In)');
      return;
    }
    setPushStatus('Pushing...');
    const author = ghUser.name || ghUser.login;
    const code = solutionCode || sections.map(s => s.code).join('\n\n');
    const files = [
      { path: `${domain}/${projectId}/README.md`, content: `# ${name}\n\n${description}\n\n**Domain:** ${domain}\n**Language:** ${language}\n**Skills:** ${skills.join(', ')}\n\n## Solution\n\nSee \`solution.py\` for the data science approach.\n\n---\n*Pushed by **${author}** — *bleep* thinks this one is solid.*\n` },
      { path: `${domain}/${projectId}/solution.py`, content: code },
    ];
    const result = await pushLabProjectToGitHub(domain, projectId, name, files, (msg) => setPushStatus(msg), ghUser);
    if (result.success) {
      setPushStatus(`Pushed! ${result.repoUrl}`);
    } else {
      setPushStatus(result.error || 'Push failed');
    }
  }, [domain, projectId, name, description, language, skills, solutionCode, sections]);

  const allComplete = completedSections.size >= sections.length;

  return (
    <div className="max-w-5xl mx-auto space-y-5 min-w-0">
      {/* Time expired overlay */}
      {timeExpired && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-wrap items-center justify-center p-4">
          <div className="bg-bleepx-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
            <BleepxFace size={48} />
            <h2 className="text-2xl font-bold text-red-600 mt-4 mb-2">Time&apos;s Up!</h2>
            <p className="text-sm text-bleepx-text-secondary mb-4">
              *bleep* The clock has spoken, human. Tier {LAB_CASE_TIERS[projectId] || 1} challenge — {fmtTime(timeLimit)} limit.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => { setTimeExpired(false); setTimerEnabled(false); setTimeLimit(0); }} className="px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors">
                Continue Without Timer
              </button>
              {nextStep && (
                <Link href={`/lab/${domain}/${nextStep.id}`}>
                  <button className="px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors">Next Step →</button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step header with BleepX branding */}
      <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border overflow-hidden">
        {/* Branded top bar — stacks on mobile, single row on sm+ */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-4 sm:px-5 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <BleepxFace size={22} />
            <span className="text-white text-xs font-bold tracking-wide uppercase whitespace-nowrap">BleepxLab</span>
            <span className="text-teal-200 text-xs hidden sm:inline">•</span>
            <span className="text-teal-100 text-xs whitespace-normal break-words min-w-0">{project}</span>
          </div>
          {/* Action chips — wrap on narrow screens, never push Run/Quiz off-screen */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 sm:justify-end">
            {/* Test mode timer display */}
            {timerEnabled && timeLimit > 0 && !timeExpired && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono whitespace-nowrap ${
                timerSeconds <= 60 ? 'bg-red-500 text-white animate-pulse' :
                timerSeconds <= 5 * 60 ? 'bg-amber-400 text-amber-900' :
                'bg-white/20 text-white'
              }`}>
                <FlaskIcon size={10} className="inline" /> {fmtTime(timerSeconds)}
              </span>
            )}
            {/* Toggle timer on/off */}
            <button
              onClick={() => {
                if (timerEnabled) {
                  setTimerEnabled(false);
                  setTimeLimit(0);
                  setTimerSeconds(0);
                  if (timerRef.current) clearInterval(timerRef.current);
                } else {
                  const tier = LAB_CASE_TIERS[projectId] || 1;
                  const limit = LAB_TEST_MODE_LIMITS[tier] || 60 * 60;
                  setTimeLimit(limit);
                  setTimerSeconds(limit);
                  setTimerEnabled(true);
                  setTimeExpired(false);
                }
              }}
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                timerEnabled ? 'bg-amber-400/30 text-amber-100 hover:bg-amber-400/50' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={timerEnabled ? 'Stop timer' : 'Start test-mode timer'}
            >
              {timerEnabled ? <span className="inline-flex flex-wrap items-center gap-1"><ClockIcon size={10} /> Stop</span> : <span className="inline-flex flex-wrap items-center gap-1"><ClockIcon size={10} /> Timer</span>}
            </button>
            <Link href="/lab/quiz" className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-100 hover:bg-purple-500/50 transition-colors font-medium whitespace-nowrap inline-flex flex-wrap items-center gap-1">
              <BrainIcon size={10} /> Quiz
            </Link>
            <Link href={`/lab/${domain}`} className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors font-medium whitespace-nowrap inline-flex flex-wrap items-center gap-1">
              <FileTextIcon size={10} /> Steps
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex flex-wrap items-center justify-center text-sm font-bold text-teal-700 dark:text-teal-300 shadow-sm">
              {stepNumber}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-bleepx-text leading-tight break-words">{name}</h2>
              <p className="text-xs text-bleepx-text-secondary mt-0.5">{language} • Step {stepNumber}</p>
            </div>
          </div>
          <p className="text-sm text-bleepx-text-secondary leading-relaxed">{description}</p>

          {/* Skills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium border border-teal-200 dark:border-teal-800">
                {s}
              </span>
            ))}
          </div>

          {/* Learning objectives */}
          {learningObjectives.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800">
              <h4 className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wide mb-2 flex flex-wrap items-center gap-1.5 min-w-0">
                <TargetIcon size={12} className="flex-shrink-0" /> <span className="min-w-0">Learning Objectives</span>
              </h4>
              <ul className="space-y-1">
                {learningObjectives.map((obj, i) => (
                  <li key={i} className="text-xs text-teal-800 dark:text-teal-200 flex flex-wrap items-start gap-1.5">
                    <span className="text-teal-500 mt-0.5">→</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dataset source — Kaggle or data.world download instructions */}
          {datasetUrl && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide flex flex-wrap items-center gap-1.5 min-w-0">
                  <ChartBarIcon size={12} className="flex-shrink-0" /> <span className="min-w-0">Dataset</span>
                </h4>
                <a
                  href={datasetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors inline-flex flex-wrap items-center gap-1"
                >
                  <ExternalLinkIcon size={10} /> View on {sourceName}
                </a>
              </div>

              {/* Filename panel. */}
              {sourceMatchesPath ? (
                <div className="mb-2 p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-green-300 dark:border-green-800 flex flex-wrap items-center gap-2.5">
                  <span className="text-sm px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold whitespace-nowrap flex-shrink-0 inline-flex flex-wrap items-center gap-1"><IconCheck size={10} /> Matches {sourceName}</span>
                  <div className="flex-1 min-w-0">
                    <CopyInline value={sourceFilename} />
                  </div>
                </div>
              ) : (sourceFilename || datasetPath) ? (
                <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sourceFilename && (
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">{sourceName} filename</div>
                      <CopyInline value={sourceFilename} />
                    </div>
                  )}
                  {datasetPath && (
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Lab path (browser)</div>
                      <CopyInline value={datasetPath} />
                    </div>
                  )}
                </div>
              ) : null}

              {kaggleNote && (
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mb-2 italic">{kaggleNote}</p>
              )}
              {dataWorldNote && (
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mb-2 italic">{dataWorldNote}</p>
              )}

              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1.5">
                *bleep* Load the dataset in the browser terminal:
              </p>
              <div className="bg-gray-900 rounded-lg p-2.5 overflow-x-auto max-w-full">
                <code className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">{`from pyodide.http import open_url\nimport pandas as pd\n\ndf = pd.read_csv(open_url("${datasetPath || '/datasets/YOUR_FILE.csv'}"))\nprint(df.shape)\nprint(df.columns.tolist())`}</code>
              </div>
              {sourceFilename && datasetPath && sourceFilename === labBasename ? (
                <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1.5">
                  <BulbIcon size={10} className="inline" /> Running locally? The file inside the {sourceName} download is already named <code className="px-1 bg-white dark:bg-gray-900 rounded font-mono">{sourceFilename}</code> — drop it into the notebook's working directory and the code above runs unchanged (swap <code>open_url(...)</code> for <code>"{sourceFilename}"</code>).
                </p>
              ) : sourceFilename ? (
                <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1.5">
                  <BulbIcon size={10} className="inline" /> Running locally? {sourceName} ships <code className="px-1 bg-white dark:bg-gray-900 rounded font-mono">{sourceFilename}</code>. Point <code>read_csv</code> at that path and everything else works unchanged.
                </p>
              ) : null}
            </div>
          )}

          {/* Schema columns */}
          {schema && schema.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-bleepx-text-secondary uppercase tracking-wide mb-2 flex flex-wrap items-center gap-1.5 min-w-0">
                <FolderIcon size={12} className="flex-shrink-0" /> <span className="min-w-0">Dataset Columns</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {schema.map((col, i) => (
                  <code key={i} className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-bleepx-text font-mono">{col}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Python/R language toggle for dual-language domains */}
      {isDualLang && (
        <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-4">
          <div className="flex flex-wrap items-center justify-between">
            <h4 className="text-xs font-bold text-bleepx-text uppercase tracking-wide flex flex-wrap items-center gap-1.5">
              <CodeIcon size={12} /> Code Language
            </h4>
            <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCodeLang('python')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  codeLang === 'python'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-bleepx-text-secondary hover:text-bleepx-text'
                }`}
              >
                <IconBrandPython size={14} className="inline" /> Python
              </button>
              <button
                onClick={() => setCodeLang('r')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  codeLang === 'r'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-bleepx-text-secondary hover:text-bleepx-text'
                }`}
              >
                <IconLetterR size={14} className="inline" /> R
              </button>
            </div>
          </div>
          {codeLang === 'r' && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              R equivalents shown where available. Some advanced steps are Python-only.
            </p>
          )}
        </div>
      )}

      {/* How this step works — collapsible, preference persists across visits. */}
      <HowItWorksBanner />

      {/* Python Terminal — Try It Yourself */}
      <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3 flex flex-wrap items-center justify-between">
          <h3 className="text-sm font-bold text-white flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{codeLang === 'r' ? <IconLetterR size={20} /> : <IconBrandPython size={20} />}</span>
            <span className="min-w-0">Try It Yourself {codeLang === 'r' ? '(R reference — run Python in editor)' : ''}</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {stepSolved && (
              <span className="text-xs font-bold text-green-400 px-2 py-0.5 rounded-full bg-green-900/40 border border-green-700">
                Solved
              </span>
            )}
            <BleepxGhost size={16} />
          </div>
        </div>
        <div className="p-4 sm:p-5" ref={editorSectionRef}>
          <PythonTerminal
            ref={terminalRef}
            initialCode={
              codeLang === 'r'
                ? `# R mode is reference-only in the browser.\n# Copy the R solution below into RStudio or an R kernel to run it.`
                : solutionCode
                  ? makeScaffold(solutionCode)
                  : `# Write your solution here — or click ‘↑ Send to editor’ on any step below\n# to stack its snippet in here notebook-style, then tweak and ▶ Run.\n#\n# Load data with:\n# from pyodide.http import open_url\n# df = pd.read_csv(open_url("/datasets/YOUR_FILE.csv"))\n#\n# matplotlib / seaborn figures render inline in the output panel.\n\nimport pandas as pd\nimport numpy as np\n`
            }
            expectedOutput={codeLang === 'r' && rExpectedOutput ? rExpectedOutput : expectedOutput}
            solutionCode={codeLang === 'r' && rSolutionCode ? rSolutionCode : solutionCode}
            hints={hints}
            onSolved={handleStepSolved}
            height="250px"
          />
          {codeLang === 'r' && rSolutionCode && (
            <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 flex flex-wrap items-center gap-1.5 min-w-0">
                <IconLetterR size={12} className="flex-shrink-0" /> <span className="min-w-0">R Solution Reference</span>
              </h4>
              <pre className="text-xs sm:text-sm bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono max-w-full"><code>{rSolutionCode}</code></pre>
              <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1.5">
                *bleep* The browser editor runs Python only. Use R code locally in RStudio or Jupyter with an R kernel.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <BleepxFace size={16} />
        <div className="min-w-0 flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${sections.length > 0 ? (completedSections.size / sections.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-bleepx-text-secondary font-bold">
          {completedSections.size}/{sections.length}
        </span>
      </div>

      {/* Sections — code hidden by default */}
      {sections.map((section, idx) => {
        const isExpanded = expandedSections.has(idx);
        const isComplete = completedSections.has(idx);
        return (
          <div
            key={idx}
            className={`bg-bleepx-white rounded-2xl shadow-sm border transition-all duration-200 ${
              isComplete
                ? 'border-emerald-300 dark:border-emerald-700'
                : 'border-bleepx-border hover:border-teal-200 dark:hover:border-teal-800'
            }`}
          >
            {/* Section header — compact */}
            <button
              onClick={() => toggleSection(idx)}
              className="w-full px-4 py-3 flex flex-wrap items-center gap-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-2xl"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                isComplete
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary'
              }`}>
                {isComplete ? <IconCheck size={12} /> : idx + 1}
              </div>
              <h3 className="flex-1 min-w-0 font-bold text-bleepx-text text-sm whitespace-normal break-words">{section.title}</h3>
              <svg
                className={`w-3.5 h-3.5 text-bleepx-text-secondary transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Section body — code is hidden behind spoiler */}
            {isExpanded && (
              <div className="px-4 sm:px-5 pb-5 space-y-4">
                {/* Content/instructions */}
                <p className="text-sm text-bleepx-text-secondary leading-relaxed">{section.content}</p>

                {/* Code block — HIDDEN behind reveal button. R snippets can't
                    be sent to the Python editor, so onSendToEditor is only
                    wired for Python code. */}
                {isDualLang && codeLang === 'r' ? (
                  section.r_code ? (
                    <SpoilerCodeBlock code={section.r_code.trim()} language="R" />
                  ) : (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium inline-flex flex-wrap items-center gap-1">
                        <IconLetterR size={12} /> R code not yet available for this section — showing Python below
                      </p>
                      <SpoilerCodeBlock code={section.code.trim()} language={language} onSendToEditor={sendToEditor} />
                    </div>
                  )
                ) : (
                  <SpoilerCodeBlock code={section.code.trim()} language={language} onSendToEditor={sendToEditor} />
                )}

                {/* Bleepx explanation */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <div className="flex flex-wrap items-start gap-2">
                    <BleepxFace size={20} className="flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Bleepx says:</span>
                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed mt-0.5">{section.explanation}</p>
                    </div>
                  </div>
                </div>

                {/* Mark complete */}
                {!isComplete ? (
                  <button
                    onClick={() => markSectionComplete(idx)}
                    className="px-5 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-all shadow-sm hover:shadow-md active:scale-95 flex flex-wrap items-center gap-2"
                  >
                    <BleepxFace size={14} />
                    Mark as Complete
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <IconCheck size={14} /> Section complete — *bleep*
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Thought Process — collapsible */}
      {thoughtProcess && thoughtProcess.length > 0 && (
        <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-4 sm:p-5">
          <button
            onClick={() => setShowThoughtProcess(!showThoughtProcess)}
            className="flex flex-wrap items-center gap-2 w-full text-left group"
          >
            <BrainIcon size={20} className="inline flex-shrink-0" />
            <span className="text-sm font-bold text-bleepx-text group-hover:text-teal-600 transition-colors min-w-0">
              {showThoughtProcess ? 'Hide Thought Process' : 'View Thought Process'}
            </span>
            <svg
              className={`w-4 h-4 text-bleepx-text-secondary ml-auto transition-transform ${showThoughtProcess ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showThoughtProcess && (
            <ol className="mt-3 space-y-2">
              {thoughtProcess.map((step, i) => (
                <li key={i} className="text-xs text-bleepx-text-secondary flex flex-wrap items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 flex flex-wrap items-center justify-center text-xs font-bold text-teal-700 dark:text-teal-300 flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Hints — collapsible */}
      {hints.length > 0 && (
        <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-4 sm:p-5">
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex flex-wrap items-center gap-2 w-full text-left group"
          >
            <BleepxGhost size={20} className="flex-shrink-0" />
            <span className="text-sm font-bold text-bleepx-text group-hover:text-amber-600 transition-colors min-w-0">
              {showHints ? 'Hide Hints' : '*bleep* Need a hint, human?'}
            </span>
            <svg
              className={`w-4 h-4 text-bleepx-text-secondary ml-auto transition-transform ${showHints ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showHints && (
            <ul className="mt-3 space-y-2">
              {hints.map((hint, i) => (
                <li key={i} className="text-xs text-bleepx-text-secondary flex flex-wrap items-start gap-2">
                  <BulbIcon size={12} className="text-amber-500 mt-0.5" />
                  <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">{hint}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Data Visualization Guide — always visible */}
      <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-4 sm:p-5">
        <button
          onClick={() => setShowVizGuide(!showVizGuide)}
          className="flex flex-wrap items-center gap-2 w-full text-left group"
        >
          <ChartBarIcon size={20} className="inline flex-shrink-0" />
          <span className="text-sm font-bold text-bleepx-text group-hover:text-indigo-600 transition-colors min-w-0">
            {showVizGuide ? 'Hide Visualization Guide' : 'Visualize Your Data'}
          </span>
          <svg
            className={`w-4 h-4 text-bleepx-text-secondary ml-auto transition-transform ${showVizGuide ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showVizGuide && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-bleepx-text-secondary">
              Use these snippets in the terminal above to visualize your data. Modify column names to match your dataset.
            </p>
            <div className="space-y-3">
              <div>
                <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Histogram</h5>
                <div className="bg-gray-900 rounded-lg p-2.5 overflow-x-auto max-w-full">
                  <code className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">{`import matplotlib.pyplot as plt\ndf['column_name'].hist(bins=30, edgecolor='black')\nplt.title('Distribution')\nplt.xlabel('Value')\nplt.ylabel('Count')\nplt.show()`}</code>
                </div>
              </div>
              <div>
                <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Scatter Plot</h5>
                <div className="bg-gray-900 rounded-lg p-2.5 overflow-x-auto max-w-full">
                  <code className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">{`import matplotlib.pyplot as plt\nplt.scatter(df['x_col'], df['y_col'], alpha=0.5)\nplt.title('X vs Y')\nplt.xlabel('X')\nplt.ylabel('Y')\nplt.show()`}</code>
                </div>
              </div>
              <div>
                <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Correlation Heatmap</h5>
                <div className="bg-gray-900 rounded-lg p-2.5 overflow-x-auto max-w-full">
                  <code className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">{`import seaborn as sns\nimport matplotlib.pyplot as plt\nsns.heatmap(df.select_dtypes('number').corr(),\n  annot=True, cmap='coolwarm', fmt='.2f')\nplt.title('Correlation Matrix')\nplt.tight_layout()\nplt.show()`}</code>
                </div>
              </div>
              <div>
                <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Box Plot</h5>
                <div className="bg-gray-900 rounded-lg p-2.5 overflow-x-auto max-w-full">
                  <code className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">{`import seaborn as sns\nimport matplotlib.pyplot as plt\nsns.boxplot(data=df, x='category_col', y='value_col')\nplt.xticks(rotation=45)\nplt.tight_layout()\nplt.show()`}</code>
                </div>
              </div>
              <div>
                <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Line Chart (Time Series)</h5>
                <div className="bg-gray-900 rounded-lg p-2.5 overflow-x-auto max-w-full">
                  <code className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">{`import matplotlib.pyplot as plt\ndf.plot(x='date_col', y='value_col', figsize=(10,4))\nplt.title('Trend Over Time')\nplt.tight_layout()\nplt.show()`}</code>
                </div>
              </div>
            </div>
            <p className="text-xs text-bleepx-text-secondary italic">
              Tip: Replace column names with your actual dataset columns. Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">df.columns.tolist()</code> to see available columns.
            </p>
          </div>
        )}
      </div>

      {/* GitHub Export */}
      <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <BleepxGitHub size={20} className="flex-shrink-0" />
            <span className="text-sm font-bold text-bleepx-text min-w-0">Export to GitHub</span>
          </div>
          <button
            onClick={handleGitHubPush}
            disabled={pushStatus === 'Pushing...'}
            className="text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 flex flex-wrap items-center gap-1.5"
          >
            <BleepxGitHub size={14} />
            {pushStatus === 'Pushing...' ? 'Pushing...' : 'Push to GitHub'}
          </button>
        </div>
        {pushStatus && pushStatus !== 'Pushing...' && (
          <p className={`mt-2 text-xs ${pushStatus.startsWith('Pushed!') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {pushStatus.startsWith('Pushed!') ? (
              <><IconCheck size={12} className="inline" /> {pushStatus.replace('Pushed! ', '')} — <a href={pushStatus.replace('Pushed! ', '')} target="_blank" rel="noopener noreferrer" className="underline">View on GitHub</a></>
            ) : pushStatus}
          </p>
        )}
      </div>

      {/* Step solved celebration — only when code output matches */}
      {stepSolved && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-200 dark:border-teal-700 p-6 text-center">
          <div className="mb-2"><IconConfetti size={40} className="text-teal-600 mx-auto" /></div>
          <h3 className="text-lg font-bold text-teal-700 dark:text-teal-300">
            *bleep* Step Solved!
          </h3>
          <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
            Your code produces the correct output. Points earned, human!
          </p>
          {nextStep && (
            <div className="mt-4 space-y-3">
              <Link
                href={`/lab/${domain}/${nextStep.id}`}
                className="inline-flex flex-wrap items-center gap-2 px-6 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <BleepxFace size={16} />
                Continue to {nextStep.name} →
              </Link>
            </div>
          )}
          <div className="mt-4">
            <Link href="/lab/quiz" className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">
              <BrainIcon size={12} className="inline" /> Test your knowledge with a quiz →
            </Link>
          </div>
        </div>
      )}

      {/* Sections read — gentle nudge to try the code */}
      {allComplete && !stepSolved && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-2xl border border-amber-200 dark:border-amber-700 p-4 text-center">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium flex flex-wrap items-center justify-center gap-2">
            <BleepxFace size={16} />
            *bleep* Sections reviewed! Now run your solution in the editor above to earn points.
          </p>
        </div>
      )}

      {/* Navigation — prev/next step buttons. Truncate long step names; stack on very narrow screens. */}
      <div className="flex flex-row items-stretch justify-between gap-2 pt-2 pb-4">
        {prevStep ? (
          <Link
            href={`/lab/${domain}/${prevStep.id}`}
            className="flex-1 min-w-0 max-w-[48%] px-3 sm:px-4 py-2 rounded-full border-2 border-bleepx-border text-xs sm:text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors flex flex-wrap items-center gap-1"
            title={prevStep.name}
          >
            <span className="flex-shrink-0">←</span>
            <span className="whitespace-normal break-words"><span className="hidden sm:inline">Prev: </span>{prevStep.name}</span>
          </Link>
        ) : (
          <Link
            href={`/lab/${domain}`}
            className="flex-1 min-w-0 max-w-[48%] px-3 sm:px-4 py-2 rounded-full border-2 border-bleepx-border text-xs sm:text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors flex flex-wrap items-center gap-1"
          >
            <span className="flex-shrink-0">←</span>
            <span className="whitespace-normal break-words">All Steps</span>
          </Link>
        )}
        {nextStep ? (
          <Link
            href={`/lab/${domain}/${nextStep.id}`}
            className="flex-1 min-w-0 max-w-[48%] px-3 sm:px-4 py-2 rounded-full bg-teal-600 text-white text-xs sm:text-sm font-bold hover:bg-teal-700 transition-all shadow-sm hover:shadow-md flex flex-wrap items-center justify-end gap-1"
            title={nextStep.name}
          >
            <span className="whitespace-normal break-words"><span className="hidden sm:inline">Next: </span>{nextStep.name}</span>
            <span className="flex-shrink-0">→</span>
          </Link>
        ) : (
          <Link
            href={`/lab/${domain}`}
            className="flex-1 min-w-0 max-w-[48%] px-3 sm:px-4 py-2 rounded-full bg-teal-600 text-white text-xs sm:text-sm font-bold hover:bg-teal-700 transition-all shadow-sm hover:shadow-md flex flex-wrap items-center justify-end gap-1"
          >
            <span className="whitespace-normal break-words">Back to Project</span>
            <span className="flex-shrink-0">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
