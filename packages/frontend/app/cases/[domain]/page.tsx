import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Link from 'next/link';
import ClientCaseGrid from '@/components/ClientCaseGrid';
import ProgressSummary from '@/components/ProgressSummary';
import CaseProgress from '@/components/CaseProgress';
import ResetProgressButton from '@/components/ResetProgressButton';
import DashboardButton from '@/components/DashboardButton';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import { domainFolderMap, caseOrder, fullCaseOrder, hiddenCaseOrder } from '@/lib/constants';
import { normalizeDomain } from '@/lib/utils';

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
        <h1 className="text-3xl font-bold text-bleepx-text capitalize">
          {decodedDomain} Challenges
        </h1>
        <div className="p-6 bg-red-50 text-red-800 rounded-lg shadow mt-6">
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
          const caseData = yaml.load(content) as CaseData;
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
        <h1 className="text-3xl font-bold text-bleepx-text capitalize">
          {decodedDomain} Challenges
        </h1>
        <div className="p-6 bg-red-50 text-red-800 rounded-lg shadow mt-6">
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
    <div className="max-w-4xl mx-auto p-8 bg-bleepx-bg space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BleepxLogo />
          <h1 className="text-3xl font-bold text-bleepx-text capitalize">
            BleepxQuery: {domainKey.charAt(0).toUpperCase() + domainKey.slice(1).replace('_', ' ')} Challenges
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <DashboardButton domainKey={domainKey} />
          <Link href="/" className="px-4 py-2 text-bleepx-blue hover:text-bleepx-blue-hover">
            Home
          </Link>
          <ResetProgressButton />
        </div>
      </div>
      <div
        className="p-4 bg-bleepx-white text-bleepx-text-secondary rounded-lg shadow-sm border-l-4 border-bleepx-blue animate-fade-in"
        role="alert"
      >
        Nice work, human! Bleepx says pick another SwiftLink Challenge!
      </div>
      <ProgressSummary caseIds={caseOrder[domainKey] || []} />
      <BleepxPointsTracker caseIds={currentOrder} />
      <CaseProgress caseIds={currentOrder} domain={domainKey} cases={orderedCases} />
      <ClientCaseGrid cases={orderedCases} domain={domainKey} nextCaseId={orderedCases[0]?.id} />
      <AchievementNotification />
    </div>
  );
}