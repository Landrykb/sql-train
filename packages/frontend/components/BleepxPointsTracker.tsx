'use client';

import { useState, useEffect } from 'react';
import { useProgress } from '@/lib/useProgress';

interface Props {
  caseIds: string[];
}

export default function BleepxPointsTracker({ caseIds }: Props) {
  const { completed, points } = useProgress();
  const [progressMessage, setProgressMessage] = useState('Start querying, human!');

  useEffect(() => {
    const completedCount = caseIds.filter((id) => completed.has(id)).length;
    if (completedCount >= caseIds.length && caseIds.length > 0) {
      setProgressMessage('You’ve mastered this domain, human! Bleepx is impressed!');
    } else if (completedCount >= caseIds.length / 2) {
      setProgressMessage('Not bad for a human! Keep querying to impress Bleepx!');
    } else if (completedCount > 0) {
      setProgressMessage('Good start, human! Bleepx expects more!');
    }
  }, [completed, caseIds]);

  const maxPoints = caseIds.length * 10; // Approximate max, adjust if tier data is available
  const progressPercentage = maxPoints > 0 ? Math.min((points / maxPoints) * 100, 100) : 0;

  return (
    <div className="p-4 bg-gradient-to-r from-bleepx-blue/10 to-bleepx-pink/10 rounded-lg shadow">
      <div className="flex items-center gap-2 mb-2">
        <img src="/bleepx-icon.png" alt="Bleepx" className="h-6 w-6 animate-pulse-logo" />
        <h3 className="text-lg font-semibold text-bleepx-gray">Bleepx Points: {points}</h3>
      </div>
      <p className="text-sm text-bleepx-gray mb-2">{progressMessage}</p>
      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          className="h-full bg-bleepx-blue rounded transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}