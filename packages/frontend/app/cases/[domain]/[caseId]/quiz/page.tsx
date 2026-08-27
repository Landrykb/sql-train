import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import TrialQuiz from '@/components/TrialQuiz';
import { caseOrder, fullCaseOrder, domainFolderMap } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';

// Render quiz pages on the server at request time to avoid pre-building
// every trial quiz during static generation.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; caseId: string }>;
}): Promise<Metadata> {
  const { domain, caseId } = await params;
  return {
    title: `SQL Quiz: ${caseId} — BleepxQuery`,
    description: `Test your SQL knowledge for ${caseId} in ${domain}.`,
  };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ domain: string; caseId: string }>;
}) {
  const { domain, caseId } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const domainKey = normalizeDomain(decodedDomain);

  // Only allow quiz for trials
  if (domainKey !== 'trials') notFound();

  if (!domainFolderMap[domainKey]) notFound();

  const caseFile = path.join(process.cwd(), 'cases', domainFolderMap[domainKey], `${decodeURIComponent(caseId)}.yaml`);

  let caseName = '';
  let skills: string[] = [];

  try {
    const raw = await fs.readFile(caseFile, 'utf8');
    const doc = load(raw) as any;
    if (!doc?.id || !doc?.name) throw new Error('Invalid YAML');
    caseName = doc.name;
    skills = (doc.skills || []).filter((s: string) => !s.startsWith('name:'));
  } catch {
    notFound();
  }

  const allCaseIds = fullCaseOrder[domainKey] || caseOrder[domainKey] || [];

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-6 bg-bleepx-bg min-h-screen">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href={`/cases/${domainKey}`} className="hover:underline">Trials</Link>
        <span>/</span>
        <Link href={`/cases/${domainKey}/${caseId}`} className="hover:underline truncate max-w-[120px]">{caseName}</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Quiz</span>
      </nav>

      <div className="flex items-center gap-2">
        <BleepxLogo />
        <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text">SQL Knowledge Quiz</h1>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <BleepxPointsTracker caseIds={allCaseIds} />
      </Suspense>

      <Suspense fallback={<div className="text-center py-12 text-bleepx-text-secondary">Loading quiz...</div>}>
        <TrialQuiz caseId={caseId} caseName={caseName} skills={skills} domain={domainKey} />
      </Suspense>

      <AchievementNotification />
    </main>
  );
}
