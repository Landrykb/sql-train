import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { notFound } from 'next/navigation';
import Visualizations from '@/components/Visualizations';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';

interface CaseYaml {
  id: string;
  name: string;
  description: string;
  instructions: string;
  hints: string[];
  skills: string[];
  datasets: { name: string; file: string }[];
  seedQuery: string;
  solutionQuery: string;
  domain: string;
  prerequisites: string[];
  tier: number;
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

export default async function VisualizationsPage({
  params: paramsPromise,
}: {
  params: Promise<{ domain: string; caseId: string }>;
}) {
  const params = await paramsPromise;
  const { domain, caseId } = params;

  const domainFolderMap: Record<string, string> = {
    business: 'business',
    healthcare: 'healthcare',
    crime: 'crime',
    farming: 'farming',
    finance: 'finance',
    sports: 'sports',
    social: 'social',
    space: 'space',
  };

  const normalizedDomain = domainFolderMap[domain.toLowerCase()] || domain.toLowerCase();
  const casesDir = path.join(process.cwd(), 'cases', normalizedDomain);

  let caseData: CaseYaml | null = null;
  let datasets: { name: string; file: string }[] = [];
  let plots: PlotData[] = [];

  try {
    const caseFilePath = path.join(casesDir, `${caseId}.yaml`);
    await fs.access(caseFilePath);
    const caseContent = await fs.readFile(caseFilePath, 'utf-8');
    caseData = yaml.parse(caseContent) as CaseYaml;
    datasets = caseData.datasets.map((d) => ({
      name: d.name,
      file: d.file,
    }));
  } catch (err) {
    console.error(`Failed to load case ${caseId} for domain ${normalizedDomain}: ${err}`);
    notFound();
  }

  try {
    const res = await fetch(`/api/visualizations/${normalizedDomain}/${caseId}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      plots = (json.visualizations || []).map((v: any) => ({
        caseId: v.case_id,
        title: v.title,
        plot: v.plot,
        queryResults: v.query_results,
        matplotlibImage: v.matplotlib_image,
      }));
    }
  } catch (err) {
    console.error(`Failed to fetch visualizations: ${err}`);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 bg-bleepx-bg">
      <div className="flex items-center gap-2 mb-6">
        <BleepxLogo />
        <h1 className="text-3xl font-bold text-bleepx-text">BleepxQuery: {caseId} Visualizations</h1>
      </div>
      <BleepxPointsTracker caseIds={[caseId]} />
      <Visualizations domain={normalizedDomain} caseId={caseId} datasets={datasets} plots={plots} />
      <AchievementNotification />
    </main>
  );
}