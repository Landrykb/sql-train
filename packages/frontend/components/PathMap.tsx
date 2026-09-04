'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, hiddenCaseOrder, CASE_TIERS, TRIAL_TIER_UNLOCK } from '@/lib/constants';
import { getStoreState } from '@/lib/pointsStore';
import { BleepxFace, BleepxSpark } from '@/components/BleepxIcons';

interface CaseNode {
  id: string;
  hidden: boolean;
}

interface PathMapProps {
  domain: string;
  cases: { id: string; name: string; hidden?: boolean }[];
}

const tierLabels: Record<number, string> = {
  0: 'SELECT',
  1: 'AGGREGATE',
  2: 'JOIN',
  3: 'WINDOW',
  4: 'CTE',
  5: 'CAPSTONE',
};

export default function PathMap({ domain, cases }: PathMapProps) {
  const { completed, isUnlocked } = useProgress();

  const regularIds = caseOrder[domain] || [];
  const hiddenIds = new Set(hiddenCaseOrder[domain] || []);
  const isTrial = domain === 'trials';
  const totalPointsEarned = isTrial ? (getStoreState().totalPointsEarned || 0) : 0;

  const nodes: CaseNode[] = useMemo(() => {
    return cases.map((c) => ({
      id: c.id,
      hidden: !!c.hidden || hiddenIds.has(c.id),
    }));
  }, [cases, hiddenIds]);

  const regularNodes = nodes.filter((n) => !n.hidden);
  const hiddenNodes = nodes.filter((n) => n.hidden);

  const getStatus = (caseId: string, isHidden: boolean) => {
    if (completed?.has(caseId)) return 'completed';
    // Trials use tier-based unlock, not sequential prereqs
    if (isTrial) {
      const tier = CASE_TIERS[caseId] || 1;
      const req = TRIAL_TIER_UNLOCK[tier] || TRIAL_TIER_UNLOCK[1];
      return totalPointsEarned >= req.minPoints ? 'unlocked' : 'locked';
    }
    const idx = regularIds.indexOf(caseId);
    const prereqs = idx > 0 ? regularIds.slice(0, idx) : [];
    if (isHidden) {
      if (isUnlocked(regularIds)) return 'unlocked';
      return 'locked';
    }
    if (prereqs.length === 0) return 'unlocked';
    if (isUnlocked(prereqs)) return 'unlocked';
    return 'locked';
  };

  const getCaseName = (id: string) => {
    const c = cases.find((c) => c.id === id);
    return c?.name || id.replace(/_/g, ' ');
  };

  const statusColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    completed: {
      bg: 'bg-emerald-500',
      border: 'border-emerald-400',
      text: 'text-emerald-100',
      glow: 'shadow-emerald-500/40',
    },
    unlocked: {
      bg: 'bg-blue-500',
      border: 'border-blue-400',
      text: 'text-blue-100',
      glow: 'shadow-blue-500/40',
    },
    locked: {
      bg: 'bg-gray-600',
      border: 'border-gray-500',
      text: 'text-gray-400',
      glow: '',
    },
  };

  const hiddenStatusColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    completed: {
      bg: 'bg-amber-500',
      border: 'border-amber-400',
      text: 'text-amber-100',
      glow: 'shadow-amber-500/50',
    },
    unlocked: {
      bg: 'bg-purple-500',
      border: 'border-purple-400',
      text: 'text-purple-100',
      glow: 'shadow-purple-500/40 animate-pulse',
    },
    locked: {
      bg: 'bg-gray-700',
      border: 'border-gray-600',
      text: 'text-gray-500',
      glow: '',
    },
  };

  const StatusIcon = ({ status, isHidden }: { status: string; isHidden: boolean }) => {
    if (status === 'completed') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (status === 'unlocked') {
      return isHidden ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
  };

  const completedCount = nodes.filter((n) => completed?.has(n.id)).length;
  const totalCount = nodes.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-700/50">
      <div className="flex flex-wrap items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-sm sm:text-lg font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
          <BleepxFace size={22} className="opacity-80" />
          Learning Path
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="w-20 sm:w-32 h-1.5 sm:h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs sm:text-xs text-gray-400 font-mono">{progressPct}%</span>
        </div>
      </div>

      {/* Regular path */}
      {isTrial ? (
        <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
          {regularNodes.map((node, i) => {
            const status = getStatus(node.id, false);
            const colors = statusColors[status];
            return (
              <Link
                key={node.id}
                href={status !== 'locked' ? `/cases/${domain}/${node.id}` : '#'}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200
                  ${status === 'completed' ? 'bg-emerald-500/10 hover:bg-emerald-500/20' :
                    status === 'unlocked' ? 'bg-blue-500/10 hover:bg-blue-500/20' :
                    'bg-gray-800/50 opacity-60 cursor-not-allowed'}
                `}
              >
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold
                  ${colors.bg} ${colors.border} ${colors.text}
                  ${colors.glow ? `shadow-md ${colors.glow}` : ''}
                `}>
                  {status === 'completed' ? <StatusIcon status={status} isHidden={false} /> : <span className="text-xs">{i + 1}</span>}
                </span>
                <span className={`text-sm font-medium min-w-0 whitespace-normal break-words flex-1 ${
                  status === 'completed' ? 'text-emerald-300' :
                  status === 'unlocked' ? 'text-blue-300' :
                  'text-gray-500'
                }`}>
                  {getCaseName(node.id)}
                </span>
                {status === 'locked' && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {(() => { const t = CASE_TIERS[node.id] || 1; const r = TRIAL_TIER_UNLOCK[t]; return r && r.minPoints > 0 ? `${r.minPoints} pts` : ''; })()}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
      <div className="relative">
        {regularNodes.map((node, i) => {
          const status = getStatus(node.id, false);
          const colors = statusColors[status];
          const isLast = i === regularNodes.length - 1;
          const label = tierLabels[i] || '';

          return (
            <div key={node.id} className="flex flex-wrap items-start gap-2.5 sm:gap-4 group">
              {/* Vertical line + node circle */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                <Link
                  href={status !== 'locked' ? `/cases/${domain}/${node.id}` : '#'}
                  className={`
                    relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2
                    ${colors.bg} ${colors.border} ${colors.text}
                    ${colors.glow ? `shadow-lg ${colors.glow}` : ''}
                    ${status !== 'locked' ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
                    transition-all duration-300
                  `}
                >
                  <StatusIcon status={status} isHidden={false} />
                </Link>
                {!isLast && (
                  <div className={`w-0.5 h-6 sm:h-8 ${status === 'completed' ? 'bg-emerald-500/60' : 'bg-gray-600'} transition-colors duration-500`} />
                )}
              </div>

              {/* Label */}
              <div className="pt-1.5 sm:pt-2 pb-2 sm:pb-4 min-w-0 flex-1">
                <Link
                  href={status !== 'locked' ? `/cases/${domain}/${node.id}` : '#'}
                  className={`
                    block group-hover:translate-x-1 transition-transform duration-200
                    ${status !== 'locked' ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {label && (
                      <span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        status === 'unlocked' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-700 text-gray-500'
                      }`}>
                        {label}
                      </span>
                    )}
                    <span className={`text-sm font-medium min-w-0 whitespace-normal break-words ${
                      status === 'completed' ? 'text-emerald-300' :
                      status === 'unlocked' ? 'text-blue-300' :
                      'text-gray-500'
                    }`}>
                      {getCaseName(node.id)}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Hidden path branch */}
      {hiddenNodes.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 my-4">
            <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex flex-wrap items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Bonus Missions
            </span>
            <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-amber-500/30 via-transparent to-transparent" />
          </div>

          <div className="relative pl-2">
            {hiddenNodes.map((node, i) => {
              const status = getStatus(node.id, true);
              const colors = hiddenStatusColors[status];
              const isLast = i === hiddenNodes.length - 1;

              return (
                <div key={node.id} className="flex flex-wrap items-start gap-4 group">
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                    <Link
                      href={status !== 'locked' ? `/cases/${domain}/${node.id}` : '#'}
                      className={`
                        relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-lg rotate-45 flex items-center justify-center border-2
                        ${colors.bg} ${colors.border} ${colors.text}
                        ${colors.glow ? `shadow-lg ${colors.glow}` : ''}
                        ${status !== 'locked' ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
                        transition-all duration-300
                      `}
                    >
                      <span className="-rotate-45">
                        <StatusIcon status={status} isHidden={true} />
                      </span>
                    </Link>
                    {!isLast && (
                      <div className={`w-0.5 h-6 sm:h-8 ${status === 'completed' ? 'bg-amber-500/60' : 'bg-gray-700'}`} />
                    )}
                  </div>

                  <div className="pt-1.5 sm:pt-2 pb-2 sm:pb-4 min-w-0 flex-1">
                    <Link
                      href={status !== 'locked' ? `/cases/${domain}/${node.id}` : '#'}
                      className={`
                        block group-hover:translate-x-1 transition-transform duration-200
                        ${status !== 'locked' ? 'cursor-pointer' : 'cursor-not-allowed'}
                      `}
                    >
                      <span className={`text-sm font-medium min-w-0 whitespace-normal break-words ${
                        status === 'completed' ? 'text-amber-300' :
                        status === 'unlocked' ? 'text-purple-300' :
                        'text-gray-500'
                      }`}>
                        {status === 'locked' ? '??? Mystery Mission ???' : getCaseName(node.id)}
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-700/50">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-full bg-emerald-500" /> Completed
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-full bg-blue-500" /> Unlocked
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-full bg-gray-600" /> Locked
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-lg rotate-45 bg-amber-500 inline-block" style={{ width: 12, height: 12 }} /> Bonus
        </div>
      </div>
    </div>
  );
}
