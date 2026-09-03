'use client';

import { useProgress } from '@/lib/useProgress';
import { getProgressSnapshot } from '@/lib/bleepxProgress';
import { getPointsMessage } from '@/lib/bleepxDialogue';

interface Props {
  caseIds?: string[];
}

export default function BleepxPointsTracker({ caseIds }: Props) {
  const { completed, points } = useProgress();
  const snap = getProgressSnapshot(completed);
  const completedCount = caseIds ? caseIds.filter((id) => completed.has(id)).length : snap.sql.done;
  const totalCount = caseIds ? caseIds.length : snap.sql.total;

  return (
    <div className="flex items-center gap-4 p-3 bg-bleepx-white rounded-xl shadow-sm border border-bleepx-border">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bleepx-blue to-indigo-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">B</span>
        </div>
        <div>
          <div className="text-sm font-bold text-bleepx-text">{points} <span className="text-xs font-normal text-bleepx-text-secondary">pts</span></div>
          <div className="text-[10px] text-bleepx-text-secondary">{completedCount}/{totalCount} cleared</div>
        </div>
      </div>
      <p className="text-xs text-bleepx-text-secondary italic flex-1 min-w-0 truncate">{getPointsMessage(points)}</p>
    </div>
  );
}