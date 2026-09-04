import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import ProgressSummary from '@/components/ProgressSummary';
import ClientSQLPlayground from '@/components/ClientSQLPlayground';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import CrossVerseNav from '@/components/CrossVerseNav';
import { caseOrder, fullCaseOrder, domainFolderMap, visualizationConfigs } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';
import { BrainIcon } from '@/components/AppIcons';

// Render only one case per domain at build time to keep SSG fast.
// The rest are generated on demand when first visited (ISR-style).
export const dynamicParams = true;

export async function generateStaticParams() {
  const params: { domain: string; caseId: string }[] = [];
  for (const [domain, cases] of Object.entries(fullCaseOrder)) {
    if (domain === 'guide' || !cases.length) continue;
    params.push({ domain, caseId: cases[0] });
  }
  return params;
}

interface CaseData {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  hints?: string[];
  thoughtProcess?: string[];
  skills: string[];
  datasets: { name: string; file: string }[];
  seedQuery?: string;
  templateQuery?: string;
  expected?: any[][];
  solutionQuery?: string;
  domain: string;
  prerequisites?: string[];
  tier: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; caseId: string }>;
}): Promise<Metadata> {
  const { domain, caseId } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const normalizedDomain = normalizeDomain(decodedDomain);
  return {
    title: `BleepxQuery: ${caseId} in ${normalizedDomain}`,
    description: `Conquer ${caseId} in ${normalizedDomain} with Bleepx’s SwiftLink Challenges.`,
  };
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ domain: string; caseId: string }>;
}) {
  const { domain, caseId } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const domainKey = normalizeDomain(decodedDomain);

  if (!caseOrder[domainKey] || !domainFolderMap[domainKey]) {
    console.error(`Domain not found: ${decodedDomain}`, {
      normalizedDomain: domainKey,
      availableDomains: Object.keys(caseOrder),
      availableFolders: Object.keys(domainFolderMap),
    });
    notFound();
  }

  const caseFile = path.join(process.cwd(), 'cases', domainFolderMap[domainKey], `${decodeURIComponent(caseId)}.yaml`);
  let caseData: CaseData;
  try {
    const raw = await fs.readFile(caseFile, 'utf8');
    const doc = load(raw) as any;
    if (!doc?.id || !doc?.name || !doc?.datasets) {
      throw new Error(`Missing required fields in ${caseId}.yaml`);
    }
    caseData = {
      id: doc.id,
      name: doc.name,
      description: doc.description || '',
      instructions: doc.instructions,
      hints: doc.hints || [],
      thoughtProcess: doc.thoughtProcess || [],
      skills: doc.skills || [],
      datasets: doc.datasets,
      seedQuery: doc.seedQuery,
      templateQuery: doc.templateQuery,
      expected: doc.expected,
      solutionQuery: doc.solutionQuery,
      domain: doc.domain ?? domainKey,
      prerequisites: doc.prerequisites || doc.prereq_cases || [],
      tier: typeof doc.tier === 'number' ? doc.tier : 0,
    };
  } catch (err: any) {
    console.error(`Failed loading case YAML: ${caseFile}`, {
      message: err.message,
      stack: err.stack,
      fileExists: await fs.access(caseFile).then(() => true).catch(() => false),
    });
    notFound();
  }

  try {
    const solRaw = await fs.readFile(path.join(process.cwd(), 'cases', 'solutions.yaml'), 'utf8');
    const allSolutions = load(solRaw) as Record<
      string,
      Record<string, { solutionQuery: string; expected: any[][] }>
    >;
    // solutions.yaml uses dataset-based keys (e.g. 'business_retail') not domain keys ('business')
    const solutionKeyMap: Record<string, string> = {
      business: 'business_retail', crime: 'crime_chicago', farming: 'farming_ndvi',
      finance: 'finance_stocks', healthcare: 'healthcare_covid', social: 'social_twitter',
      space: 'space_neo', sports: 'sports_nba',
    };
    const solEntry = allSolutions[solutionKeyMap[domainKey] || domainKey]?.[caseId]
      || allSolutions[domainKey]?.[caseId];
    if (solEntry) {
      caseData.solutionQuery = solEntry.solutionQuery;
      caseData.expected = solEntry.expected;
    }
  } catch (err: any) {
    console.warn('Could not load/parse cases/solutions.yaml:', err.message);
  }

  // Load guide data for the in-page GuideBook modal
  let guideData: any = null;
  try {
    const guidePath = path.join(process.cwd(), 'cases', 'guide', 'guide.yaml');
    const guideRaw = await fs.readFile(guidePath, 'utf8');
    const guideParsed = load(guideRaw) as any;
    if (guideParsed?.query_types) {
      guideData = { id: guideParsed.id, title: guideParsed.title, description: guideParsed.description, query_types: guideParsed.query_types };
    }
  } catch { /* guide modal will just not be available */ }

  const caseIds = caseOrder[domainKey] || [];
  const allCaseIds = fullCaseOrder[domainKey] || caseIds;
  const hasVisualizations = visualizationConfigs[domainKey]?.[caseId]?.length > 0;

  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-20 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <BleepxLogo />
        <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text break-words">{caseData.name}</h1>
      </div>
      <Suspense fallback={<div>Loading progress...</div>}>
        <ProgressSummary caseIds={caseIds} />
        <BleepxPointsTracker caseIds={allCaseIds} />
      </Suspense>
      <div className="flex flex-wrap items-center justify-end gap-4">
        <Link
          href={`/cases/${domainKey}/${caseId}/quiz`}
          className="inline-flex flex-wrap items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          <BrainIcon size={16} /> Test Your Knowledge
        </Link>
        {hasVisualizations && (
          <Link
            href={`/cases/${domainKey}/${caseId}/visualizations`}
            className="text-bleepx-blue hover:text-bleepx-blue-hover"
          >
            View Visualizations
          </Link>
        )}
      </div>
      <Suspense fallback={<div>Loading challenge...</div>}>
        <ClientSQLPlayground caseData={caseData} guideData={guideData} />
      </Suspense>
      <CrossVerseNav path={`/cases/${domainKey}/${caseId}`} currentVerse="query" />
      <AchievementNotification />
    </main>
  );
}