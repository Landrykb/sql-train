'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { cloudGuide, GUIDE_PROVIDERS } from '@/lib/cloud/guide';

const providerEmoji: Record<string, string> = {
  general: '🧭',
  aws: '☁️',
  azure: '🔷',
  gcp: '🌐',
  esg: '🌱',
};

export default function CloudGuidePage() {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cloudGuide.filter((g) => {
      if (provider !== 'all' && g.provider !== provider) return false;
      if (!q) return true;
      return g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
    });
  }, [query, provider]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof cloudGuide>();
    for (const g of filtered) {
      if (!map.has(g.category)) map.set(g.category, []);
      map.get(g.category)!.push(g);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <main className="max-w-3xl mx-auto px-2 md:px-4 py-4 space-y-5 bg-bleepx-bg min-h-screen pb-12">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Cloud Guide</span>
      </nav>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-sky-700 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold">📖 Cloud Reference Guide</h1>
          <p className="text-white/85 text-sm mt-1">Every concept you need — searchable, plain-English, exam-aligned.</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-4 shadow-sm space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms, e.g. VPC, Scope 3, BigQuery..."
          className="w-full px-4 py-2.5 rounded-lg border border-bleepx-border bg-bleepx-bg text-bleepx-text text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setProvider('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${provider === 'all' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary'}`}>All</button>
          {GUIDE_PROVIDERS.map((p) => (
            <button key={p} onClick={() => setProvider(p)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${provider === p ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary'}`}>
              {providerEmoji[p]} {p === 'general' ? 'General' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      {grouped.length === 0 ? (
        <p className="text-center text-sm text-bleepx-text-secondary py-8">No matching terms. Try another search.</p>
      ) : (
        grouped.map(([category, entries]) => (
          <section key={category} className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-bleepx-text-secondary">{category}</h2>
            <div className="space-y-2">
              {entries.map((g) => (
                <div key={g.term} className="bg-bleepx-white rounded-xl border border-bleepx-border p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{providerEmoji[g.provider] || '🧭'}</span>
                    <h3 className="font-bold text-bleepx-text">{g.term}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary uppercase">{g.provider}</span>
                  </div>
                  <p className="text-sm text-bleepx-text-secondary leading-relaxed">{g.definition}</p>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="flex gap-4 pt-2">
        <Link href="/cloud" className="text-sm text-sky-600 hover:underline font-medium">← BleepxCloud</Link>
        <Link href="/cloud/trials" className="text-sm text-bleepx-text-secondary hover:underline font-medium">⚡ Test yourself in Trials</Link>
      </div>
    </main>
  );
}
