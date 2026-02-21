import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import DomainDashboard from '@/components/DomainDashboard';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import { domainFolderMap } from '@/lib/constants';

export async function generateStaticParams() {
  return Object.keys(domainFolderMap)
    .filter((d) => d !== 'guide')
    .map((domain) => ({ domain }));
}

interface PlotData {
  caseId: string;
  title: string;
  plot: {
    data: any[];
    layout: any;
    config: { responsive: boolean; displayModeBar: boolean };
  };
  queryResults: {
    columns: string[];
    rows: any[][];
  };
  matplotlibImage?: string;
}

interface Dataset {
  name: string;
  file: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const normalizedDomain = domainFolderMap[domain.toLowerCase()] || domain.toLowerCase();
  const casesDir = path.join(process.cwd(), 'cases', normalizedDomain);

  const validCaseIds: string[] = [];
  const caseToFiles = new Map<string, string[]>();

  try {
    const allFiles = await fs.readdir(casesDir);
    for (const fn of allFiles) {
      if (!fn.endsWith('.yaml') || fn === 'guide.yaml' || fn === 'solutions.yaml') continue;
      const caseId = fn.replace(/\.yaml$/, '');
      const raw = await fs.readFile(path.join(casesDir, fn), 'utf-8');
      const parsed = yaml.parse(raw) as {
        datasets?: { name: string; file: string }[];
      };
      const filesForThisCase: string[] = [];
      let allExist = true;
      for (const d of parsed.datasets || []) {
        const rel = `/datasets/${path.basename(d.file)}`;
        const abs = path.join(process.cwd(), 'public', rel.slice(1));
        try {
          await fs.access(abs);
          filesForThisCase.push(rel);
        } catch {
          allExist = false;
          break;
        }
      }
      if (allExist && filesForThisCase.length > 0) {
        validCaseIds.push(caseId);
        caseToFiles.set(caseId, filesForThisCase);
      }
    }
  } catch (err) {
    console.error(`Error loading YAMLs from ${casesDir}:`, err);
  }

  const uniqueFiles = new Set<string>();
  for (const files of caseToFiles.values()) {
    for (const f of files) uniqueFiles.add(f);
  }
  const datasets: Dataset[] = Array.from(uniqueFiles).map((f) => ({
    file: f,
    name: path.basename(f, '.csv'),
  }));

  // Dashboard plots are loaded client-side by the DomainDashboard component
  const plots: PlotData[] = [];

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 bg-bleepx-bg">
      <div className="flex items-center gap-2 mb-6">
        <BleepxLogo />
        <h1 className="text-3xl font-bold text-bleepx-text">BleepxQuery: {normalizedDomain} Dashboard</h1>
      </div>
      <BleepxPointsTracker caseIds={validCaseIds} />
      <DomainDashboard domain={normalizedDomain} datasets={datasets} plots={plots} />
      <AchievementNotification />
    </main>
  );
}