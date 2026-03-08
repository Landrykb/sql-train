import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import LabProjectViewer from '@/components/LabProjectViewer';
import { LAB_DOMAIN_META, LAB_DOMAIN_FOLDER_MAP, LAB_CASE_ORDER } from '@/lib/labConstants';

export function generateStaticParams() {
  const params: { domain: string; projectId: string }[] = [];
  for (const [domain, cases] of Object.entries(LAB_CASE_ORDER)) {
    for (const caseId of cases) {
      params.push({ domain, projectId: caseId });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string; projectId: string }> }): Promise<Metadata> {
  const { domain, projectId } = await params;
  const meta = LAB_DOMAIN_META[domain];
  return { title: meta ? `${projectId} — ${meta.name} — BleepxLab` : 'BleepxLab' };
}

async function loadProject(domain: string, projectId: string) {
  const folder = LAB_DOMAIN_FOLDER_MAP[domain];
  if (!folder) return null;
  try {
    const filePath = path.join(process.cwd(), 'lab-projects', folder, `${projectId}.yaml`);
    const raw = await fs.readFile(filePath, 'utf8');
    return yaml.load(raw) as any;
  } catch {
    return null;
  }
}

export default async function LabProjectPage({ params }: { params: Promise<{ domain: string; projectId: string }> }) {
  const { domain, projectId } = await params;
  const meta = LAB_DOMAIN_META[domain];
  if (!meta) notFound();

  const doc = await loadProject(domain, projectId);
  if (!doc) notFound();

  // Determine prev/next steps
  const caseOrder = LAB_CASE_ORDER[domain] || [];
  const currentIdx = caseOrder.indexOf(projectId);

  let prevStep: { id: string; name: string } | null = null;
  let nextStep: { id: string; name: string } | null = null;

  if (currentIdx > 0) {
    const prevId = caseOrder[currentIdx - 1];
    const prevDoc = await loadProject(domain, prevId);
    prevStep = { id: prevId, name: prevDoc?.name || prevId };
  }
  if (currentIdx >= 0 && currentIdx < caseOrder.length - 1) {
    const nextId = caseOrder[currentIdx + 1];
    const nextDoc = await loadProject(domain, nextId);
    nextStep = { id: nextId, name: nextDoc?.name || nextId };
  }

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-4 bg-bleepx-bg min-h-screen">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/lab" className="hover:underline">BleepxLab</Link>
        <span>/</span>
        <Link href={`/lab/${domain}`} className="hover:underline">{meta.name}</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">{doc.name}</span>
      </nav>

      <LabProjectViewer
        projectId={doc.id}
        name={doc.name}
        domain={domain}
        project={doc.project || meta.name}
        description={doc.description || ''}
        stepNumber={doc.step_number || 1}
        skills={doc.skills || []}
        language={doc.language || 'python'}
        datasetUrl={doc.dataset_url}
        sections={(doc.sections || []).map((s: any) => ({
          title: s.title || '',
          content: s.content || '',
          code: s.code || '',
          r_code: s.r_code || '',
          explanation: s.explanation || '',
        }))}
        hints={doc.hints || []}
        learningObjectives={doc.learning_objectives || []}
        thoughtProcess={doc.thought_process || []}
        solutionCode={doc.solution_code || ''}
        rSolutionCode={doc.r_solution_code || ''}
        expectedOutput={doc.expected_output || ''}
        rExpectedOutput={doc.r_expected_output || ''}
        schema={doc.schema || []}
        prevStep={prevStep}
        nextStep={nextStep}
      />
    </main>
  );
}
