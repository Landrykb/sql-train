import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import GuideContent from './GuideContent';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import BleepxLogo from '@/components/BleepxLogo';
import { caseOrder } from '@/lib/constants';

export const dynamic = 'force-static';

interface QueryVariant {
  name: string;
  description: string;
  example_generic: string;
  example: string;
}

interface QueryType {
  name: string;
  description: string;
  variants: QueryVariant[];
}

interface GuideYaml {
  id: string;
  title: string;
  description: string;
  query_types: QueryType[];
}

export default async function GuidePage() {
  let guideData: GuideYaml;
  try {
    const guidePath = path.join(process.cwd(), 'cases', 'guide', 'guide.yaml');
    const raw = await fs.readFile(guidePath, 'utf8');
    guideData = parse(raw);
    if (!guideData.id || !guideData.title || !guideData.description || !Array.isArray(guideData.query_types)) {
      throw new Error('Missing required fields in guide.yaml');
    }
  } catch (err) {
    console.error('Error loading guide.yaml:', err);
    notFound();
  }

  const backLink = '/cases';
  const backText = '← Back to Challenges';
  const allCaseIds = Object.values(caseOrder).flat();

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-8 bg-bleepx-bg min-h-screen pb-20">
      <nav className="text-sm text-bleepx-text-secondary" aria-label="Breadcrumb">
        <ol className="flex space-x-2">
          <li>
            <Link href="/" className="text-bleepx-blue hover:text-bleepx-blue-hover">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/cases" className="text-bleepx-blue hover:text-bleepx-blue-hover">
              Challenges
            </Link>
          </li>
          <li>/</li>
          <li className="font-semibold capitalize text-bleepx-text">{guideData.title}</li>
        </ol>
      </nav>
      <div className="bg-bleepx-white border-l-4 border-bleepx-blue p-6 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <BleepxLogo />
          <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text break-words">BleepxQuery Guide: {guideData.title}</h1>
        </div>
        <p className="text-bleepx-text-secondary mb-4">{guideData.description}</p>
        <Link href={backLink} className="text-bleepx-blue hover:text-bleepx-blue-hover">
          {backText}
        </Link>
      </div>
      <BleepxPointsTracker caseIds={allCaseIds} />
      <GuideContent guideData={guideData} />
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-bleepx-text">All SwiftLink Challenges by Domain</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(caseOrder).map(([domainKey, caseList]) => (
            <details key={domainKey} className="border border-bleepx-border rounded-lg shadow-sm overflow-hidden">
              <summary className="cursor-pointer bg-bleepx-white px-3 py-2 font-medium hover:bg-bleepx-blue hover:text-bleepx-white capitalize text-bleepx-text transition-colors duration-300">
                {domainKey.replace('_', ' ')}
              </summary>
              <ul className="list-disc pl-5 pr-3 py-2 space-y-1 text-sm text-bleepx-text-secondary">
                {caseList.map((caseId) => (
                  <li key={caseId}>
                    <Link href={`/cases/${domainKey}/${caseId}`} className="text-bleepx-blue hover:text-bleepx-blue-hover">
                      {caseId}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>
      <AchievementNotification />
    </main>
  );
}