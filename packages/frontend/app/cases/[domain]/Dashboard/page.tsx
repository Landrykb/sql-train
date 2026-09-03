import DomainDashboard from '@/components/DomainDashboard';
import BleepxPointsTracker from '@/components/BleepxPointsTracker';
import AchievementNotification from '@/components/AchievementNotification';
import { DomainIcon } from '@/components/AppIcons';
import { domainFolderMap, DOMAIN_DATASETS } from '@/lib/constants';

export async function generateStaticParams() {
  return Object.keys(domainFolderMap)
    .filter((d) => d !== 'guide')
    .map((domain) => ({ domain }));
}

interface Dataset {
  name: string;
  file: string;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const normalizedDomain = domainFolderMap[domain.toLowerCase()] || domain.toLowerCase();
  const datasets: Dataset[] = DOMAIN_DATASETS[normalizedDomain] || [];
  const plots: any[] = [];

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 bg-bleepx-bg min-h-screen pb-20">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <DomainIcon domain={normalizedDomain} size={32} className="text-bleepx-blue flex-shrink-0" />
        <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text min-w-0">
          BleepxQuery: <span className="capitalize">{normalizedDomain}</span> Dashboard
        </h1>
      </div>
      <BleepxPointsTracker />
      <DomainDashboard domain={normalizedDomain} datasets={datasets} plots={plots} />
      <AchievementNotification />
    </main>
  );
}
