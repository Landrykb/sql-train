'use client';
import { useProgress } from '@/lib/useProgress';
import { hiddenCaseOrder } from '@/lib/constants';
import { getProgressMessage } from '@/lib/bleepxDialogue';
import { useState, useEffect } from 'react';

interface Props {
  caseIds: string[];
  domain: string;
  cases: { id: string; name?: string; prereq_cases?: string[]; tier?: number }[];
}

export default function CaseProgress({ caseIds, domain, cases }: Props) {
  const { completed, isUnlocked } = useProgress();
  const [progress, setProgress] = useState<Map<string, boolean>>(new Map());
  const [unlocked, setUnlocked] = useState<Map<string, boolean>>(new Map());
  const hiddenIds = new Set(hiddenCaseOrder[domain] || []);

  useEffect(() => {
    const newProgress = new Map<string, boolean>();
    const newUnlocked = new Map<string, boolean>();
    caseIds.forEach((id, index) => {
      const isFirstCase = index === 0;
      const caseData = cases.find((c) => c.id === id);
      const isCaseUnlocked = isFirstCase || isUnlocked(caseData?.prereq_cases || []);
      newProgress.set(id, completed.has(id));
      newUnlocked.set(id, isCaseUnlocked);
    });
    setProgress(newProgress);
    setUnlocked(newUnlocked);
  }, [caseIds, cases, completed, isUnlocked]);

  const regularIds = caseIds.filter((id) => !hiddenIds.has(id));
  const bonusIds = caseIds.filter((id) => hiddenIds.has(id));
  const completedCount = caseIds.filter((id) => completed.has(id)).length;

  const getCaseName = (id: string) => {
    const c = cases.find((c) => c.id === id);
    return c?.name || id.replace(/_/g, ' ');
  };

  return (
    <div className="bg-gradient-to-r from-bleepx-blue/5 to-bleepx-pink/5 p-4 sm:p-6 rounded-xl shadow-sm border border-bleepx-border h-full max-h-[500px] lg:max-h-none overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-bleepx-text">Mission Checklist</h2>
        <span className="text-xs font-mono text-bleepx-text-secondary">{completedCount}/{caseIds.length}</span>
      </div>
      <ul className="space-y-1.5">
        {regularIds.map((id) => {
          const tier = cases.find((c) => c.id === id)?.tier || 1;
          const done = progress.get(id);
          const open = unlocked.get(id);
          return (
            <li key={id} className={`flex items-center py-1.5 px-3 rounded-lg transition-colors ${done ? 'bg-emerald-50 dark:bg-emerald-900/20' : open ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : open ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                {done ? '✓' : open ? '→' : '·'}
              </span>
              <span className={`ml-3 text-sm ${done ? 'text-emerald-700 dark:text-emerald-400 line-through' : open ? 'text-bleepx-text font-medium' : 'text-gray-400'}`}>
                {getCaseName(id)}
              </span>
              {done && <span className="ml-auto text-xs text-emerald-600 font-mono">+{10 * tier}pts</span>}
            </li>
          );
        })}
      </ul>
      {bonusIds.length > 0 && (
        <>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-amber-200 dark:bg-amber-700" />
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Classified Missions</span>
            <div className="h-px flex-1 bg-amber-200 dark:bg-amber-700" />
          </div>
          <ul className="space-y-1.5">
            {bonusIds.map((id) => {
              const tier = cases.find((c) => c.id === id)?.tier || 6;
              const done = progress.get(id);
              const open = unlocked.get(id);
              return (
                <li key={id} className={`flex items-center py-1.5 px-3 rounded-lg transition-colors ${done ? 'bg-amber-50 dark:bg-amber-900/20' : open ? 'bg-purple-50/50 dark:bg-purple-900/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                  <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold flex-shrink-0 rotate-45 ${done ? 'bg-amber-500 text-white' : open ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                    <span className="-rotate-45">{done ? '★' : open ? '◆' : '?'}</span>
                  </span>
                  <span className={`ml-3 text-sm ${done ? 'text-amber-700 dark:text-amber-400' : open ? 'text-purple-700 dark:text-purple-400 font-medium' : 'text-gray-400 italic'}`}>
                    {open || done ? getCaseName(id) : '■■■ Classified ■■■'}
                  </span>
                  {done && <span className="ml-auto text-xs text-amber-600 font-mono">+{10 * tier}pts</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs text-bleepx-text-secondary italic">{getProgressMessage(completedCount, caseIds.length)}</p>
    </div>
  );
}