'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, fullCaseOrder } from '@/lib/constants';
import { LAB_CASE_ORDER, LAB_DOMAIN_META } from '@/lib/labConstants';
import { CLOUD_MISSIONS, CLOUD_PROVIDER_META, cloudMissionId, type CloudProvider } from '@/lib/cloud';
import { BleepxFace } from '@/components/BleepxIcons';
import { VerseIcon } from '@/components/NavIcons';
import { SchoolIcon, EditIcon } from '@/components/AppIcons';
import { CrossVerseIcon } from '@/components/NavIcons';

const SQL_DOMAINS = Object.keys(caseOrder);
const SAA_STORAGE = 'bleepx-saa-checklist';
const JOURNEY_STORAGE = 'bleepx-journey';

interface NextStep {
  title: string;
  href: string;
  verse: string;
  pct: number;
}

export default function DashboardPage() {
  const { completed, points, achievements } = useProgress();
  const [saaDone, setSaaDone] = useState<string[]>([]);
  const [journey, setJourney] = useState<{ plan?: { suggested?: string[]; totalTime?: string } } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAA_STORAGE);
      if (raw) setSaaDone(Object.keys(JSON.parse(raw)).filter((k) => JSON.parse(raw)[k]));
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(JOURNEY_STORAGE);
      if (raw) setJourney(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const { sqlStats, labStats, cloudStats, saaStats } = useMemo(() => {
    // SQL
    let sqlTotal = 0;
    let sqlDone = 0;
    let nextSQL: NextStep | null = null;
    SQL_DOMAINS.forEach((d) => {
      const cases = fullCaseOrder[d] || [];
      sqlTotal += cases.length;
      cases.forEach((c) => { if (completed.has(c)) sqlDone++; });
      if (!nextSQL) {
        const firstUnsolved = (fullCaseOrder[d] || []).find((c) => !completed.has(c));
        if (firstUnsolved) nextSQL = { title: `${domainLabel(d)} — ${firstUnsolved}`, href: `/cases/${d}/${firstUnsolved}`, verse: 'BleepxQuery', pct: 0 };
      }
    });

    // Lab
    const labDomains = Object.keys(LAB_CASE_ORDER);
    let labTotal = 0;
    let labDone = 0;
    let nextLab: NextStep | null = null;
    labDomains.forEach((d) => {
      const cases = LAB_CASE_ORDER[d];
      labTotal += cases.length;
      cases.forEach((c) => { if (completed.has(c) || completed.has(`lab_${c}`)) labDone++; });
      if (!nextLab) {
        const firstUnsolved = cases.find((c) => !completed.has(c) && !completed.has(`lab_${c}`));
        if (firstUnsolved) nextLab = { title: `${LAB_DOMAIN_META[d]?.name || d} — ${firstUnsolved}`, href: `/lab/${d}/${firstUnsolved}`, verse: 'BleepxLab', pct: 0 };
      }
    });

    // Cloud
    let cloudTotal = 0;
    let cloudDone = 0;
    let nextCloud: NextStep | null = null;
    (Object.keys(CLOUD_MISSIONS) as CloudProvider[]).forEach((p) => {
      const missions = CLOUD_MISSIONS[p] || [];
      cloudTotal += missions.length;
      missions.forEach((m) => {
        if (completed.has(cloudMissionId(p, m.slug))) cloudDone++;
        else if (!nextCloud) nextCloud = { title: `${CLOUD_PROVIDER_META[p].short} — ${m.title}`, href: `/cloud/${p}/${m.slug}`, verse: 'BleepxCloud', pct: 0 };
      });
    });

    // SAA
    const saaTotal = 16; // 4 steps per 4 domains
    const saaDoneCount = saaDone.length;

    return {
      sqlStats: { total: sqlTotal, done: sqlDone, pct: sqlTotal ? Math.round((sqlDone / sqlTotal) * 100) : 0, next: nextSQL },
      labStats: { total: labTotal, done: labDone, pct: labTotal ? Math.round((labDone / labTotal) * 100) : 0, next: nextLab },
      cloudStats: { total: cloudTotal, done: cloudDone, pct: cloudTotal ? Math.round((cloudDone / cloudTotal) * 100) : 0, next: nextCloud },
      saaStats: { total: saaTotal, done: saaDoneCount, pct: saaTotal ? Math.round((saaDoneCount / saaTotal) * 100) : 0, next: { title: 'SAA Certification master plan', href: '/cloud/certifications', verse: 'Certification', pct: 0 } },
    };
  }, [completed, saaDone]);

  const recommended = useMemo(() => {
    if (!journey?.plan?.suggested) {
      if (sqlStats.pct < 25) return sqlStats.next || { title: 'Start with SQL basics', href: '/cases/business/basics_select', verse: 'BleepxQuery', pct: 0 };
      if (labStats.pct < 25) return labStats.next || { title: 'Try a BleepxLab project', href: '/lab/churn/churn_explore', verse: 'BleepxLab', pct: 0 };
      if (cloudStats.pct < 25) return cloudStats.next || { title: 'Open the Cloud Sandbox', href: '/cloud/sandbox', verse: 'BleepxCloud', pct: 0 };
      return sqlStats.next || labStats.next || cloudStats.next || { title: 'Pick your next goal', href: '/journey', verse: 'Journey', pct: 0 };
    }
    const goal = journey.plan.suggested[0];
    if (goal === 'sql') return sqlStats.next || { title: 'SQL practice', href: '/cases', verse: 'BleepxQuery', pct: 0 };
    if (goal === 'python' || goal === 'datascience' || goal === 'machine-learning' || goal === 'carbon') return labStats.next || { title: 'BleepxLab', href: '/lab', verse: 'BleepxLab', pct: 0 };
    if (goal === 'cloud' || goal === 'saa') return cloudStats.next || { title: 'Cloud Sandbox', href: '/cloud/sandbox', verse: 'BleepxCloud', pct: 0 };
    if (goal === 'llm') return { title: 'LLM & AI track — start at Hugging Face datasets', href: '/journey', verse: 'AI/LLM', pct: 0 };
    return sqlStats.next || { title: 'Start your journey', href: '/journey', verse: 'Journey', pct: 0 };
  }, [sqlStats, labStats, cloudStats, journey]);

  const verseCard = (label: string, icon: React.ReactNode, done: number, total: number, pct: number, color: string, next?: NextStep | null) => (
    <div className="bg-bleepx-white rounded-xl p-5 border border-bleepx-border shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-bleepx-text">{icon}</span>
          <h2 className="font-bold text-bleepx-text">{label}</h2>
        </div>
        <span className="text-2xl font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${label === 'SAA' ? 'bg-violet-500' : label === 'BleepxCloud' ? 'bg-sky-500' : label === 'BleepxLab' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-bleepx-text-secondary">{done}/{total} completed</p>
      {next && (
        <Link href={next.href} className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-900/10 transition-colors text-sm">
          <span className="text-xs font-bold text-sky-600 uppercase">Next step</span>
          <div className="font-semibold text-bleepx-text break-words">{next.title}</div>
        </Link>
      )}
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-20">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Dashboard</span>
      </nav>

      <div className="bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 rounded-2xl p-6 sm:p-10 text-white">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 flex flex-wrap items-center gap-3 break-words">
          <CrossVerseIcon size={32} className="text-white flex-shrink-0" /> Cross-Verse Dashboard
        </h1>
        <p className="text-white/80 text-sm sm:text-lg max-w-2xl">All your progress in one place — SQL, Python, Data Science, Cloud, and SAA.</p>
      </div>

      {/* Recommended next step */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-4">
        <div className="shrink-0 pt-0.5"><BleepxFace size={32} /></div>
        <div className="flex-1">
          <h2 className="font-bold text-bleepx-text mb-1">Bleepx recommends</h2>
          <p className="text-sm text-bleepx-text-secondary mb-3">
            Based on your {journey?.plan?.suggested ? 'journey goals' : 'current progress'}, the best next step is:
          </p>
          <Link href={recommended.href} className="inline-flex flex-wrap items-center gap-2 px-5 py-2.5 rounded-full bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 transition-colors min-w-0">
            <span className="break-words min-w-0">{recommended.verse} → {recommended.title}</span>
          </Link>
        </div>
      </div>

      {/* Verse cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {verseCard('BleepxQuery', <VerseIcon verse="query" size={22} className="text-bleepx-blue" />, sqlStats.done, sqlStats.total, sqlStats.pct, '#f43f5e', sqlStats.next)}
        {verseCard('BleepxLab', <VerseIcon verse="lab" size={22} className="text-emerald-500" />, labStats.done, labStats.total, labStats.pct, '#10b981', labStats.next)}
        {verseCard('BleepxCloud', <VerseIcon verse="cloud" size={22} className="text-sky-500" />, cloudStats.done, cloudStats.total, cloudStats.pct, '#0ea5e9', cloudStats.next)}
        {verseCard('SAA', <SchoolIcon size={22} className="text-violet-500" />, saaStats.done, saaStats.total, saaStats.pct, '#8b5cf6', saaStats.next)}
      </div>

      {/* Achievements + points */}
      <div className="bg-bleepx-white rounded-xl p-5 border border-bleepx-border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-bleepx-text">Stats</h2>
            <p className="text-sm text-bleepx-text-secondary">{points} points · {achievements.length} achievements</p>
          </div>
          <Link href="/profile" className="text-sm text-sky-600 hover:underline font-medium">Open full profile →</Link>
        </div>
      </div>

      {/* Journey card */}
      <div className="text-center">
        <Link href="/journey" className="inline-flex items-center gap-2 text-sm text-sky-600 hover:underline font-medium">
          <EditIcon size={16} /> Edit your journey goals
        </Link>
      </div>
    </main>
  );
}

function domainLabel(domain: string) {
  const labels: Record<string, string> = {
    business: 'Business',
    crime: 'Crime',
    farming: 'Farming',
    finance: 'Finance',
    healthcare: 'Healthcare',
    social: 'Social',
    space: 'Space',
    sports: 'Sports',
  };
  return labels[domain] || domain;
}
