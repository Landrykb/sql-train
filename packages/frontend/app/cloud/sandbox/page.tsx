'use client';

import React from 'react';
import Link from 'next/link';
import CloudSandbox from '@/components/CloudSandbox';

export default function CloudSandboxPage() {
  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-12">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Sandbox</span>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-sky-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-extrabold">☁️ BleepxCloud Sandbox</h1>
        <p className="text-white/80 text-sm mt-1">
          A free-form, browser-native AWS console. No account, no credentials, no Docker — just experiment with S3, IAM, EC2, and VPC like Floci's local cloud.
        </p>
      </div>

      <CloudSandbox freePlay />

      <div className="flex items-center justify-between text-sm text-bleepx-text-secondary">
        <Link href="/cloud/pipelines" className="text-sky-600 hover:underline font-medium">
          → Try the ETL Pipeline Canvas
        </Link>
        <Link href="/cloud" className="text-bleepx-text-secondary hover:underline">
          ← Back to Cloud
        </Link>
      </div>
    </main>
  );
}
