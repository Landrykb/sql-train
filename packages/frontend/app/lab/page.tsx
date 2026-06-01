'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import { BleepxWave, BleepxGhost, BleepxSpark, BleepxFace, BleepxGit, BleepxSignal } from '@/components/BleepxIcons';
import AchievementNotification from '@/components/AchievementNotification';
import { LAB_DOMAIN_META, LAB_CASE_ORDER } from '@/lib/labConstants';
import { useProgress } from '@/lib/useProgress';

const domains = Object.keys(LAB_DOMAIN_META);

export default function LabHomePage() {
  const { completed, points } = useProgress();

  const labStats = useMemo(() => {
    const allLabIds = Object.values(LAB_CASE_ORDER).flat();
    const labCompleted = allLabIds.filter(id => completed.has(id) || completed.has(`lab_${id}`)).length;
    return { total: allLabIds.length, completed: labCompleted, pct: allLabIds.length > 0 ? Math.round((labCompleted / allLabIds.length) * 100) : 0 };
  }, [completed]);

  return (
    <main className="max-w-5xl mx-auto space-y-6 sm:space-y-10 bg-bleepx-bg min-h-screen pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-10 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute -bottom-2 right-4 sm:right-10 opacity-20 hidden sm:block"><BleepxWave size={120} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <BleepxLogo />
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">BleepxLab</h1>
              <span className="text-xs sm:text-sm bg-white/20 px-2 py-0.5 rounded-full font-medium">Python · R · Data Science</span>
            </div>
          </div>
          <p className="text-white/80 text-sm sm:text-lg max-w-lg leading-relaxed">
            Build <strong className="text-white">real data science projects</strong> step by step. From EDA to ML models — transport delays, fraud detection, ESG analytics, and more.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/lab#projects" className="px-5 py-2.5 rounded-full bg-white text-teal-700 font-semibold text-sm hover:bg-gray-100 transition-colors shadow-lg">
              Explore Projects
            </Link>
            <Link href="/lab/guide" className="px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
              📖 DS Guide
            </Link>
            <Link href="/" className="px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
              🔷 BleepxQuery (SQL)
            </Link>
            <Link href="/cloud" className="px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
              ☁️ BleepxCloud
            </Link>
          </div>
        </div>
      </div>

      {/* Verse Toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex flex-wrap justify-center rounded-full bg-bleepx-white border border-bleepx-border shadow-sm p-1 gap-1">
          <Link href="/" className="px-4 py-1.5 rounded-full text-sm font-medium text-bleepx-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            🔷 BleepxQuery
          </Link>
          <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-teal-600 text-white">
            🔬 BleepxLab
          </span>
          <Link href="/cloud" className="px-4 py-1.5 rounded-full text-sm font-medium text-bleepx-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            ☁️ BleepxCloud
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-bleepx-text">{domains.length}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Projects</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-emerald-600">{labStats.completed}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Steps Done</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-amber-600">{points}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Total Points</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="relative w-12 h-12 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" className="stroke-teal-500" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${labStats.pct * 2.51} 251`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-bleepx-text">{labStats.pct}%</span>
            </div>
          </div>
          <div className="text-xs text-bleepx-text-secondary mt-1">Overall</div>
        </div>
      </div>

      {/* Quiz Card */}
      <Link
        href="/lab/quiz"
        className="group block bg-gradient-to-br from-purple-900 via-indigo-800 to-violet-900 border-2 border-purple-500/30 rounded-xl shadow-lg hover:shadow-purple-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="p-5 flex items-center gap-4">
          <div className="text-3xl">🧠</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-white text-lg group-hover:text-purple-300 transition-colors">Data Science Quizzes</h3>
            <p className="text-sm text-gray-400 mt-0.5">Test your knowledge — statistics, ML, Python, LLMs, AWS & more.</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-gray-500">Per-project quizzes</span>
              <span className="text-purple-400 text-xs">🏆 Master Quiz available</span>
            </div>
          </div>
          <svg className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform flex-shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Project cards */}
      <div id="projects">
        <h2 className="text-lg sm:text-xl font-bold text-bleepx-text mb-4">Choose Your Project</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {domains.map((d) => {
            const meta = LAB_DOMAIN_META[d];
            const cases = LAB_CASE_ORDER[d] || [];
            const steps = cases.length;
            const done = cases.filter(c => completed.has(c) || completed.has(`lab_${c}`)).length;
            const pct = steps > 0 ? Math.round((done / steps) * 100) : 0;

            return (
              <Link
                key={d}
                href={`/lab/${d}`}
                className="group relative overflow-hidden bg-bleepx-white border border-bleepx-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                  <div className="text-2xl sm:text-3xl flex-shrink-0 pt-0.5">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-bleepx-text text-base sm:text-lg group-hover:text-teal-600 transition-colors">
                        {meta.name}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-bleepx-text-secondary mt-0.5 line-clamp-2">{meta.desc}</p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] sm:text-xs text-bleepx-text-secondary">{meta.difficulty}</span>
                      <span className="text-amber-400 text-[10px]">{'⭐'.repeat(meta.stars)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium">{meta.language}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] sm:text-xs text-bleepx-text-secondary font-mono whitespace-nowrap">{done}/{steps}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 dark:text-gray-600 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 sm:p-6">
        <h2 className="text-lg font-bold text-bleepx-text mb-4">What You Get</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="flex justify-center mb-1"><BleepxSignal size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">Step-by-Step Guides</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">Code + theory per step</div>
          </div>
          <div>
            <div className="flex justify-center mb-1"><BleepxSpark size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">Real Datasets</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">Kaggle & public sources</div>
          </div>
          <div>
            <div className="flex justify-center mb-1"><BleepxFace size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">ML Models</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">Regression to deep learning</div>
          </div>
          <div>
            <div className="flex justify-center mb-1"><BleepxGit size={28} /></div>
            <div className="text-xs font-medium text-bleepx-text">Portfolio Ready</div>
            <div className="text-[10px] text-bleepx-text-secondary mt-0.5">Resume-worthy projects</div>
          </div>
        </div>
      </div>

      <AchievementNotification />
    </main>
  );
}
