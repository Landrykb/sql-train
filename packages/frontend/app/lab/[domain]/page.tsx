import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import AchievementNotification from '@/components/AchievementNotification';
import { CaseInterpretationButton } from '@/components/CaseInterpretationButton';
import { LAB_DOMAIN_META, LAB_DOMAIN_FOLDER_MAP, LAB_CASE_ORDER } from '@/lib/labConstants';

export function generateStaticParams() {
  return Object.keys(LAB_DOMAIN_FOLDER_MAP).map((domain) => ({ domain }));
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params;
  const meta = LAB_DOMAIN_META[domain];
  return { title: meta ? `${meta.name} — BleepxLab` : 'BleepxLab' };
}

interface StepInfo {
  id: string;
  name: string;
  description: string;
  step_number: number;
  tier: number;
  skills: string[];
  language: string;
}

async function loadSteps(domain: string): Promise<StepInfo[]> {
  const folder = LAB_DOMAIN_FOLDER_MAP[domain];
  if (!folder) return [];
  const dir = path.join(process.cwd(), 'lab-projects', folder);
  const caseIds = LAB_CASE_ORDER[domain] || [];
  const steps: StepInfo[] = [];

  for (const caseId of caseIds) {
    try {
      const raw = await fs.readFile(path.join(dir, `${caseId}.yaml`), 'utf8');
      const doc = yaml.load(raw) as any;
      steps.push({
        id: doc.id,
        name: doc.name || caseId,
        description: doc.description || '',
        step_number: doc.step_number || steps.length + 1,
        tier: doc.tier || 1,
        skills: doc.skills || [],
        language: doc.language || 'python',
      });
    } catch { /* skip */ }
  }
  return steps;
}

export default async function LabDomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const meta = LAB_DOMAIN_META[domain];
  if (!meta) notFound();

  const steps = await loadSteps(domain);

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-6 bg-bleepx-bg min-h-screen">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/lab" className="hover:underline">BleepxLab</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">{meta.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-3xl sm:text-4xl">{meta.icon}</span>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text">{meta.name}</h1>
          <p className="text-sm text-bleepx-text-secondary mt-1">{meta.desc}</p>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-bleepx-text-secondary">{meta.difficulty}</span>
            <span className="text-amber-400 text-xs">{'⭐'.repeat(meta.stars)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium">{meta.language}</span>
            {meta.dataset_url && (
              <a href={meta.dataset_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline">
                📊 Dataset →
              </a>
            )}
          </div>
        </div>
        <CaseInterpretationButton 
          verse="lab" 
          itemId={`lab-${domain}`} 
          itemName={`${meta.name} Portfolio Analysis`} 
          domain={domain} 
        />
      </div>

      {/* Steps list */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-bleepx-text">Project Steps</h2>
        {steps.map((step, i) => {
          const tierColors: Record<number, string> = {
            1: 'border-l-emerald-500',
            2: 'border-l-amber-500',
            3: 'border-l-red-500',
          };
          const tierLabels: Record<number, string> = {
            1: 'Beginner',
            2: 'Intermediate',
            3: 'Advanced',
          };
          return (
            <Link
              key={step.id}
              href={`/lab/${domain}/${step.id}`}
              className={`group block bg-bleepx-white border border-bleepx-border border-l-4 ${tierColors[step.tier] || 'border-l-gray-400'} rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-sm font-bold text-teal-700 dark:text-teal-300">
                  {step.step_number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-bleepx-text group-hover:text-teal-600 transition-colors">
                    {step.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-bleepx-text-secondary mt-0.5 line-clamp-2">{step.description}</p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary">
                      {tierLabels[step.tier] || 'Beginner'}
                    </span>
                    {step.skills.slice(0, 4).map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
                        {s}
                      </span>
                    ))}
                    {step.skills.length > 4 && (
                      <span className="text-[10px] text-bleepx-text-secondary">+{step.skills.length - 4}</span>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Back */}
      <div className="flex gap-3">
        <Link href="/lab" className="text-sm text-teal-600 hover:underline font-medium">← All Projects</Link>
        <Link href="/" className="text-sm text-bleepx-blue hover:underline font-medium">🔷 BleepxQuery</Link>
      </div>

      <AchievementNotification />
    </main>
  );
}
