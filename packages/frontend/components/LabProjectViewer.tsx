'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { BleepxFace, BleepxGhost } from '@/components/BleepxIcons';

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
  prevStep?: { id: string; name: string } | null;
  nextStep?: { id: string; name: string } | null;
}

// ─── Code Block with Copy ───────────────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-mono text-bleepx-text-secondary uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-bleepx-text-secondary hover:text-bleepx-text hover:border-teal-400 transition-colors"
        >
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
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
  prevStep,
  nextStep,
}: LabProjectViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [showHints, setShowHints] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const markComplete = (idx: number) => {
    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.add(idx);
      // Auto-expand next section
      if (idx + 1 < sections.length) {
        setExpandedSections((p) => new Set(p).add(idx + 1));
      }
      return next;
    });
  };

  const allComplete = completedSections.size >= sections.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step header */}
      <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-sm font-bold text-teal-700 dark:text-teal-300">
            {stepNumber}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-bleepx-text">{name}</h2>
        </div>
        <p className="text-sm text-bleepx-text-secondary leading-relaxed">{description}</p>

        {/* Skills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium">
              {s}
            </span>
          ))}
        </div>

        {/* Learning objectives */}
        {learningObjectives.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800">
            <h4 className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wide mb-2">Learning Objectives</h4>
            <ul className="space-y-1">
              {learningObjectives.map((obj, i) => (
                <li key={i} className="text-xs text-teal-800 dark:text-teal-200 flex items-start gap-1.5">
                  <span className="text-teal-500 mt-0.5">•</span>
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dataset link */}
        {datasetUrl && (
          <a
            href={datasetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 hover:underline font-medium"
          >
            📊 Download Dataset →
          </a>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${sections.length > 0 ? (completedSections.size / sections.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-bleepx-text-secondary font-medium">
          {completedSections.size}/{sections.length} sections
        </span>
      </div>

      {/* Sections */}
      {sections.map((section, idx) => {
        const isExpanded = expandedSections.has(idx);
        const isComplete = completedSections.has(idx);
        return (
          <div
            key={idx}
            className={`bg-bleepx-white rounded-2xl shadow-sm border transition-all duration-200 ${
              isComplete
                ? 'border-emerald-300 dark:border-emerald-700'
                : 'border-bleepx-border'
            }`}
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(idx)}
              className="w-full p-4 sm:p-5 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-2xl"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isComplete
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary'
              }`}>
                {isComplete ? '✓' : idx + 1}
              </div>
              <h3 className="font-bold text-bleepx-text flex-1">{section.title}</h3>
              <svg
                className={`w-4 h-4 text-bleepx-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Section body */}
            {isExpanded && (
              <div className="px-4 sm:px-5 pb-5 space-y-4">
                {/* Content/instructions */}
                <p className="text-sm text-bleepx-text-secondary leading-relaxed">{section.content}</p>

                {/* Code block */}
                <CodeBlock code={section.code.trim()} language={language} />

                {/* Explanation */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <BleepxFace size={18} />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{section.explanation}</p>
                  </div>
                </div>

                {/* Mark complete button */}
                {!isComplete && (
                  <button
                    onClick={() => markComplete(idx)}
                    className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    ✅ Mark as Complete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Hints */}
      {hints.length > 0 && (
        <div className="bg-bleepx-white rounded-2xl shadow-sm border border-bleepx-border p-4 sm:p-5">
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-2 w-full text-left"
          >
            <BleepxGhost size={20} />
            <span className="text-sm font-bold text-bleepx-text">
              {showHints ? 'Hide Hints' : 'Need a hint?'}
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
      {allComplete && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-200 dark:border-teal-700 p-5 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-lg font-bold text-teal-700 dark:text-teal-300">Step Complete!</h3>
          <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
            You&apos;ve completed all sections in this step.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
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
            className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
          >
            Next: {nextStep.name} →
          </Link>
        ) : (
          <Link
            href={`/lab/${domain}`}
            className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
          >
            Back to Project →
          </Link>
        )}
      </div>
    </div>
  );
}
