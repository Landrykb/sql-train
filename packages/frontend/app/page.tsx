'use client';

import React from 'react';
import Link from 'next/link';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';

const domains = [
  'business',
  'crime',
  'farming',
  'finance',
  'healthcare',
  'social',
  'space',
  'sports',
];

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8 bg-bleepx-bg">
      <div className="flex items-center gap-3">
        <BleepxLogo />
        <h1 className="text-3xl font-bold text-bleepx-text">BleepxQuery</h1>
      </div>
      <p className="text-bleepx-text-secondary text-lg">
        Choose a SwiftLink Challenge to master SQL with Bleepx!
      </p>
      <BleepxPointsTracker caseIds={domains.flatMap((d) => [`${d}-case1`, `${d}-case2`])} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {domains.map((d) => (
          <Link
            key={d}
            href={`/cases/${d}`}
            className="block p-4 bg-bleepx-white border border-bleepx-border rounded-lg shadow-sm hover:bg-bleepx-blue hover:text-bleepx-white transition-colors duration-300 group"
          >
            <span className="capitalize font-medium text-bleepx-text group-hover:text-bleepx-white">{d}</span>
          </Link>
        ))}
      </div>
      <AchievementNotification />
    </main>
  );
}