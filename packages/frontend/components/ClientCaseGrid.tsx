// components/ClientCaseGrid.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/lib/useProgress';
import { caseOrder, hiddenCaseOrder } from '@/lib/constants';

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
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-bleepx-blue text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded ${filter === 'completed' ? 'bg-bleepx-blue text-white' : 'bg-gray-200'}`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('locked')}
          className={`px-4 py-2 rounded ${filter === 'locked' ? 'bg-bleepx-blue text-white' : 'bg-gray-200'}`}
        >
          Locked
        </button>
        <button
          onClick={() => setFilter('hidden')}
          className={`px-4 py-2 rounded ${filter === 'hidden' ? 'bg-amber-500 text-white' : 'bg-gray-200'}`}
        >
          Bonus
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCases.map((c, index) => {
          const isHidden = hiddenIds.has(c.id) || c.hidden;
          const isFirstCase = index === 0 && !isHidden;
          const locked = !isFirstCase && !isUnlocked(c.prereq_cases || []);
          const hiddenLocked = isHidden && !allRegularComplete;
          const isEffectivelyLocked = locked || hiddenLocked;
          const isNext = c.id === nextCaseId && !isEffectivelyLocked && !completed.has(c.id);

          if (isHidden && hiddenLocked) {
            return (
              <div
                key={c.id}
                className="block p-6 rounded-lg shadow-md bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400 border border-gray-700 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[url('/bleepx-logo.png')] bg-center bg-no-repeat opacity-5 bg-contain" />
                <div className="relative">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-300">??? Hidden Challenge</h3>
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
                block p-6 rounded-lg shadow-md transition-all duration-200
                ${
                  isEffectivelyLocked
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-75'
                    : isHidden && !completed.has(c.id)
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 shadow-amber-200/50 shadow-lg hover:shadow-amber-300/50'
                    : isHidden && completed.has(c.id)
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-500'
                    : isNext
                    ? 'bg-bleepx-blue/10 border-l-4 border-bleepx-blue'
                    : completed.has(c.id)
                    ? 'bg-bleepx-pink/10 border-l-4 border-bleepx-pink'
                    : 'bg-white hover:bg-bleepx-blue/5'
                }
              `}
              aria-disabled={isEffectivelyLocked}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-bleepx-gray">{c.name}</h3>
                <div className="flex items-center gap-2">
                  {isHidden && (
                    <span className="text-amber-500 text-xs font-bold px-2 py-1 bg-amber-100 rounded-full">BONUS</span>
                  )}
                  {completed.has(c.id) && (
                    <span className="text-bleepx-blue text-sm" aria-label="Completed">
                      ✓ (+{10 * c.tier} Points)
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-bleepx-gray mt-1">
                {isHidden ? 'Real-World Scenario' : `Tier ${c.tier}`}
              </div>
              <div className="text-sm text-bleepx-gray mt-2">
                <strong>Skills:</strong>{' '}
                {c.skills.map((skill) => (
                  <span
                    key={skill}
                    className={`inline-block text-xs px-2 py-1 rounded mr-1 ${
                      isHidden
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-bleepx-blue/10 text-bleepx-gray'
                    }`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {isNext && (
                <p className="text-sm text-bleepx-blue mt-2">Bleepx says: Tackle this next, human!</p>
              )}
              {isEffectivelyLocked && c.prereq_cases && c.prereq_cases.length > 0 && (
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