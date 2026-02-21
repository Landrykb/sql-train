'use client';
import { useProgress } from '@/lib/useProgress';
import { hiddenCaseOrder } from '@/lib/constants';
import { useState, useEffect } from 'react';

interface Props {
  caseIds: string[];
  domain: string;
  cases: { id: string; prereq_cases?: string[]; tier?: number }[];
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

  return (
    <div className="bg-gradient-to-r from-bleepx-blue/10 to-bleepx-pink/10 p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <img src="/bleepx-icon.png" alt="Bleepx" className="h-6 w-6 animate-pulse-logo" />
        <h2 className="text-xl font-semibold text-bleepx-gray">Bleepx Challenge Progress</h2>
      </div>
      <ul className="space-y-2">
        {regularIds.map((id) => {
          const tier = cases.find((c) => c.id === id)?.tier || 1;
          return (
            <li key={id} className="flex items-center">
              <span className="w-6 text-bleepx-gray">
                {progress.get(id) ? '✓' : unlocked.get(id) ? '○' : '🔒'}
              </span>
              <span className="ml-2 text-bleepx-gray">{id}</span>
              {progress.get(id) && <span className="ml-2 text-sm text-bleepx-blue">+{10 * tier} Points</span>}
            </li>
          );
        })}
      </ul>
      {bonusIds.length > 0 && (
        <>
          <div className="my-4 border-t border-amber-300/50" />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500 text-xs font-bold px-2 py-1 bg-amber-100 rounded-full">BONUS</span>
            <span className="text-sm text-bleepx-gray">Real-World Business Scenarios</span>
          </div>
          <ul className="space-y-2">
            {bonusIds.map((id) => {
              const tier = cases.find((c) => c.id === id)?.tier || 6;
              return (
                <li key={id} className="flex items-center">
                  <span className="w-6 text-amber-500">
                    {progress.get(id) ? '★' : unlocked.get(id) ? '☆' : '🔒'}
                  </span>
                  <span className="ml-2 text-bleepx-gray">{id.replace('hidden_', '').replace(/_/g, ' ')}</span>
                  {progress.get(id) && <span className="ml-2 text-sm text-amber-500">+{10 * tier} Points</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}