'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import AchievementNotification from '@/components/AchievementNotification';
import { useProgress } from '@/lib/useProgress';
import {
  CLOUD_PROVIDER_META,
  CLOUD_PROVIDERS,
  CLOUD_MISSIONS,
  TOTAL_CLOUD_MISSIONS,
  cloudMissionId,
} from '@/lib/cloud';

export default function CloudHomePage() {
  const { completed, points } = useProgress();

  const stats = useMemo(() => {
    let done = 0;
    const perProvider: Record<string, { done: number; total: number; pct: number }> = {};
    for (const p of CLOUD_PROVIDERS) {
      const missions = CLOUD_MISSIONS[p];
      const pDone = missions.filter((m) => completed.has(cloudMissionId(p, m.slug))).length;
      perProvider[p] = {
        done: pDone,
        total: missions.length,
        pct: missions.length ? Math.round((pDone / missions.length) * 100) : 0,
      };
      done += pDone;
    }
    return {
      done,
      total: TOTAL_CLOUD_MISSIONS,
      pct: TOTAL_CLOUD_MISSIONS ? Math.round((done / TOTAL_CLOUD_MISSIONS) * 100) : 0,
      perProvider,
    };
  }, [completed]);

  return (
    <main className="max-w-5xl mx-auto space-y-6 sm:space-y-10 bg-bleepx-bg min-h-screen pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 sm:p-10 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-10 w-44 h-44 bg-white/5 rounded-full translate-y-1/2" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:24px_24px] opacity-40" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <BleepxLogo />
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">BleepxCloud</h1>
              <span className="text-xs sm:text-sm bg-white/20 px-2 py-0.5 rounded-full font-medium">AWS · Azure · GCP · ESG · FinOps</span>
            </div>
          </div>
          <p className="text-white/85 text-sm sm:text-lg max-w-xl leading-relaxed">
            Become <strong className="text-white">cloud-certified and job-ready</strong>. Architect real systems across the big three providers, then go transversal — decarbonization, carbon markets, fintech, healthcare and more. From <strong className="text-white">EC2 to net-zero</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#tracks" className="px-5 py-2.5 rounded-full bg-white text-blue-700 font-semibold text-sm hover:bg-gray-100 transition-colors shadow-lg">
              Explore Tracks
            </Link>
            <Link href="/cloud/trials" className="px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
              ⚡ Trials Arena
            </Link>
            <Link href="/cloud/guide" className="px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
              📖 Cloud Guide
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
          <Link href="/lab" className="px-4 py-1.5 rounded-full text-sm font-medium text-bleepx-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            🔬 BleepxLab
          </Link>
          <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-sky-600 text-white">
            ☁️ BleepxCloud
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-bleepx-text">{CLOUD_PROVIDERS.length}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Tracks</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-sky-600">{stats.total}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Missions</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="text-2xl font-bold text-emerald-600">{stats.done}</div>
          <div className="text-xs text-bleepx-text-secondary mt-0.5">Completed</div>
        </div>
        <div className="bg-bleepx-white rounded-xl p-4 text-center shadow-sm border border-bleepx-border">
          <div className="relative w-12 h-12 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" className="stroke-sky-500" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${stats.pct * 2.51} 251`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-bleepx-text">{stats.pct}%</span>
            </div>
          </div>
          <div className="text-xs text-bleepx-text-secondary mt-1">Overall</div>
        </div>
      </div>

      {/* Provider tracks */}
      <div id="tracks">
        <h2 className="text-lg sm:text-xl font-bold text-bleepx-text mb-4">Choose Your Track</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {CLOUD_PROVIDERS.map((p) => {
            const meta = CLOUD_PROVIDER_META[p];
            const s = stats.perProvider[p];
            return (
              <Link
                key={p}
                href={`/cloud/${p}`}
                className="group relative overflow-hidden bg-bleepx-white border border-bleepx-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-2xl shadow-md`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-bleepx-text text-base sm:text-lg group-hover:text-sky-600 transition-colors">
                        {meta.name}
                      </h3>
                      {meta.cert && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">{meta.cert}</span>
                      )}
                      {s.pct === 100 && (
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
                        <div className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="text-[10px] sm:text-xs text-bleepx-text-secondary font-mono whitespace-nowrap">{s.done}/{s.total}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Transversal callout */}
      <div className="rounded-xl border border-bleepx-border bg-bleepx-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-bleepx-text mb-2">🌍 Transversal by design</h2>
        <p className="text-sm text-bleepx-text-secondary leading-relaxed">
          BleepxCloud isn&apos;t just buttons in a console. The <strong className="text-bleepx-text">ESG &amp; Decarbonization</strong> track connects to the BleepxLab carbon &amp; farming projects, while <strong className="text-bleepx-text">Finance &amp; Industry</strong> brings FinOps, real-time fraud, retail, healthcare, media and gaming blueprints. You learn the service <em>and</em> the business problem it solves.
        </p>
      </div>

      <AchievementNotification />
    </main>
  );
}
