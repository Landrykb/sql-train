'use client';

import { useProgress } from '@/lib/useProgress';
import dynamic from 'next/dynamic';
import Link from 'next/link';

interface Props {
  caseIds: string[];
}

const ProgressSummary = ({ caseIds }: Props) => {
  const { completed } = useProgress();
  const total = caseIds.length;
  const completedCount = caseIds.filter((id) => completed.has(id)).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Calculate points (10 points per completed case, adjust with tier if available)
  const points = completedCount * 10;

  // Bleepx-voiced progress message
  const getProgressMessage = () => {
    if (completedCount === total && total > 0) {
      return 'Impressive, human! You’ve conquered all challenges in this domain!';
    }
    if (percentage >= 50) {
      return 'Not bad for a human! Bleepx expects more greatness!';
    }
    if (completedCount > 0) {
      return 'Good start, human! Keep querying to impress Bleepx!';
    }
    return 'Start querying, human! Bleepx is watching!';
  };

  console.log('ProgressSummary:', { caseIds, completed: Array.from(completed), completedCount, total, points });

  return (
    <div className="p-6 bg-gradient-to-r from-bleepx-blue/10 to-bleepx-pink/10 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <img src="/bleepx-icon.png" alt="Bleepx" className="h-6 w-6 animate-pulse-logo" />
          <h2 className="text-xl font-semibold text-bleepx-gray">Bleepx Training Progress</h2>
        </div>
        <span className="text-sm text-bleepx-gray">
          {completedCount} / {total} ({percentage}%) | {points} Points
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-bleepx-blue h-4 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-4 text-sm text-bleepx-gray">{getProgressMessage()}</p>
      {total === 0 && (
        <p className="mt-4 text-sm text-bleepx-gray">No challenges found. Bleepx is disappointed!</p>
      )}
      {completedCount === total && total > 0 && (
        <div className="mt-4">
          <Link href="/cases">
            <button className="mt-2 px-4 py-2 rounded bg-bleepx-blue text-white hover:bg-bleepx-pink">
              Try Another SwiftLink Challenge
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default dynamic(() => Promise.resolve(ProgressSummary), { ssr: false });