'use client';

import { useProgress } from '@/lib/useProgress';
import { getProgressMessage } from '@/lib/bleepxDialogue';
import dynamic from 'next/dynamic';
import Link from 'next/link';

interface Props {
  caseIds: string[];
}

const ProgressSummary = ({ caseIds }: Props) => {
  const { completed, points } = useProgress();
  const total = caseIds.length;
  const completedCount = caseIds.filter((id) => completed.has(id)).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="p-5 bg-bleepx-white rounded-xl shadow-sm border border-bleepx-border">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-bleepx-text">SwiftLink Training</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-bleepx-text-secondary">{completedCount}/{total} missions</span>
          <span className="text-xs font-bold text-bleepx-blue bg-bleepx-blue/10 px-2 py-0.5 rounded-full">{points} pts</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-bleepx-blue to-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-bleepx-text-secondary italic">{getProgressMessage(completedCount, total)}</p>
      {completedCount === total && total > 0 && (
        <div className="mt-3">
          <Link href="/cases">
            <button className="px-4 py-1.5 rounded-full bg-bleepx-blue text-white text-sm hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors">
              Next Domain →
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default dynamic(() => Promise.resolve(ProgressSummary), { ssr: false });