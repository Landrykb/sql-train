// app/cases/page.tsx
import Link from 'next/link';
import { Metadata } from 'next';
import { domainFolderMap, fullCaseOrder } from '@/lib/constants';
import BleepxLogo from '@/components/BleepxLogo';
import AchievementNotification from '@/components/AchievementNotification';

export const metadata: Metadata = {
  title: 'BleepxQuery — SwiftLink Training Program',
};

const domainIcons: Record<string, string> = {
  business: '🏬', crime: '🔍', farming: '🌾', finance: '📈',
  healthcare: '🏥', social: '💬', space: '🚀', sports: '🏀', guide: '📖',
};

export default function CasesPage() {
  const domains = Object.keys(domainFolderMap).filter((d) => d !== 'guide');

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6 bg-bleepx-bg min-h-screen">
      <nav className="text-sm text-bleepx-text-secondary" aria-label="Breadcrumb">
        <ol className="flex space-x-2 items-center">
          <li><Link href="/" className="hover:text-bleepx-blue">Home</Link></li>
          <li>/</li>
          <li className="font-semibold text-bleepx-text">Challenges</li>
        </ol>
      </nav>
      <div className="flex items-center gap-3">
        <BleepxLogo />
        <div>
          <h1 className="text-2xl font-bold text-bleepx-text">SwiftLink Training Program</h1>
          <p className="text-sm text-bleepx-text-secondary">*bleep* Pick a domain. Show me what you've got.</p>
        </div>
      </div>
      {domains.length === 0 ? (
        <p className="text-bleepx-text-secondary">*bleep* No missions detected. Something is wrong.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {domains.map((domain) => {
            const total = fullCaseOrder[domain]?.length || 0;
            return (
              <Link
                key={domain}
                href={`/cases/${domain}`}
                className="group block p-4 bg-bleepx-white border border-bleepx-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="text-2xl mb-1">{domainIcons[domain] || '📁'}</div>
                <span className="capitalize font-bold text-bleepx-text text-sm group-hover:text-bleepx-blue transition-colors">
                  {domain}
                </span>
                <div className="text-[10px] text-bleepx-text-secondary mt-0.5">{total} missions</div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="text-center">
        <Link href="/cases/guide" className="inline-flex items-center gap-1.5 text-sm text-bleepx-blue hover:underline">
          📖 SQL Reference Guide
        </Link>
      </div>
      <AchievementNotification />
    </main>
  );
}