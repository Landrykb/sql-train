import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import Link from 'next/link';
import ClientCaseGrid from '@/components/ClientCaseGrid';
import ProgressSummary from '@/components/ProgressSummary';
import CaseProgress from '@/components/CaseProgress';
// ResetProgressButton removed — users should not accidentally lose progress
import DashboardButton from '@/components/DashboardButton';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import PathMap from '@/components/PathMap';
import { CaseInterpretationButton } from '@/components/CaseInterpretationButton';
import { domainFolderMap, caseOrder, fullCaseOrder, hiddenCaseOrder } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';
import { BrainIcon } from '@/components/AppIcons';

export async function generateStaticParams() {
  return Object.keys(domainFolderMap)
    .filter((d) => d !== 'guide')
    .map((domain) => ({ domain }));
}

interface CaseData {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  skills: string[];
  datasets: { name: string; file: string }[];
  seedQuery?: string;
  templateQuery?: string;
  expected?: any[][];
  solutionQuery?: string;
  prereq_cases?: string[];
  tier: number;
  hidden?: boolean;
}

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const rawDomain = domain;

  if (!rawDomain || typeof rawDomain !== 'string') {
    return <div>Loading...</div>;
  }

  const decodedDomain = decodeURIComponent(rawDomain);
  const domainKey = normalizeDomain(decodedDomain);

  if (!caseOrder[domainKey] || !domainFolderMap[domainKey]) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-bleepx-bg">
        <nav className="mb-6">
          <Link href="/" className="text-bleepx-blue hover:text-bleepx-blue-hover">
            Home
          </Link>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text capitalize break-words">
          {decodedDomain} Challenges
        </h1>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg shadow mt-6 break-words">
          Invalid domain: {decodedDomain}. Bleepx says pick a valid challenge!
          <div className="mt-2">
            <Link href="/cases">
              <button className="px-4 py-2 rounded bg-bleepx-blue text-bleepx-white hover:bg-bleepx-blue-hover">
                Back to Challenges
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const casesDir = path.join(
    process.cwd(),
    'cases',
    domainFolderMap[domainKey]
  );
  const cases: CaseData[] = [];

  try {
    const caseFiles = await fs.readdir(casesDir);
    for (const file of caseFiles) {
      if (file.endsWith('.yaml')) {
        try {
          const filePath = path.join(casesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const caseData = load(content) as CaseData;
          if (caseData?.id) {
            caseData.id = caseData.id.trim();
            if (caseOrder[domainKey].includes(caseData.id)) {
              cases.push(caseData);
            } else {
              cases.push(caseData);
            }
          }
        } catch (err) {
          console.error(`Error reading ${file}:`, err);
        }
      }
    }
  } catch (err: any) {
    console.error(`Failed to load cases for domain: ${domainKey}`, err.message);
  }

  const currentOrder = fullCaseOrder[domainKey] && fullCaseOrder[domainKey].length > 0
    ? fullCaseOrder[domainKey]
    : cases.map((c) => c.id);

  const hiddenIds = new Set(hiddenCaseOrder[domainKey] || []);
  const orderedCases = currentOrder
    .map((id) => {
      const c = cases.find((c) => c.id === id);
      if (c && hiddenIds.has(c.id)) {
        return { ...c, hidden: true };
      }
      return c;
    })
    .filter((c): c is CaseData => !!c);

  if (orderedCases.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-bleepx-bg">
        <nav className="mb-6">
          <Link href="/" className="text-bleepx-blue hover:text-bleepx-blue-hover">
            Home
          </Link>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text capitalize break-words">
          {decodedDomain} Challenges
        </h1>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg shadow mt-6 break-words">
          No cases found for domain: {decodedDomain}. Bleepx is disappointed, human!
          <div className="mt-2">
            <Link href="/cases">
              <button className="px-4 py-2 rounded bg-bleepx-blue text-bleepx-white hover:bg-bleepx-blue-hover">
                Back to Challenges
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-bleepx-bg space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <BleepxLogo />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text capitalize break-words">
              {domainKey.charAt(0).toUpperCase() + domainKey.slice(1).replace('_', ' ')} Division
            </h1>
            <p className="text-[10px] sm:text-xs text-bleepx-text-secondary">SwiftLink Training Program</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {domainKey !== 'trials' && <DashboardButton domainKey={domainKey} />}
          {domainKey !== 'trials' && (
            <CaseInterpretationButton 
              verse="query" 
              itemId={`query-${domainKey}`} 
              itemName={`${domainKey.charAt(0).toUpperCase() + domainKey.slice(1).replace('_', ' ')} Portfolio Analysis`} 
              domain={domainKey} 
            />
          )}
          {domainKey === 'trials' && (
            <Link href="/cases/trials/master-quiz" className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
              <BrainIcon size={16} className="text-white" /> Master Quiz
            </Link>
          )}
          <Link href="/" className="px-3 py-1.5 text-sm text-bleepx-blue hover:text-bleepx-blue-hover rounded-lg hover:bg-bleepx-blue/5 transition-colors">
            Home
          </Link>
        </div>
      </div>
      <ProgressSummary caseIds={caseOrder[domainKey] || []} />
      <BleepxPointsTracker caseIds={currentOrder} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <PathMap domain={domainKey} cases={orderedCases} />
        <CaseProgress caseIds={currentOrder} domain={domainKey} cases={orderedCases} />
      </div>
      <ClientCaseGrid cases={orderedCases} domain={domainKey} nextCaseId={orderedCases[0]?.id} />
      <AchievementNotification />
    </div>
  );
}