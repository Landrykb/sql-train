import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import ProgressSummary from '@/components/ProgressSummary';
import ClientSQLPlayground from '@/components/ClientSQLPlayground';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import { caseOrder, fullCaseOrder, domainFolderMap } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';
import { visualizationConfigs } from '@/lib/visualizationConfigs';

export async function generateStaticParams() {
  const params: { domain: string; caseId: string }[] = [];
  for (const [domain, cases] of Object.entries(fullCaseOrder)) {
    if (domain === 'guide') continue;
    for (const caseId of cases) {
      params.push({ domain, caseId });
    }
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
    const doc = yaml.load(raw) as any;
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
    const allSolutions = yaml.load(solRaw) as Record<
      string,
      Record<string, { solutionQuery: string; expected: any[][] }>
    >;
    const solEntry = allSolutions[domainKey]?.[caseId];
    if (solEntry) {
      caseData.solutionQuery = solEntry.solutionQuery;
      caseData.expected = solEntry.expected;
    }
  } catch (err: any) {
    console.warn('Could not load/parse cases/solutions.yaml:', err.message);
  }

  const caseIds = caseOrder[domainKey] || [];
  const allCaseIds = fullCaseOrder[domainKey] || caseIds;
  const hasVisualizations = visualizationConfigs[domainKey]?.[caseId]?.length > 0;

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-6 bg-bleepx-bg">
      <div className="flex items-center gap-2">
        <BleepxLogo />
        <h1 className="text-3xl font-bold text-bleepx-text">{caseData.name}</h1>
      </div>
      <Suspense fallback={<div>Loading progress...</div>}>
        <ProgressSummary caseIds={caseIds} />
        <BleepxPointsTracker caseIds={allCaseIds} />
      </Suspense>
      <div className="text-right">
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
        <ClientSQLPlayground caseData={caseData} />
      </Suspense>
      <AchievementNotification />
    </main>
  );
}