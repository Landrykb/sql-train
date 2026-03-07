'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { BleepxFace, BleepxGhost } from '@/components/BleepxIcons';
import PythonTerminal from '@/components/PythonTerminal';
import { useProgress } from '@/lib/useProgress';
import { playBleep } from '@/lib/audio';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Section {
  title: string;
  content: string;
  code: string;
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
  sections: Section[];
  hints: string[];
  learningObjectives: string[];
  thoughtProcess?: string[];
  solutionCode?: string;
  expectedOutput?: string;
  schema?: string[];
  prevStep?: { id: string; name: string } | null;
  nextStep?: { id: string; name: string } | null;
}

// ─── Spoiler Code Block ─────────────────────────────────────────────────────

function SpoilerCodeBlock({ code, language }: { code: string; language: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  if (!revealed) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20">
        <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
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
            👁️ Reveal Reference Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in duration-300">
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-bleepx-text-secondary uppercase">{language}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">Reference</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRevealed(false)}
            className="text-[10px] px-2 py-1 rounded-md text-bleepx-text-secondary hover:text-bleepx-text transition-colors"
          >
            🙈 Hide
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-bleepx-text-secondary hover:text-bleepx-text hover:border-teal-400 transition-colors"
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto bg-gray-50 dark:bg-gray-900 text-sm leading-relaxed">
        <code className="text-bleepx-text font-mono whitespace-pre">{code}</code>
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
  sections,
  hints,
  learningObjectives,
  thoughtProcess,
  solutionCode,
  expectedOutput,
  schema,
  prevStep,
  nextStep,
}: LabProjectViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [showHints, setShowHints] = useState(false);
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [stepSolved, setStepSolved] = useState(false);
  const { markComplete: markProgressComplete } = useProgress();

  // Restore completion state from localStorage
  useEffect(() => {
    const key = `bleepx_lab_step_${projectId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.completed) setCompletedSections(new Set(data.completedSections || []));
        if (data.solved) setStepSolved(true);
      } catch { /* ignore */ }
    }
  }, [projectId]);

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
        markProgressComplete(`lab_${projectId}`, 2);
      } catch { /* ignore */ }
    }
  }, [stepSolved, projectId, markProgressComplete]);

  const allComplete = completedSections.size >= sections.length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Step header with BleepX branding */}
      <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border overflow-hidden">
        {/* Branded top bar */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BleepxFace size={22} />
            <span className="text-white text-xs font-bold tracking-wide uppercase">BleepxLab</span>
            <span className="text-teal-200 text-[10px]">•</span>
            <span className="text-teal-100 text-xs">{project}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/lab/guide" className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors font-medium">
              📖 Guide
            </Link>
            <Link href="/lab/quiz" className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors font-medium">
              🧠 Quiz
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-sm font-bold text-teal-700 dark:text-teal-300 shadow-sm">
              {stepNumber}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-bleepx-text leading-tight">{name}</h2>
              <p className="text-[10px] text-bleepx-text-secondary mt-0.5">{language} • Step {stepNumber}</p>
            </div>
          </div>
          <p className="text-sm text-bleepx-text-secondary leading-relaxed">{description}</p>

          {/* Skills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium border border-teal-200 dark:border-teal-800">
                {s}
              </span>
            ))}
          </div>

          {/* Learning objectives */}
          {learningObjectives.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800">
              <h4 className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>🎯</span> Learning Objectives
              </h4>
              <ul className="space-y-1">
                {learningObjectives.map((obj, i) => (
                  <li key={i} className="text-xs text-teal-800 dark:text-teal-200 flex items-start gap-1.5">
                    <span className="text-teal-500 mt-0.5">→</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dataset source — explicit and prominent */}
          {datasetUrl && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <span>📊</span> Dataset Source
              </h4>
              <a
                href={datasetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 font-medium break-all"
              >
                {datasetUrl}
              </a>
              <p className="text-[10px] text-blue-500 dark:text-blue-400/70 mt-1">
                *bleep* Load this data using: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">pd.read_csv(url)</code> — no local files in browser Python
              </p>
            </div>
          )}

          {/* Schema columns */}
          {schema && schema.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-bleepx-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>🗂️</span> Dataset Columns
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {schema.map((col, i) => (
                  <code key={i} className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-bleepx-text font-mono">{col}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 px-1">
        <BleepxFace size={16} />
        <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
            {/* Section header */}
            <button
              onClick={() => toggleSection(idx)}
              className="w-full p-4 sm:p-5 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-2xl"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                isComplete
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary'
              }`}>
                {isComplete ? '✓' : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-bleepx-text text-sm sm:text-base">{section.title}</h3>
                {!isExpanded && (
                  <p className="text-[11px] text-bleepx-text-secondary mt-0.5 truncate">{section.content}</p>
                )}
              </div>
              <BleepxGhost size={16} />
              <svg
                className={`w-4 h-4 text-bleepx-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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

                {/* Code block — HIDDEN behind reveal button */}
                <SpoilerCodeBlock code={section.code.trim()} language={language} />

                {/* Bleepx explanation */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <BleepxFace size={20} />
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Bleepx says:</span>
                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed mt-0.5">{section.explanation}</p>
                    </div>
                  </div>
                </div>

                {/* Mark complete */}
                {!isComplete ? (
                  <button
                    onClick={() => markSectionComplete(idx)}
                    className="px-5 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <BleepxFace size={14} />
                    Mark as Complete
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>✅</span> Section complete — *bleep*
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Python Terminal — Try It Yourself */}
      <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="text-lg">🐍</span> Try It Yourself
          </h3>
          <div className="flex items-center gap-2">
            {stepSolved && (
              <span className="text-[10px] font-bold text-green-400 px-2 py-0.5 rounded-full bg-green-900/40 border border-green-700">
                Solved
              </span>
            )}
            <BleepxGhost size={16} />
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <PythonTerminal
            initialCode={`# Write your solution here\n# Follow the steps above and produce the expected output\n${datasetUrl ? `# Dataset: ${datasetUrl}\n` : ''}\nimport pandas as pd\nimport numpy as np\n`}
            expectedOutput={expectedOutput}
            solutionCode={solutionCode}
            hints={hints}
            onSolved={handleStepSolved}
            height="250px"
          />
        </div>
      </div>

      {/* Thought Process — collapsible */}
      {thoughtProcess && thoughtProcess.length > 0 && (
        <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-4 sm:p-5">
          <button
            onClick={() => setShowThoughtProcess(!showThoughtProcess)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <span className="text-lg">🧠</span>
            <span className="text-sm font-bold text-bleepx-text group-hover:text-teal-600 transition-colors">
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
                <li key={i} className="text-xs text-bleepx-text-secondary flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-[10px] font-bold text-teal-700 dark:text-teal-300 flex-shrink-0 mt-0.5">{i + 1}</span>
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
            className="flex items-center gap-2 w-full text-left group"
          >
            <BleepxGhost size={20} />
            <span className="text-sm font-bold text-bleepx-text group-hover:text-amber-600 transition-colors">
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
                <li key={i} className="text-xs text-bleepx-text-secondary flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[11px]">{hint}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* All complete celebration */}
      {(allComplete || stepSolved) && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-200 dark:border-teal-700 p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-lg font-bold text-teal-700 dark:text-teal-300">
            {stepSolved ? '*bleep* Step Solved!' : '*bleep* Step Complete!'}
          </h3>
          <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
            {stepSolved
              ? 'Your code produces the correct output. Points earned, human!'
              : 'All sections done. Moving on!'}
          </p>
          {nextStep && (
            <Link
              href={`/lab/${domain}/${nextStep.id}`}
              className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <BleepxFace size={16} />
              Continue to {nextStep.name} →
            </Link>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 pb-4">
        {prevStep ? (
          <Link
            href={`/lab/${domain}/${prevStep.id}`}
            className="px-4 py-2 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
          >
            ← {prevStep.name}
          </Link>
        ) : (
          <Link
            href={`/lab/${domain}`}
            className="px-4 py-2 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
          >
            ← All Steps
          </Link>
        )}
        {nextStep ? (
          <Link
            href={`/lab/${domain}/${nextStep.id}`}
            className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-all shadow-sm hover:shadow-md"
          >
            Next: {nextStep.name} →
          </Link>
        ) : (
          <Link
            href={`/lab/${domain}`}
            className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-all shadow-sm hover:shadow-md"
          >
            Back to Project →
          </Link>
        )}
      </div>
    </div>
  );
}
