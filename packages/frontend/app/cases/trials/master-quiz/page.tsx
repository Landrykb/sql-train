import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import MasterQuiz from '@/components/MasterQuiz';
import { BrainIcon } from '@/components/AppIcons';
import { caseOrder, fullCaseOrder, CASE_TIERS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Master SQL Quiz — BleepxQuery',
  description: 'Test your SQL knowledge across ALL trial skills in one mega quiz.',
};

interface TrialInfo {
  id: string;
  name: string;
  skills: string[];
  tier: number;
}

async function loadAllTrials(): Promise<TrialInfo[]> {
  const trialsDir = path.join(process.cwd(), 'cases', 'trials');
  const allCaseIds = fullCaseOrder['trials'] || caseOrder['trials'] || [];
  const trials: TrialInfo[] = [];

  for (const caseId of allCaseIds) {
    try {
      const raw = await fs.readFile(path.join(trialsDir, `${caseId}.yaml`), 'utf8');
      const doc = load(raw) as any;
      if (!doc?.id || !doc?.name) continue;
      const skills = (doc.skills || [])
        .filter((s: any) => typeof s === 'string' && !s.startsWith('name:'));
      trials.push({ id: doc.id, name: doc.name, skills, tier: CASE_TIERS[doc.id] || 2 });
    } catch {
      // skip missing files
    }
  }

  return trials;
}

export default async function MasterQuizPage() {
  const trials = await loadAllTrials();
  const allCaseIds = fullCaseOrder['trials'] || caseOrder['trials'] || [];

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-6 bg-bleepx-bg min-h-screen">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/cases/trials" className="hover:underline">Trials</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Master Quiz</span>
      </nav>

      <div className="flex items-center gap-2">
        <BleepxLogo />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text flex items-center gap-2"><BrainIcon size={26} /> Master SQL Quiz</h1>
          <p className="text-xs sm:text-sm text-bleepx-text-secondary">All skills, all trials — one mega quiz. No locks.</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <BleepxPointsTracker caseIds={allCaseIds} />
      </Suspense>

      <Suspense fallback={<div className="text-center py-12 text-bleepx-text-secondary">Loading master quiz...</div>}>
        <MasterQuiz trials={trials} />
      </Suspense>

      <AchievementNotification />
    </main>
  );
}
