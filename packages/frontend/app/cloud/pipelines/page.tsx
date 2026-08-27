'use client';

import React from 'react';
import Link from 'next/link';
import CloudPipelineCanvas from '@/components/CloudPipelineCanvas';
import BleepxLogo from '@/components/BleepxLogo';

export default function CloudPipelinesPage() {
  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-12">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Pipelines</span>
      </nav>

      <CloudPipelineCanvas />

      <div className="text-center text-[10px] text-bleepx-text-secondary">
        <BleepxLogo /> Data pipelines are the glue between BleepxQuery, BleepxLab, and BleepxCloud.
      </div>
    </main>
  );
}
