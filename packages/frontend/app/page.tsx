'use client';

import React from 'react';
import Link from 'next/link';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, fullCaseOrder } from '@/lib/constants';

const domainMeta: Record<string, { icon: string; desc: string; color: string }> = {
  business: { icon: '🏬', desc: 'Retail analytics & revenue optimization', color: 'from-blue-500 to-blue-700' },
  crime: { icon: '🔍', desc: 'Chicago crime data & pattern detection', color: 'from-red-500 to-red-700' },
  farming: { icon: '🌾', desc: 'NDVI vegetation & crop yield analysis', color: 'from-green-500 to-green-700' },
  finance: { icon: '📈', desc: 'Stock trading & portfolio risk metrics', color: 'from-purple-500 to-purple-700' },
  healthcare: { icon: '🏥', desc: 'Patient records & treatment outcomes', color: 'from-teal-500 to-teal-700' },
  social: { icon: '💬', desc: 'Twitter engagement & user analytics', color: 'from-pink-500 to-pink-700' },
  space: { icon: '🚀', desc: 'Near-Earth objects & orbital mechanics', color: 'from-indigo-500 to-indigo-700' },
  sports: { icon: '🏀', desc: 'NBA game stats & player performance', color: 'from-orange-500 to-orange-700' },
};

const domains = Object.keys(domainMeta);

export default function HomePage() {
  const { completed } = useProgress();
  const allCaseIds = Object.values(fullCaseOrder).flat();

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8 bg-bleepx-bg min-h-screen">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="flex items-center justify-center gap-3">
          <BleepxLogo />
          <h1 className="text-4xl font-extrabold text-bleepx-text tracking-tight">BleepxQuery</h1>
        </div>
        <p className="text-bleepx-text-secondary text-lg max-w-xl mx-auto">
          Master SQL through real-world challenges. Pick a domain, solve progressively harder queries, and unlock hidden bonus missions.
        </p>
      </div>

      <BleepxPointsTracker caseIds={allCaseIds} />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-bleepx-text">{domains.length}</div>
          <div className="text-xs text-bleepx-text-secondary uppercase tracking-wide">Domains</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-emerald-600">{completed?.size || 0}</div>
          <div className="text-xs text-bleepx-text-secondary uppercase tracking-wide">Completed</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-amber-600">{allCaseIds.length}</div>
          <div className="text-xs text-bleepx-text-secondary uppercase tracking-wide">Total Challenges</div>
        </div>
      </div>

      {/* Domain cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {domains.map((d) => {
          const meta = domainMeta[d];
          const total = fullCaseOrder[d]?.length || 0;
          const done = fullCaseOrder[d]?.filter((id) => completed?.has(id)).length || 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Link
              key={d}
              href={`/cases/${d}`}
              className="group relative overflow-hidden bg-bleepx-white border border-bleepx-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <div className="p-5 flex items-start gap-4">
                <div className="text-3xl flex-shrink-0 pt-0.5">{meta.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-bleepx-text capitalize text-lg group-hover:text-bleepx-blue transition-colors">
                    {d}
                  </h3>
                  <p className="text-sm text-bleepx-text-secondary mt-0.5 line-clamp-1">{meta.desc}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-bleepx-text-secondary font-mono whitespace-nowrap">
                      {done}/{total}
                    </span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-bleepx-blue group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Guide link */}
      <div className="text-center">
        <Link
          href="/cases/guide"
          className="inline-flex items-center gap-2 text-bleepx-blue hover:text-bleepx-blue-hover transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          SQL Reference Guide
        </Link>
      </div>

      <AchievementNotification />
    </main>
  );
}