// app/cases/page.tsx
import Link from 'next/link';
import { Metadata } from 'next';
import { domainFolderMap, fullCaseOrder } from '@/lib/constants';
import BleepxLogo from '@/components/BleepxLogo';
import { BleepxFace } from '@/components/BleepxIcons';
import AchievementNotification from '@/components/AchievementNotification';

export const metadata: Metadata = {
  title: 'BleepxQuery — SwiftLink Training Program',
};

const domainInfo: Record<string, { icon: string; desc: string; difficulty: string; stars: number; color: string }> = {
  business: { icon: '🏬', desc: 'Retail analytics & customer insights', difficulty: 'Beginner', stars: 1, color: 'from-blue-500 to-blue-700' },
  crime: { icon: '🔍', desc: 'Crime patterns & geospatial analysis', difficulty: 'Beginner', stars: 1, color: 'from-red-500 to-red-700' },
  farming: { icon: '🌾', desc: 'Crop yield & vegetation indices', difficulty: 'Intermediate', stars: 2, color: 'from-green-500 to-green-700' },
  finance: { icon: '📈', desc: 'Trading signals & portfolio risk', difficulty: 'Intermediate', stars: 2, color: 'from-purple-500 to-purple-700' },
  healthcare: { icon: '🏥', desc: 'Patient records & diagnoses', difficulty: 'Intermediate', stars: 2, color: 'from-teal-500 to-teal-700' },
  social: { icon: '💬', desc: 'User engagement & sentiment', difficulty: 'Intermediate', stars: 2, color: 'from-pink-500 to-pink-700' },
  space: { icon: '🚀', desc: 'NEO tracking & orbital mechanics', difficulty: 'Advanced', stars: 3, color: 'from-indigo-500 to-indigo-700' },
  sports: { icon: '🏀', desc: 'NBA stats & player analytics', difficulty: 'Advanced', stars: 3, color: 'from-orange-500 to-orange-700' },
};

export default function CasesPage() {
  const domains = Object.keys(domainFolderMap).filter((d) => d !== 'guide');

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 bg-bleepx-bg min-h-screen">
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
          <h1 className="text-xl sm:text-2xl font-bold text-bleepx-text">SwiftLink Training Program</h1>
          <p className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1"><BleepxFace size={16} /> *bleep* Pick a domain. Show me what you&apos;ve got.</p>
        </div>
      </div>

      {domains.length === 0 ? (
        <p className="text-bleepx-text-secondary">*bleep* No missions detected. Something is wrong.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {domains.map((domain) => {
            const total = fullCaseOrder[domain]?.length || 0;
            const info = domainInfo[domain];
            return (
              <Link
                key={domain}
                href={`/cases/${domain}`}
                className="group relative overflow-hidden block p-4 sm:p-5 bg-bleepx-white border border-bleepx-border rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                {info && <div className={`absolute inset-0 bg-gradient-to-br ${info.color} opacity-0 group-hover:opacity-5 transition-opacity`} />}
                <div className="relative flex items-start gap-3">
                  <div className="text-2xl sm:text-3xl flex-shrink-0">{info?.icon || '📁'}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="capitalize font-bold text-bleepx-text text-base sm:text-lg group-hover:text-bleepx-blue transition-colors">
                      {domain}
                    </h3>
                    {info && <p className="text-xs text-bleepx-text-secondary mt-0.5 line-clamp-1">{info.desc}</p>}
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[10px] sm:text-xs text-bleepx-text-secondary">{info?.difficulty || 'Beginner'}</span>
                      <span className="text-amber-400 text-[10px] sm:text-xs">{'⭐'.repeat(info?.stars || 1)}</span>
                      <span className="text-[10px] text-bleepx-text-secondary ml-auto">{total} missions</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-bleepx-blue group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-center pt-2 space-y-2">
        <Link href="/cases/guide" className="inline-flex items-center gap-1.5 text-sm text-bleepx-blue hover:underline font-medium">
          📖 SQL Reference Guide
        </Link>
        <br />
        <Link href="/profile?tab=exports" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:underline font-medium">
          📤 Draft Your Report (Export to GitHub)
        </Link>
      </div>
      <AchievementNotification />
    </main>
  );
}