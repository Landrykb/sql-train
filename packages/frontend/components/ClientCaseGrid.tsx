// components/ClientCaseGrid.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, hiddenCaseOrder, CASE_TIERS, TRIAL_TIER_UNLOCK } from '@/lib/constants';
import { getStoreState } from '@/lib/pointsStore';
import { BleepxLock, BleepxSpark } from '@/components/BleepxIcons';

interface Case {
  id: string;
  name: string;
  tier: number;
  skills: string[];
  prereq_cases?: string[];
  hidden?: boolean;
}

interface Props {
  cases: Case[];
  domain: string;
  nextCaseId?: string;
}

export default function ClientCaseGrid({ cases, domain, nextCaseId }: Props) {
  const { completed, isUnlocked } = useProgress();
  const [filter, setFilter] = useState<'all' | 'completed' | 'locked' | 'hidden'>('all');
  const router = useRouter();

  const regularCases = caseOrder[domain] || [];
  const hiddenIds = new Set(hiddenCaseOrder[domain] || []);
  const allRegularComplete = regularCases.length > 0 && regularCases.every((id) => completed.has(id));

  // Progressive trial unlock: check lifetime points against trial tier thresholds
  const isTrial = domain === 'trials';
  const totalPointsEarned = isTrial ? (getStoreState().totalPointsEarned || 0) : 0;
  const isTrialUnlocked = (caseId: string) => {
    const tier = CASE_TIERS[caseId] || 1;
    const req = TRIAL_TIER_UNLOCK[tier] || TRIAL_TIER_UNLOCK[1];
    return totalPointsEarned >= req.minPoints;
  };
  const getTrialLockLabel = (caseId: string) => {
    const tier = CASE_TIERS[caseId] || 1;
    const req = TRIAL_TIER_UNLOCK[tier] || TRIAL_TIER_UNLOCK[1];
    return `${req.label} (${req.minPoints} pts)`;
  };

  const filteredCases = cases.filter((c, index) => {
    const isHidden = hiddenIds.has(c.id) || c.hidden;
    const isFirstCase = index === 0;
    const isCaseUnlocked = isFirstCase || isUnlocked(c.prereq_cases || []);
    if (filter === 'completed') return completed.has(c.id);
    if (filter === 'locked') return !isFirstCase && !isCaseUnlocked && !isHidden;
    if (filter === 'hidden') return isHidden;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm whitespace-nowrap flex-shrink-0 ${filter === 'all' ? 'bg-bleepx-blue text-white' : 'bg-gray-200 dark:bg-gray-700 text-bleepx-text'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm whitespace-nowrap flex-shrink-0 ${filter === 'completed' ? 'bg-bleepx-blue text-white' : 'bg-gray-200 dark:bg-gray-700 text-bleepx-text'}`}
        >
          Done
        </button>
        <button
          onClick={() => setFilter('locked')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm whitespace-nowrap flex-shrink-0 ${filter === 'locked' ? 'bg-bleepx-blue text-white' : 'bg-gray-200 dark:bg-gray-700 text-bleepx-text'}`}
        >
          Locked
        </button>
        <button
          onClick={() => setFilter('hidden')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm whitespace-nowrap flex-shrink-0 ${filter === 'hidden' ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-bleepx-text'}`}
        >
          Bonus
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {filteredCases.map((c, index) => {
          const isHidden = hiddenIds.has(c.id) || c.hidden;
          const isFirstCase = index === 0 && !isHidden;
          const locked = isTrial ? !isTrialUnlocked(c.id) : (!isFirstCase && !isUnlocked(c.prereq_cases || []));
          const hiddenLocked = isHidden && !allRegularComplete;
          const isEffectivelyLocked = locked || hiddenLocked;
          const isNext = c.id === nextCaseId && !isEffectivelyLocked && !completed.has(c.id);

          if (isHidden && hiddenLocked) {
            return (
              <div
                key={c.id}
                className="block p-4 sm:p-6 rounded-lg shadow-md bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400 border border-gray-700 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[url('/bleepx-logo.png')] bg-center bg-no-repeat opacity-5 bg-contain" />
                <div className="relative">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-300">??? Hidden Challenge</h3>
                    <span className="text-amber-400 text-xs font-bold px-2 py-1 bg-amber-400/10 rounded-full">BONUS</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 italic">
                    Complete all {regularCases.length} regular challenges to unlock this real-world business scenario.
                  </p>
                  <div className="mt-3 flex gap-1">
                    {regularCases.map((rid) => (
                      <span
                        key={rid}
                        className={`w-3 h-3 rounded-full ${
                          completed.has(rid) ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                        title={rid}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={c.id}
              href={isEffectivelyLocked ? '#' : `/cases/${domain}/${c.id}`}
              className={`
                block p-4 sm:p-6 rounded-lg shadow-md transition-all duration-200
                ${
                  isEffectivelyLocked
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-75'
                    : isHidden && !completed.has(c.id)
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-400 shadow-amber-200/50 shadow-lg hover:shadow-amber-300/50'
                    : isHidden && completed.has(c.id)
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-500'
                    : isNext
                    ? 'bg-bleepx-blue/10 border-l-4 border-bleepx-blue'
                    : completed.has(c.id)
                    ? 'bg-bleepx-pink/10 border-l-4 border-bleepx-pink'
                    : 'bg-bleepx-white hover:bg-bleepx-blue/5'
                }
              `}
              aria-disabled={isEffectivelyLocked}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-base sm:text-lg font-semibold text-bleepx-gray">{c.name}</h3>
                <div className="flex items-center gap-2">
                  {isHidden && (
                    <span className="text-amber-500 text-xs font-bold px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">BONUS</span>
                  )}
                  {completed.has(c.id) && (
                    <span className="text-bleepx-blue text-sm" aria-label="Completed">
                      ✓ (+{10 * c.tier} Points)
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-bleepx-gray mt-1 flex items-center gap-1.5">
                {isHidden ? (
                  <span className="text-amber-600 font-medium">Real-World Scenario</span>
                ) : (
                  <>
                    <span>{c.tier <= 1 ? 'Beginner' : c.tier === 2 ? 'Intermediate' : c.tier === 3 ? 'Advanced' : c.tier === 4 ? 'Expert' : 'Master'}</span>
                    <span className="text-amber-400 text-xs">{'⭐'.repeat(Math.min(c.tier || 1, 5))}</span>
                  </>
                )}
              </div>
              <div className="text-sm text-bleepx-gray mt-2">
                <strong>Skills:</strong>{' '}
                {c.skills.map((skill) => (
                  <span
                    key={skill}
                    className={`inline-block text-xs px-2 py-1 rounded mr-1 ${
                      isHidden
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                        : 'bg-bleepx-blue/10 text-bleepx-gray'
                    }`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {isNext && (
                <p className="text-xs sm:text-sm text-bleepx-blue mt-2 flex items-center gap-1"><BleepxSpark size={14} /> *bleep* Tackle this next.</p>
              )}
              {isEffectivelyLocked && isTrial && (
                <div className="text-xs text-bleepx-gray mt-2 flex items-center gap-1.5">
                  <BleepxLock size={16} /> Requires <strong>{getTrialLockLabel(c.id)}</strong> portfolio level
                </div>
              )}
              {isEffectivelyLocked && !isTrial && c.prereq_cases && c.prereq_cases.length > 0 && (
                <div className="text-xs text-bleepx-gray mt-2">
                  Complete prerequisites:{' '}
                  {c.prereq_cases.map((prereq, i) => (
                    <span key={prereq}>
                      {completed.has(prereq) ? (
                        <code className="text-bleepx-blue">{prereq}</code>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/cases/${domain}/${prereq}`);
                          }}
                          className="text-bleepx-blue hover:underline"
                        >
                          <code>{prereq}</code>
                        </button>
                      )}
                      {i < c.prereq_cases!.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}