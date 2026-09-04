import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Visualizations from '@/components/Visualizations';
import AchievementNotification from '@/components/AchievementNotification';
import { domainFolderMap } from '@/lib/constants';

// This route is rendered on the server at request time. It reads case YAML
// to show charts, so pre-rendering all 350 pages at build would be excessive.
export const dynamic = 'force-dynamic';

interface CaseYaml {
  id: string;
  name: string;
  datasets: { name: string; file: string }[];
}

export default async function VisualizationsPage({
  params: paramsPromise,
}: {
  params: Promise<{ domain: string; caseId: string }>;
}) {
  const params = await paramsPromise;
  const { domain, caseId } = params;

  const normalizedDomain = domainFolderMap[domain.toLowerCase()] || domain.toLowerCase();
  const casesDir = path.join(process.cwd(), 'cases', normalizedDomain);

  let caseName = caseId;
  let datasets: { name: string; file: string }[] = [];

  try {
    const caseFilePath = path.join(casesDir, `${caseId}.yaml`);
    const caseContent = await fs.readFile(caseFilePath, 'utf-8');
    const caseData = load(caseContent) as CaseYaml;
    caseName = caseData.name || caseId;
    datasets = caseData.datasets.map((d) => ({ name: d.name, file: d.file }));
  } catch (err) {
    console.error(`Failed to load case ${caseId} for domain ${normalizedDomain}: ${err}`);
    notFound();
  }

  return (
    <main className="max-w-5xl mx-auto space-y-4 sm:space-y-6 bg-bleepx-bg min-h-screen pb-20">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary overflow-x-auto max-w-full" aria-label="Breadcrumb">
        <ol className="flex flex-wrap space-x-1.5 sm:space-x-2 items-center">
          <li><Link href="/" className="hover:text-bleepx-blue">Home</Link></li>
          <li>/</li>
          <li><Link href={`/cases/${domain}`} className="hover:text-bleepx-blue capitalize">{domain}</Link></li>
          <li>/</li>
          <li><Link href={`/cases/${domain}/${caseId}`} className="hover:text-bleepx-blue">{caseName}</Link></li>
          <li>/</li>
          <li className="font-semibold text-bleepx-text">Visualizations</li>
        </ol>
      </nav>

      <header className="bg-gradient-to-r from-bleepx-blue/10 to-bleepx-pink/10 p-4 sm:p-6 rounded-xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text break-words">{caseName} — Visualizations</h1>
        <p className="text-xs sm:text-sm text-bleepx-text-secondary mt-1">*bleep* Charts generated from your SQL query results. View code, learn, and export.</p>
      </header>

      <Visualizations domain={normalizedDomain} caseId={caseId} datasets={datasets} />
      <AchievementNotification />
    </main>
  );
}