'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import AchievementNotification from '@/components/AchievementNotification';
import { useProgress } from '@/lib/useProgress';
import {
  CLOUD_PROVIDER_META,
  getMissions,
  groupBySection,
  isCloudProvider,
  cloudMissionId,
  type CloudProvider,
} from '@/lib/cloud';
import { CloudProviderIcon, StarRating, BrainIcon, GuideIcon, CheckBadge, LockIcon, MissionTypeIcon, SchoolIcon } from '@/components/AppIcons';

const levelColor: Record<string, string> = {
  Beginner: 'border-l-emerald-500',
  Intermediate: 'border-l-amber-500',
  Advanced: 'border-l-red-500',
  Expert: 'border-l-purple-500',
  Master: 'border-l-sky-500',
};

export default function CloudProviderPage() {
  const params = useParams<{ provider: string }>();
  const provider = params.provider;
  const { completed } = useProgress();

  if (!isCloudProvider(provider)) notFound();

  const p = provider as CloudProvider;
  const meta = CLOUD_PROVIDER_META[p];
  const missions = getMissions(p);
  const sections = useMemo(() => groupBySection(missions), [missions]);

  const completedSlugs = useMemo(
    () => new Set(missions.filter((m) => completed.has(cloudMissionId(p, m.slug))).map((m) => m.slug)),
    [completed, missions, p],
  );

  const done = completedSlugs.size;
  const pct = missions.length ? Math.round((done / missions.length) * 100) : 0;

  const isUnlocked = (prereqs: string[]) => prereqs.every((pr) => completedSlugs.has(pr));

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-20">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">{meta.name}</span>
      </nav>

      {/* Header */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${meta.color} p-5 sm:p-7 text-white`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-wrap items-start gap-4">
          <span className="text-white"><CloudProviderIcon provider={provider} size={44} className="text-white" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold break-words">{meta.name}</h1>
            <p className="text-sm text-white/85 mt-1">{meta.desc}</p>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {meta.cert && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium inline-flex flex-wrap items-center gap-1"><SchoolIcon size={12} /> {meta.cert}</span>}
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{missions.length} missions</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{done} done · {pct}%</span>
            </div>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden max-w-sm">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map(({ section, missions: secMissions }) => (
        <section key={section} className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-bleepx-text-secondary">{section}</h2>
          <div className="space-y-2.5">
            {secMissions.map((m) => {
              const isDone = completedSlugs.has(m.slug);
              const unlocked = isUnlocked(m.prerequisites);
              const locked = !unlocked && !isDone;
              const content = (
                <div className={`p-4 sm:p-5 flex items-start gap-3 ${locked ? 'opacity-60' : ''}`}>
                  <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isDone ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary'}`}>
                    {isDone ? <CheckBadge size={16} className="text-white" /> : locked ? <LockIcon size={16} /> : <MissionTypeIcon type={m.labType} size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-bold ${locked ? 'text-bleepx-text-secondary' : 'text-bleepx-text group-hover:text-sky-600'} transition-colors`}>
                        {m.isBonus && !isDone && locked ? '??? Bonus Mission' : m.title}
                      </h3>
                      {m.isBonus && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">BONUS</span>}
                      {m.crossDomain && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">↔ {m.crossDomain}</span>}
                    </div>
                    {!(m.isBonus && locked) && (
                      <p className="text-xs sm:text-sm text-bleepx-text-secondary mt-0.5 line-clamp-2">{m.description.split('\n')[0]}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary">{m.level}</span>
                      <StarRating stars={m.stars} size={10} />
                      {!(m.isBonus && locked) && m.skills.slice(0, 3).map((s) => (
                        <span key={s} className="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">{s}</span>
                      ))}
                      {locked && <span className="text-xs text-bleepx-text-secondary inline-flex flex-wrap items-center gap-1"><LockIcon size={10} /> Requires: {m.prerequisites.join(', ')}</span>}
                    </div>
                  </div>
                </div>
              );
              return locked ? (
                <div key={m.slug} className={`block bg-bleepx-white border border-bleepx-border border-l-4 ${levelColor[m.level]} rounded-xl shadow-sm cursor-not-allowed`}>
                  {content}
                </div>
              ) : (
                <Link
                  key={m.slug}
                  href={`/cloud/${p}/${m.slug}`}
                  className={`group block bg-bleepx-white border border-bleepx-border border-l-4 ${levelColor[m.level]} rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* Footer nav */}
      <div className="flex gap-4 pt-2">
        <Link href="/cloud" className="text-sm text-sky-600 hover:underline font-medium">← All Tracks</Link>
        <Link href="/cloud/trials" className="text-sm text-bleepx-text-secondary hover:underline font-medium inline-flex flex-wrap items-center gap-1"><BrainIcon size={14} /> Cloud Quizzes</Link>
        <Link href="/cloud/guide" className="text-sm text-bleepx-text-secondary hover:underline font-medium inline-flex flex-wrap items-center gap-1"><GuideIcon size={14} /> Guide</Link>
      </div>

      <AchievementNotification />
    </main>
  );
}
