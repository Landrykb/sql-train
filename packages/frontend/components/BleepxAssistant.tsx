'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BleepxGhost, BleepxWave, BleepxThink, BleepxCode } from '@/components/BleepxIcons';
import { useProgress } from '@/lib/useProgress';
import { playBleep } from '@/lib/audio';

type AssistantContext = 'home' | 'sql' | 'lab' | 'cloud' | 'journey' | 'general';

type Mood = 'idle' | 'wave' | 'think' | 'code';

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
  const [mood, setMood] = useState<Mood>('idle');

  const hint = useMemo(() => {
    const exact = DEFAULT_HINTS[pathname];
    if (exact) return exact;
    if (pathname?.startsWith('/cases/')) return { text: 'Read the case, run a query, and hit the Bleepx hint if you are stuck.', cta: 'Back to Cases', href: '/cases' };
    if (pathname?.startsWith('/lab/')) return { text: 'Load the dataset, run each section, then complete the solution code. Need help? Ask Bleepx.', cta: 'Back to Labs', href: '/lab' };
    if (pathname?.startsWith('/cloud/')) return { text: 'Cloud questions are scenario-based. Think security, resilience, performance, cost.', cta: 'Open Sandbox', href: '/cloud/sandbox' };
    return { text: 'Bleepx is here to guide you from SQL to Cloud. Pick your path in the Journey page.', cta: 'My Journey', href: '/journey' };
  }, [pathname]);

  useEffect(() => {
    if (pathname?.startsWith('/lab/')) setMood('code');
    else setMood('idle');
  }, [pathname]);

  const goal = findJourneyGoal();
  const completedCount = completed.size;

  const message = useMemo(() => {
    const goalText = goal ? `Your current track: ${goal}. ` : '';
    return `${goalText}${hint.text}`;
  }, [goal, hint]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        playBleep();
        setMood('wave');
        setTimeout(() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle'), 1200);
      }
      return next;
    });
  };

  const Sprite = mood === 'wave' ? BleepxWave : mood === 'think' ? BleepxThink : mood === 'code' ? BleepxCode : BleepxGhost;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="relative w-80 sm:w-96 p-4 rounded-2xl bg-white dark:bg-gray-900 border-2 border-sky-300 dark:border-sky-700 shadow-2xl text-sm transform transition-all duration-300 origin-bottom-right">
          {/* speech bubble tail */}
          <div className="absolute -bottom-3 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-sky-300 dark:border-t-sky-700" />
          <div className="flex items-start gap-3">
            <div className="shrink-0 animate-bounce">
              <BleepxWave size={36} />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-bleepx-text mb-1 flex items-center gap-2">Bleepx <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 font-bold">Assistant</span></div>
              <p className="text-bleepx-text-secondary mb-3 leading-relaxed">{message}</p>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-3">{completedCount} steps done · {points} pts</div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={hint.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-full bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors"
                >
                  {hint.cta}
                </Link>
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        onMouseEnter={() => setMood('think')}
        onMouseLeave={() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle')}
        className="group relative w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-2xl hover:shadow-sky-500/30 transition-all duration-300 flex items-center justify-center hover:-translate-y-1 hover:scale-110 animate-float"
        aria-label="Open Bleepx assistant"
      >
        <Sprite size={40} className="drop-shadow-md transition-transform duration-300 group-hover:rotate-6" />
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500" />
          </span>
        )}
      </button>
    </div>
  );
}
