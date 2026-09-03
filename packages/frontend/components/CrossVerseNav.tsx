'use client';

import React from 'react';
import Link from 'next/link';
import { getBridges, getDefaultBridges, VERSE_META, type CrossVerseBridge } from '@/lib/crossVerse';
import { VerseIcon } from '@/components/NavIcons';

interface CrossVerseNavProps {
  path: string;
  /** Verse to fall back to if no explicit bridge is configured. */
  currentVerse: 'query' | 'lab' | 'cloud';
  /** Optional title override. */
  title?: string;
}

export default function CrossVerseNav({ path, currentVerse, title }: CrossVerseNavProps) {
  const bridges = getBridges(path).length > 0 ? getBridges(path) : getDefaultBridges(currentVerse);

  return (
    <div className="rounded-xl border border-dashed border-bleepx-border bg-bleepx-white p-4 shadow-sm">
      <h4 className="text-sm font-bold text-bleepx-text mb-2 flex items-center gap-2">
        <span>🌉</span> {title || 'Cross-verse learning'}
      </h4>
      <p className="text-xs text-bleepx-text-secondary mb-3">
        Bleepx skills build on each other. Continue your learning path across Query, Lab, and Cloud.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {bridges.map((bridge, i) => {
          const meta = VERSE_META[bridge.verse];
          return (
            <Link
              key={i}
              href={bridge.href}
              className="group flex items-start gap-3 p-3 rounded-lg border border-bleepx-border hover:border-bleepx-blue hover:bg-sky-50 dark:hover:bg-sky-900/10 transition-colors"
            >
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${meta.color}`}>
                <VerseIcon verse={bridge.verse} size={16} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-bleepx-text group-hover:text-bleepx-blue transition-colors">
                  {meta.name}
                  <span className="ml-1.5 text-[9px] uppercase tracking-wide opacity-70">{bridge.type}</span>
                </div>
                <div className="text-[10px] text-bleepx-text-secondary leading-snug">{bridge.why}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
