'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useProgress } from '@/lib/useProgress';

const SQLPlayground = dynamic(() => import('./SQLPlayground'), { ssr: false });

interface ClientSQLPlaygroundProps {
  caseData: {
    id: string;
    name: string;
    description: string;
    instructions?: string;
    hints?: string[];
    thoughtProcess?: string[];
    skills?: string[];
    datasets: { name: string; file: string }[];
    seedQuery?: string;
    templateQuery?: string;
    expected?: any[][];
    solutionQuery?: string;
    domain: string;
    prerequisites?: string[];
    tier: number;
  };
  guideData?: any;
}

export default function ClientSQLPlayground({ caseData, guideData }: ClientSQLPlaygroundProps) {
  const { completed, points } = useProgress();

  return (
    <div className="p-6 bg-bleepx-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <img src="/bleepx-icon.png" alt="Bleepx" className="h-6 w-6 animate-pulse-logo" />
        <h2 className="text-xl font-semibold text-bleepx-gray">{caseData.name}</h2>
      </div>
      <p className="text-bleepx-gray mb-4">{caseData.description}</p>
      <SQLPlayground caseData={caseData} guideData={guideData} />
      {completed.has(caseData.id) && (
        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl animate-fade-in" role="alert">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span className="text-sm">*bleep* Mission cleared — +{10 * caseData.tier} pts awarded. Total: {points}</span>
          </div>
        </div>
      )}
    </div>
  );
}