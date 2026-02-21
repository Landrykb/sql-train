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
}

export default function ClientSQLPlayground({ caseData }: ClientSQLPlaygroundProps) {
  const { completed, points } = useProgress();

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <img src="/bleepx-icon.png" alt="Bleepx" className="h-6 w-6 animate-pulse-logo" />
        <h2 className="text-xl font-semibold text-bleepx-gray">{caseData.name}</h2>
      </div>
      <p className="text-bleepx-gray mb-4">{caseData.description}</p>
      <SQLPlayground caseData={caseData} />
      {completed.has(caseData.id) && (
        <div className="mt-4 p-4 bg-gradient-to-r from-bleepx-blue/20 to-bleepx-pink/20 text-bleepx-gray rounded-lg animate-fade-in" role="alert">
          <div className="flex items-center gap-2">
            <img src="/bleepx-icon.png" alt="Bleepx" className="h-5 w-5" />
            <span>Nice work, human! Bleepx awards you {10 * caseData.tier} points! Total: {points}</span>
          </div>
        </div>
      )}
    </div>
  );
}