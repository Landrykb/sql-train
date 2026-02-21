// app/cases/page.tsx
import Link from 'next/link';
import { Metadata } from 'next';
import { domainFolderMap } from '@/lib/constants';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';

export const metadata: Metadata = {
  title: 'BleepxQuery - SwiftLink Challenges',
};

export default function CasesPage() {
  const domains = Object.keys(domainFolderMap);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-bleepx-blue/10">
      <nav className="text-sm text-bleepx-gray" aria-label="Breadcrumb">
        <ol className="flex space-x-2">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>/</li>
          <li className="font-semibold">SwiftLink Challenges</li>
        </ol>
      </nav>
      <div className="flex items-center gap-2">
        <img src="/logo-bleepxquery.svg" alt="BleepxQuery" className="h-8 animate-pulse-logo" />
        <h1 className="text-3xl font-bold text-bleepx-gray">SwiftLink Challenges</h1>
      </div>
      <p className="text-bleepx-gray">Choose a domain to conquer SQL with Bleepx!</p>
      <BleepxPointsTracker caseIds={domains.flatMap(d => ['case1', 'case2'])} /> {/* Adjust caseIds */}
      {domains.length === 0 ? (
        <p className="text-bleepx-gray">No challenges found. Bleepx is disappointed, human!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {domains.map((domain) => (
            <Link
              key={domain}
              href={`/cases/${domain}`}
              className="block p-4 bg-bleepx-blue/10 border rounded hover:bg-bleepx-pink/10 transition"
            >
              <span className="capitalize font-medium text-bleepx-gray">
                {domain.charAt(0).toUpperCase() + domain.slice(1).replace('_', ' ')}
              </span>
            </Link>
          ))}
        </div>
      )}
      <AchievementNotification />
    </main>
  );
}