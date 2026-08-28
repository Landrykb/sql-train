'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BleepxFace } from '@/components/BleepxIcons';
import { useProgress } from '@/lib/useProgress';

type AssistantContext = 'home' | 'sql' | 'lab' | 'cloud' | 'journey' | 'general';

const STORAGE_KEY = 'bleepx-assistant-dismissed';

const DEFAULT_HINTS: Record<string, { text: string; cta: string; href: string }> = {
  '/': { text: 'Start with SQL basics, then Python, then pick a cloud or ML goal.', cta: 'Start My Journey', href: '/journey' },
  '/cases': { text: 'Each case teaches one SQL skill. Finish the business basics before the hidden cases.', cta: 'Open Business Case', href: '/cases/business' },
  '/lab': { text: 'BleepxLab turns SQL skills into Python and data science. Try churn or carbon credits.', cta: 'Try Churn Lab', href: '/lab/churn/churn_explore' },
  '/cloud': { text: 'Cloud is hands-on. Start with the BleepxBank sandbox scenario.', cta: 'Open Sandbox', href: '/cloud/sandbox' },
  '/cloud/sandbox': { text: 'Mission: block the public S3 bucket, then create a Lambda and a DynamoDB table.', cta: 'Run Security Scan', href: '/cloud/sandbox' },
  '/cloud/pipelines': { text: 'Pick a project preset, run SQL, transform with Python, then upload to S3.', cta: 'Choose a preset', href: '/cloud/pipelines' },
  '/cloud/certifications': { text: 'Check off each SAA-C03 domain step as you complete it in the sandbox.', cta: 'Back to Sandbox', href: '/cloud/sandbox' },
  '/journey': { text: 'Pick your goals and time. Bleepx will build the path and remember it.', cta: 'Generate Plan', href: '#' },
};

const findJourneyGoal = (): string | null => {
  try {
    const raw = localStorage.getItem('bleepx-journey');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.plan?.suggested?.length) return parsed.plan.suggested[0];
  } catch { /* ignore */ }
  return null;
};

export default function BleepxAssistant({ context }: { context?: AssistantContext }) {
  const pathname = usePathname();
  const { completed, points } = useProgress();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.date === new Date().toDateString()) setDismissed(true);
      }
    } catch { /* ignore */ }
  }, []);

  const hint = useMemo(() => {
    const exact = DEFAULT_HINTS[pathname];
    if (exact) return exact;
    if (pathname?.startsWith('/cases/')) return { text: 'Read the case, run a query, and hit the Bleepx hint if you are stuck.', cta: 'Back to Cases', href: '/cases' };
    if (pathname?.startsWith('/lab/')) return { text: 'Load the dataset, run each section, then complete the solution code. Need help? Ask Bleepx.', cta: 'Back to Labs', href: '/lab' };
    if (pathname?.startsWith('/cloud/')) return { text: 'Cloud questions are scenario-based. Think security, resilience, performance, cost.', cta: 'Open Sandbox', href: '/cloud/sandbox' };
    return { text: 'Bleepx is here to guide you from SQL to Cloud. Pick your path in the Journey page.', cta: 'My Journey', href: '/journey' };
  }, [pathname]);

  const goal = findJourneyGoal();
  const completedCount = completed.size;

  const message = useMemo(() => {
    const goalText = goal ? `Your current track: ${goal}. ` : '';
    return `${goalText}${hint.text}`;
  }, [goal, hint]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: new Date().toDateString() }));
    } catch { /* ignore */ }
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 sm:w-80 p-4 rounded-2xl bg-bleepx-white dark:bg-gray-900 border border-bleepx-border shadow-2xl text-sm animate-in slide-in-from-bottom-3 fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="shrink-0"><BleepxFace size={28} /></div>
            <div className="flex-1">
              <div className="font-bold text-bleepx-text mb-1">Bleepx says</div>
              <p className="text-bleepx-text-secondary mb-3">{message}</p>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-3">{completedCount} steps done · {points} pts</div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={hint.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-full bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors"
                >
                  {hint.cta}
                </Link>
                <button onClick={handleDismiss} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        aria-label="Open Bleepx assistant"
      >
        <BleepxFace size={24} />
      </button>
    </div>
  );
}
