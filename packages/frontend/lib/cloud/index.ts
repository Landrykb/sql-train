import type { CloudMission, CloudProvider, CloudProviderMeta } from './types';
import { awsMissions } from './aws';
import { azureMissions } from './azure';
import { gcpMissions } from './gcp';
import { esgMissions } from './esg';
import { financeMissions } from './finance';

export * from './types';

export const CLOUD_MISSIONS: Record<CloudProvider, CloudMission[]> = {
  aws: awsMissions,
  azure: azureMissions,
  gcp: gcpMissions,
  esg: esgMissions,
  finance: financeMissions,
};

export const CLOUD_PROVIDER_META: Record<CloudProvider, CloudProviderMeta> = {
  aws: {
    key: 'aws',
    icon: '☁️',
    name: 'Amazon Web Services',
    short: 'AWS',
    desc: 'EC2, S3, VPC, IAM, RDS, Lambda & SAA-C03 exam prep',
    color: 'from-orange-500 to-amber-600',
    difficulty: 'Beginner',
    stars: 1,
    cert: 'SAA-C03',
  },
  azure: {
    key: 'azure',
    icon: '🔷',
    name: 'Microsoft Azure',
    short: 'Azure',
    desc: 'VMs, Blob Storage, Entra ID, ARM/Bicep & AZ-305 prep',
    color: 'from-sky-500 to-blue-700',
    difficulty: 'Beginner',
    stars: 1,
    cert: 'AZ-900 / AZ-305',
  },
  gcp: {
    key: 'gcp',
    icon: '🌐',
    name: 'Google Cloud',
    short: 'GCP',
    desc: 'Compute Engine, GKE, BigQuery & PCA exam prep',
    color: 'from-red-500 to-rose-600',
    difficulty: 'Intermediate',
    stars: 2,
    cert: 'ACE / PCA',
  },
  esg: {
    key: 'esg',
    icon: '🌱',
    name: 'ESG & Decarbonization',
    short: 'ESG',
    desc: 'Carbon credits, net-zero infra, ESG pipelines & farming',
    color: 'from-emerald-500 to-green-700',
    difficulty: 'Intermediate',
    stars: 2,
  },
  finance: {
    key: 'finance',
    icon: '💹',
    name: 'Finance & Industry',
    short: 'FinOps',
    desc: 'FinOps, financial services, fraud, retail, healthcare, media & gaming blueprints',
    color: 'from-fuchsia-500 to-purple-700',
    difficulty: 'Intermediate',
    stars: 2,
    cert: 'FinOps Practitioner',
  },
};

export const CLOUD_PROVIDERS = Object.keys(CLOUD_PROVIDER_META) as CloudProvider[];

export function isCloudProvider(value: string): value is CloudProvider {
  return (CLOUD_PROVIDERS as string[]).includes(value);
}

export function getMissions(provider: CloudProvider): CloudMission[] {
  return CLOUD_MISSIONS[provider] || [];
}

export function getMission(
  provider: CloudProvider,
  slug: string,
): CloudMission | undefined {
  return getMissions(provider).find((m) => m.slug === slug);
}

/** Ordered slugs for a provider (for next/prev navigation). */
export function getMissionSlugs(provider: CloudProvider): string[] {
  return getMissions(provider).map((m) => m.slug);
}

export const TOTAL_CLOUD_MISSIONS = CLOUD_PROVIDERS.reduce(
  (sum, p) => sum + CLOUD_MISSIONS[p].length,
  0,
);

/** Group a provider's missions by their section, preserving order. */
export function groupBySection(
  missions: CloudMission[],
): { section: string; missions: CloudMission[] }[] {
  const order: string[] = [];
  const map = new Map<string, CloudMission[]>();
  for (const m of missions) {
    if (!map.has(m.section)) {
      map.set(m.section, []);
      order.push(m.section);
    }
    map.get(m.section)!.push(m);
  }
  return order.map((section) => ({ section, missions: map.get(section)! }));
}
