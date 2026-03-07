'use client';

import React from 'react';
import Link from 'next/link';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import { BleepxWave, BleepxGhost, BleepxSpark, BleepxFace, BleepxGit, BleepxSignal } from '@/components/BleepxIcons';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, fullCaseOrder } from '@/lib/constants';

const domainMeta: Record<string, { icon: string; desc: string; color: string; difficulty: string; stars: number }> = {
  business: { icon: '🏬', desc: 'Retail analytics, revenue optimization & customer insights', color: 'from-blue-500 to-blue-700', difficulty: 'Beginner', stars: 1 },
  crime: { icon: '🔍', desc: 'Chicago crime patterns, geospatial analysis & suspect tracking', color: 'from-red-500 to-red-700', difficulty: 'Beginner', stars: 1 },
  farming: { icon: '🌾', desc: 'NDVI vegetation indices, crop yield prediction & soil analysis', color: 'from-green-500 to-green-700', difficulty: 'Intermediate', stars: 2 },
  finance: { icon: '📈', desc: 'Stock trading signals, portfolio risk & market analytics', color: 'from-purple-500 to-purple-700', difficulty: 'Intermediate', stars: 2 },
  healthcare: { icon: '🏥', desc: 'Patient records, diagnosis patterns & treatment outcomes', color: 'from-teal-500 to-teal-700', difficulty: 'Intermediate', stars: 2 },
  social: { icon: '💬', desc: 'Twitter engagement, user networks & sentiment analysis', color: 'from-pink-500 to-pink-700', difficulty: 'Intermediate', stars: 2 },
  space: { icon: '🚀', desc: 'Near-Earth objects, orbital mechanics & hazard detection', color: 'from-indigo-500 to-indigo-700', difficulty: 'Advanced', stars: 3 },
  sports: { icon: '🏀', desc: 'NBA game stats, player performance & shot analytics', color: 'from-orange-500 to-orange-700', difficulty: 'Advanced', stars: 3 },
};

const domains = Object.keys(domainMeta);

export default function HomePage() {
  const { completed } = useProgress();
  const allCaseIds = Object.entries(fullCaseOrder).filter(([d]) => d !== 'guide' && d !== 'trials').flatMap(([, ids]) => ids);
  const totalCompleted = completed?.size || 0;
  const totalChallenges = allCaseIds.length;
  const overallPct = totalChallenges > 0 ? Math.round((totalCompleted / totalChallenges) * 100) : 0;

  return (
    <main className="max-w-5xl mx-auto space-y-6 sm:space-y-10 bg-bleepx-bg min-h-screen pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bleepx-blue via-indigo-600 to-bleepx-pink p-6 sm:p-10 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute -bottom-2 right-4 sm:right-10 opacity-20 hidden sm:block"><BleepxWave size={120} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <BleepxLogo />
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">BleepxQuery</h1>
          </div>
          <p className="text-white/80 text-sm sm:text-lg max-w-lg leading-relaxed">
            Master SQL through <strong className="text-white">real-world data challenges</strong>. Progress from beginner to expert across 8 industry domains, tackle timed trials, unlock hidden bonus missions, and build a GitHub portfolio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/cases" className="px-5 py-2.5 rounded-full bg-white text-bleepx-blue font-semibold text-sm hover:bg-gray-100 transition-colors shadow-lg">
              Start Training
            </Link>
            <Link href="/cases/guide" className="px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
              📖 SQL Reference Guide
            </Link>
          </div>
        </div>
      </div>

      {/* Verse Toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full bg-bleepx-white border border-bleepx-border shadow-sm p-1">
          <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-bleepx-blue text-white">
            🔷 BleepxQuery
          </span>
          <Link href="/lab" className="px-4 py-1.5 rounded-full text-sm font-medium text-bleepx-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            🔬 BleepxLab
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-bleepx-text">{domains.length}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Domains</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-amber-600">{totalChallenges}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Challenges</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-emerald-600">{totalCompleted}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Completed</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="relative w-12 h-12 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" className="stroke-bleepx-blue" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${overallPct * 2.51} 251`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-bleepx-text">{overallPct}%</span>
            </div>
          </div>
          <div className="text-xs text-bleepx-text-secondary mt-1">Overall</div>
        </div>
      </div>

      <BleepxPointsTracker caseIds={allCaseIds} />

      {/* Trials Section */}
      <div>
        <Link
          href="/cases/trials"
          className="group block relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 border-2 border-indigo-500/30 rounded-xl shadow-lg hover:shadow-indigo-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-[url('/bleepx-logo.png')] bg-center bg-no-repeat opacity-5 bg-contain" />
          <div className="relative p-5 sm:p-6 flex items-center gap-4">
            <div className="flex-shrink-0"><BleepxGhost size={48} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg sm:text-xl group-hover:text-indigo-300 transition-colors">
                  Trials Arena
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Timed
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                *bleep* {caseOrder.trials?.length || 5} cross-domain SQL trials. No prerequisites. Pick your difficulty and prove your skills, human.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {caseOrder.trials?.filter((id: string) => completed?.has(id)).length || 0}/{caseOrder.trials?.length || 5} cleared
                </span>
                <span className="text-amber-400 text-xs">⚡ Timed Mode</span>
              </div>
            </div>
            <svg className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform flex-shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Or divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-bleepx-border" />
        <span className="text-sm font-medium text-bleepx-text-secondary uppercase tracking-wider flex items-center gap-1.5"><BleepxFace size={18} /> Or</span>
        <div className="flex-1 h-px bg-bleepx-border" />
      </div>

      {/* Domain cards */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-bleepx-text mb-4">Choose Your Domain</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                  <div className="text-2xl sm:text-3xl flex-shrink-0 pt-0.5">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-bleepx-text capitalize text-base sm:text-lg group-hover:text-bleepx-blue transition-colors">
                        {d}
                      </h3>
                      {done === total && total > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">COMPLETE</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-bleepx-text-secondary mt-0.5 line-clamp-2">{meta.desc}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs text-bleepx-text-secondary">{meta.difficulty}</span>
                      <span className="text-amber-400 text-[10px]">{'⭐'.repeat(meta.stars)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs text-bleepx-text-secondary font-mono whitespace-nowrap">
                        {done}/{total}
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 dark:text-gray-600 group-hover:text-bleepx-blue group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* BleepxLab Promo */}
      <div>
        <Link
          href="/lab"
          className="group block relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-cyan-900 border-2 border-teal-500/30 rounded-xl shadow-lg hover:shadow-teal-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-[url('/bleepx-logo.png')] bg-center bg-no-repeat opacity-5 bg-contain" />
          <div className="relative p-5 sm:p-6 flex items-center gap-4">
            <div className="flex-shrink-0 text-3xl">🔬</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg sm:text-xl group-hover:text-teal-300 transition-colors">
                  BleepxLab
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                  Data Science
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                *bleep* {overallPct >= 50 ? 'You\'ve proven your SQL skills. Ready for the next verse?' : '9 real-world data science projects. Python & R. From EDA to ML models.'}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">9 projects · 38 steps</span>
                <span className="text-teal-400 text-xs">🐍 Python + R</span>
              </div>
            </div>
            <svg className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform flex-shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Features */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 sm:p-6">
        <h2 className="text-lg font-bold text-bleepx-text mb-4">What You Get</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="flex justify-center mb-1"><BleepxSignal size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">Progressive Difficulty</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">Beginner to Expert</div>
          </div>
          <div>
            <div className="flex justify-center mb-1"><BleepxSpark size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">Data Visualizations</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">Plotly charts per case</div>
          </div>
          <div>
            <div className="flex justify-center mb-1"><BleepxFace size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">Hidden Bonus Missions</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">Real-world scenarios</div>
          </div>
          <div>
            <div className="flex justify-center mb-1"><BleepxGit size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">Portfolio Export</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">GitHub-ready projects</div>
          </div>
        </div>
      </div>

      <AchievementNotification />
    </main>
  );
}