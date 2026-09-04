'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useProgress } from '@/lib/useProgress';
import { useSupabaseUser } from '@/lib/useSupabaseUser';
import {
  getGitHubUser,
  getGitHubToken,
  startGitHubLogin,
  AUTH_CHANGE_EVENT,
} from '@/lib/authClient';
import {
  pushDomainPortfolioToGitHub,
  pushLabDomainPortfolioToGitHub,
  pushCloudProviderPortfolioToGitHub,
} from '@/lib/githubPush';
import { playBleep } from '@/lib/audio';
import { fullCaseOrder } from '@/lib/constants';
import { LAB_CASE_ORDER, LAB_DOMAIN_META } from '@/lib/labConstants';
import {
  CLOUD_PROVIDERS,
  CLOUD_MISSIONS,
  CLOUD_PROVIDER_META,
  cloudMissionId,
} from '@/lib/cloud';
import {
  getReportGenerationTier,
  REPORT_GENERATION_TIERS,
  purchaseReportTier,
  type StoreState,
} from '@/lib/pointsStore';
import {
  DomainIcon,
  LabDomainIcon,
  CloudProviderIcon,
  CheckBadge,
  ErrorIcon,
} from '@/components/AppIcons';
import { VerseIcon } from '@/components/NavIcons';
import { FileText } from 'lucide-react';

const DOMAINS = [
  'business',
  'crime',
  'farming',
  'finance',
  'healthcare',
  'social',
  'space',
  'sports',
] as const;

const domainMeta: Record<string, { label: string }> = {
  business: { label: 'Business Retail' },
  crime: { label: 'Crime Chicago' },
  farming: { label: 'Farming NDVI' },
  finance: { label: 'Finance Stocks' },
  healthcare: { label: 'Healthcare' },
  social: { label: 'Social Twitter' },
  space: { label: 'Space NEO' },
  sports: { label: 'Sports NBA' },
};

type Verse = 'query' | 'lab' | 'cloud';

interface ExportStatus {
  loading: boolean;
  result?: { success: boolean; repoUrl?: string; error?: string };
}

interface ProfileExportSectionProps {
  storeState: StoreState;
  refreshStore: () => void;
  onWrite: (item: { verse: Verse; itemId: string; itemName: string; domain?: string }) => void;
}

export default function ProfileExportSection({
  storeState,
  refreshStore,
  onWrite,
}: ProfileExportSectionProps) {
  const { completed, points } = useProgress();
  const ghUser = useSupabaseUser();
  const [token, setToken] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const [status, setStatus] = useState<Record<string, ExportStatus>>({});
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Keep the GitHub token fresh. The cookie is set by the OAuth callback and
  // by the SIGNED_IN listener, but read it here so we can disable exports when
  // it is missing and show a clear sign-in prompt.
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setCheckingToken(true);
      const t = await getGitHubToken();
      if (!mounted) return;
      setToken(t);
      setCheckingToken(false);
    };
    check();
    const handler = () => check();
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    return () => {
      mounted = false;
      window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    };
  }, []);

  const user = useMemo(() => ghUser || getGitHubUser(), [ghUser]);
  const canExport = !!user && !!token;

  const setItemStatus = (key: string, patch: Partial<ExportStatus>) => {
    setStatus((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch },
    }));
  };

  const handleExportQueryDomain = async (domain: string) => {
    const key = `query-${domain}`;
    setItemStatus(key, { loading: true, result: undefined });

    const currentUser = user;
    if (!currentUser) {
      setItemStatus(key, { loading: false, result: { success: false, error: 'Sign in with GitHub first.' } });
      return;
    }
    const t = await getGitHubToken();
    if (!t) {
      setItemStatus(key, { loading: false, result: { success: false, error: 'GitHub token not available. Sign in with GitHub to export.' } });
      return;
    }

    const all = fullCaseOrder[domain] || [];
    const solved = all.filter((c) => completed.has(c));
    const caseData: Record<string, { name: string; query?: string; solution?: string; results?: Record<string, any>[] }> = {};
    for (const caseId of solved) {
      try {
        const saved = localStorage.getItem(`bleepx_solved_${domain}_${caseId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          caseData[caseId] = {
            name: caseId,
            query: parsed.query || '',
            solution: parsed.solution || '',
            results: parsed.results,
          };
        }
      } catch { /* ignore */ }
    }

    try {
      const result = await pushDomainPortfolioToGitHub(
        domain,
        solved,
        caseData,
        (msg) => console.log(msg),
        currentUser
      );
      setItemStatus(key, { loading: false, result });
    } catch (err: any) {
      setItemStatus(key, { loading: false, result: { success: false, error: err.message || 'Export failed' } });
    }
  };

  const handleExportLabDomain = async (domain: string) => {
    const key = `lab-${domain}`;
    setItemStatus(key, { loading: true, result: undefined });

    const currentUser = user;
    if (!currentUser) {
      setItemStatus(key, { loading: false, result: { success: false, error: 'Sign in with GitHub first.' } });
      return;
    }
    const t = await getGitHubToken();
    if (!t) {
      setItemStatus(key, { loading: false, result: { success: false, error: 'GitHub token not available. Sign in with GitHub to export.' } });
      return;
    }

    const cases = LAB_CASE_ORDER[domain] || [];
    const solved = cases.filter((c) => completed.has(c) || completed.has(`lab_${c}`));
    const projectData: Record<string, { name: string; code?: string }> = {};
    for (const projectId of solved) {
      try {
        const saved = localStorage.getItem(`bleepx_lab_step_${projectId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          projectData[projectId] = {
            name: projectId,
            code: parsed.solutionCode || parsed.code || '',
          };
        }
      } catch { /* ignore */ }
    }

    try {
      const result = await pushLabDomainPortfolioToGitHub(
        domain,
        solved,
        projectData,
        (msg) => console.log(msg)
      );
      setItemStatus(key, { loading: false, result });
    } catch (err: any) {
      setItemStatus(key, { loading: false, result: { success: false, error: err.message || 'Export failed' } });
    }
  };

  const handleExportCloudProvider = async (provider: string) => {
    const key = `cloud-${provider}`;
    setItemStatus(key, { loading: true, result: undefined });

    const currentUser = user;
    if (!currentUser) {
      setItemStatus(key, { loading: false, result: { success: false, error: 'Sign in with GitHub first.' } });
      return;
    }
    const t = await getGitHubToken();
    if (!t) {
      setItemStatus(key, { loading: false, result: { success: false, error: 'GitHub token not available. Sign in with GitHub to export.' } });
      return;
    }

    const missions = CLOUD_MISSIONS[provider as keyof typeof CLOUD_MISSIONS] || [];
    const solved = missions.filter((m: any) => completed.has(cloudMissionId(provider as any, m.slug)));
    const missionData: Record<string, { title: string; skills: string[]; description: string; iacCode?: string }> = {};
    for (const mission of solved) {
      missionData[mission.slug] = {
        title: mission.title,
        skills: mission.skills,
        description: mission.description,
        iacCode: mission.labType === 'iac' ? '' : undefined,
      };
    }

    try {
      const result = await pushCloudProviderPortfolioToGitHub(
        provider as any,
        solved.map((m: any) => m.slug),
        missionData,
        (msg) => console.log(msg),
        currentUser
      );
      setItemStatus(key, { loading: false, result });
    } catch (err: any) {
      setItemStatus(key, { loading: false, result: { success: false, error: err.message || 'Export failed' } });
    }
  };

  const handlePurchaseReportTier = (tierId: string) => {
    setPurchaseError(null);
    const result = purchaseReportTier(tierId, points);
    if (result.success) {
      refreshStore();
      window.dispatchEvent(new CustomEvent('points-changed', { detail: result.newBalance }));
    } else {
      setPurchaseError(result.error || 'Purchase failed');
    }
  };

  const reportTier = getReportGenerationTier();

  return (
    <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white space-y-6">
      <div>
        <h2 className="text-lg font-bold text-bleepx-text flex items-center gap-2">
          <FileText size={22} className="text-purple-600" /> Portfolio Exports
        </h2>
        <p className="text-sm text-bleepx-text-secondary mt-1">
          Export your completed BleepxQuery, BleepxLab, and BleepxCloud work to GitHub as professional portfolios.
        </p>
      </div>

      {/* GitHub token gate */}
      {!user && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
            Sign in with GitHub to push portfolios to your own repos.
          </p>
          <button
            onClick={() => startGitHubLogin()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Sign in with GitHub
          </button>
        </div>
      )}
      {user && checkingToken && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
          Checking GitHub connection...
        </div>
      )}
      {user && token === null && !checkingToken && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
            Your GitHub access token is missing or expired. Sign in again to refresh it.
          </p>
          <button
            onClick={() => startGitHubLogin()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Refresh GitHub Token
          </button>
        </div>
      )}

      {/* Report Generation Tiers */}
      <div className="border border-bleepx-border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
        <h3 className="font-bold text-bleepx-text mb-2 flex items-center gap-2">
          <FileText size={18} className="text-purple-600" /> Report Generation
        </h3>
        <p className="text-xs text-bleepx-text-secondary mb-3">
          Purchase tiers to unlock AI-powered portfolio reports with graphs.
        </p>
        {purchaseError && (
          <p className="text-xs text-red-600 mb-2">{purchaseError}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {REPORT_GENERATION_TIERS.map((tier) => {
            const owned = storeState.purchasedTitles.includes(tier.id);
            const canAfford = points >= tier.cost;
            const meetsRequirement = !tier.minPointsRequired || storeState.totalPointsEarned >= tier.minPointsRequired;
            return (
              <div key={tier.id} className={`p-3 rounded-lg border ${owned ? 'border-purple-400 bg-purple-100 dark:bg-purple-900/40' : 'border-bleepx-border bg-white dark:bg-gray-800'}`}>
                <div className="font-bold text-sm text-bleepx-text">{tier.name}</div>
                <div className="text-xs text-bleepx-text-secondary mt-1">{tier.description}</div>
                <div className="text-xs text-bleepx-text-secondary mt-1">
                  {tier.perks.maxReports === Infinity ? 'Unlimited reports' : `${tier.perks.maxReports} reports`}
                  {tier.perks.includeGraphs && ' • Graphs'}
                  {tier.perks.multipleFormats && ' • Export'}
                </div>
                {owned ? (
                  <div className="mt-2 text-xs font-medium text-purple-600 inline-flex items-center gap-1">
                    <CheckBadge size={12} className="text-purple-600" /> Owned
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchaseReportTier(tier.id)}
                    disabled={!canAfford || !meetsRequirement}
                    className={`mt-2 w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                      canAfford && meetsRequirement
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {tier.cost} pts
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BleepxQuery Exports */}
      <div className="border border-bleepx-border rounded-lg p-4">
        <h3 className="font-bold text-bleepx-text mb-2 flex items-center gap-2">
          <VerseIcon verse="query" size={20} className="text-bleepx-blue" /> BleepxQuery
        </h3>
        <p className="text-xs text-bleepx-text-secondary mb-3">Export SQL challenges to your GitHub portfolio.</p>
        <div className="space-y-3">
          {DOMAINS.map((domain) => {
            const all = fullCaseOrder[domain] || [];
            const solved = all.filter((c) => completed.has(c)).length;
            const hasWork = solved > 0;
            const key = `query-${domain}`;
            const itemStatus = status[key];
            return (
              <div key={domain} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-bleepx-text"><DomainIcon domain={domain} size={18} /></span>
                  <span className="text-sm font-medium text-bleepx-text">{domainMeta[domain]?.label || domain}</span>
                  <span className="text-xs text-bleepx-text-secondary">({solved}/{all.length})</span>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    disabled={!hasWork || !canExport || itemStatus?.loading}
                    onClick={() => handleExportQueryDomain(domain)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      hasWork && canExport && !itemStatus?.loading
                        ? 'bg-bleepx-blue text-white hover:bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {itemStatus?.loading ? 'Exporting...' : 'Export'}
                  </button>
                  {hasWork && user && (
                    <button
                      onClick={() => {
                        playBleep();
                        onWrite({
                          verse: 'query',
                          itemId: `query-${domain}`,
                          itemName: `${domainMeta[domain]?.label || domain} Portfolio`,
                          domain,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-bleepx-border text-bleepx-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Write
                    </button>
                  )}
                </div>
                {itemStatus?.result && !itemStatus.loading && (
                  <div className="w-full mt-1 text-xs">
                    {itemStatus.result.success ? (
                      <span className="text-emerald-600 flex items-center gap-1 flex-wrap">
                        <CheckBadge size={14} className="text-emerald-600" />
                        Exported!{' '}
                        <a href={itemStatus.result.repoUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">
                          {itemStatus.result.repoUrl}
                        </a>
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <ErrorIcon size={14} className="text-red-600" /> {itemStatus.result.error}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BleepxLab Exports */}
      <div className="border border-bleepx-border rounded-lg p-4">
        <h3 className="font-bold text-bleepx-text mb-2 flex items-center gap-2">
          <VerseIcon verse="lab" size={20} className="text-teal-500" /> BleepxLab
        </h3>
        <p className="text-xs text-bleepx-text-secondary mb-3">Export data science projects to your GitHub portfolio.</p>
        <div className="space-y-3">
          {Object.entries(LAB_CASE_ORDER).map(([domain, cases]) => {
            const solved = cases.filter((c) => completed.has(c) || completed.has(`lab_${c}`)).length;
            const hasWork = solved > 0;
            const meta = LAB_DOMAIN_META[domain];
            const key = `lab-${domain}`;
            const itemStatus = status[key];
            return (
              <div key={domain} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-bleepx-text"><LabDomainIcon domain={domain} size={18} /></span>
                  <span className="text-sm font-medium text-bleepx-text">{meta?.name || domain}</span>
                  <span className="text-xs text-bleepx-text-secondary">({solved}/{cases.length})</span>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    disabled={!hasWork || !canExport || itemStatus?.loading}
                    onClick={() => handleExportLabDomain(domain)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      hasWork && canExport && !itemStatus?.loading
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {itemStatus?.loading ? 'Exporting...' : 'Export'}
                  </button>
                  {hasWork && user && (
                    <button
                      onClick={() => {
                        playBleep();
                        onWrite({
                          verse: 'lab',
                          itemId: `lab-${domain}`,
                          itemName: `${meta?.name || domain} Portfolio`,
                          domain,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-bleepx-border text-bleepx-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Write
                    </button>
                  )}
                </div>
                {itemStatus?.result && !itemStatus.loading && (
                  <div className="w-full mt-1 text-xs">
                    {itemStatus.result.success ? (
                      <span className="text-emerald-600 flex items-center gap-1 flex-wrap">
                        <CheckBadge size={14} className="text-emerald-600" />
                        Exported!{' '}
                        <a href={itemStatus.result.repoUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">
                          {itemStatus.result.repoUrl}
                        </a>
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <ErrorIcon size={14} className="text-red-600" /> {itemStatus.result.error}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BleepxCloud Exports */}
      <div className="border border-bleepx-border rounded-lg p-4">
        <h3 className="font-bold text-bleepx-text mb-2 flex items-center gap-2">
          <VerseIcon verse="cloud" size={20} className="text-sky-500" /> BleepxCloud
        </h3>
        <p className="text-xs text-bleepx-text-secondary mb-3">Export cloud architecture missions to your GitHub portfolio.</p>
        <div className="space-y-3">
          {CLOUD_PROVIDERS.map((provider) => {
            const missions = CLOUD_MISSIONS[provider] || [];
            const solved = missions.filter((m) => completed.has(cloudMissionId(provider as any, m.slug))).length;
            const hasWork = solved > 0;
            const meta = CLOUD_PROVIDER_META[provider];
            const key = `cloud-${provider}`;
            const itemStatus = status[key];
            return (
              <div key={provider} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-bleepx-text"><CloudProviderIcon provider={provider} size={18} /></span>
                  <span className="text-sm font-medium text-bleepx-text">{meta?.name}</span>
                  <span className="text-xs text-bleepx-text-secondary">({solved}/{missions.length})</span>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    disabled={!hasWork || !canExport || itemStatus?.loading}
                    onClick={() => handleExportCloudProvider(provider)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      hasWork && canExport && !itemStatus?.loading
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {itemStatus?.loading ? 'Exporting...' : 'Export'}
                  </button>
                  {hasWork && user && (
                    <button
                      onClick={() => {
                        playBleep();
                        onWrite({
                          verse: 'cloud',
                          itemId: `cloud-${provider}`,
                          itemName: `${meta?.name} Portfolio`,
                          domain: provider,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-bleepx-border text-bleepx-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Write
                    </button>
                  )}
                </div>
                {itemStatus?.result && !itemStatus.loading && (
                  <div className="w-full mt-1 text-xs">
                    {itemStatus.result.success ? (
                      <span className="text-emerald-600 flex items-center gap-1 flex-wrap">
                        <CheckBadge size={14} className="text-emerald-600" />
                        Exported!{' '}
                        <a href={itemStatus.result.repoUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">
                          {itemStatus.result.repoUrl}
                        </a>
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <ErrorIcon size={14} className="text-red-600" /> {itemStatus.result.error}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
