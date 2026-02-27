'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function CaseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CasePage] Error:', error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto p-8 bg-bleepx-bg min-h-screen">
      <div className="rounded-xl shadow-lg p-6 bg-bleepx-white border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Failed to load challenge</h2>
            <p className="text-sm text-bleepx-text-secondary mt-1">
              *bleep* Something went wrong loading this page. The dataset might be too large for your browser.
            </p>
          </div>
        </div>
        <p className="text-xs font-mono text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-3 mb-4">
          {error.message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-full bg-bleepx-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            🔄 Try Again
          </button>
          <Link href="/cases" className="px-4 py-2 rounded-full border border-bleepx-border text-bleepx-text text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            ← Back to Cases
          </Link>
        </div>
      </div>
    </div>
  );
}
