'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavAuth from '@/components/NavAuth';
import { verseFromPath, setActiveVerse } from '@/lib/verse';

export default function NavHeader() {
  const pathname = usePathname();
  const isLab = pathname.startsWith('/lab');
  const isCloud = pathname.startsWith('/cloud');

  useEffect(() => {
    const v = verseFromPath(pathname);
    if (v) setActiveVerse(v);
  }, [pathname]);

  const homeHref = isLab ? '/lab' : isCloud ? '/cloud' : '/';
  const brand = isLab ? 'BleepxLab' : isCloud ? 'BleepxCloud' : 'BleepxQuery';
  const brandColor = isLab
    ? 'text-teal-700 dark:text-teal-400'
    : isCloud
      ? 'text-sky-700 dark:text-sky-400'
      : 'text-bleepx-text';

  return (
    <header className="bg-bleepx-white shadow-sm dark:shadow-gray-900/30 sticky top-0 z-40 border-b border-transparent dark:border-bleepx-border">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-2 sm:gap-3">
          <picture>
            <source srcSet="/bleepx-logo.png" type="image/svg+xml" />
            <span className="text-bleepx-blue font-bold inline-block h-6 leading-6">
              Bleepx
            </span>
          </picture>
          <h1 className={`text-base sm:text-xl font-semibold ${brandColor}`}>
            {brand}
          </h1>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link href="/dashboard" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-violet-600 font-semibold text-sm sm:text-base transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          {isCloud ? (
            <>
              <Link href="/cloud/trials" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-sm sm:text-base transition-colors">
                <span aria-hidden>⚡</span>
                <span className="hidden sm:inline">Trials</span>
              </Link>
              <Link href="/cloud/guide" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-sm sm:text-base transition-colors">
                <span aria-hidden>📖</span>
                <span className="hidden sm:inline">Guide</span>
              </Link>
              <Link href="/" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-xs transition-colors">
                <span className="hidden sm:inline">🔷 SQL</span>
              </Link>
            </>
          ) : isLab ? (
            <>
              <Link href="/lab" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-sm sm:text-base transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <span className="hidden sm:inline">Projects</span>
              </Link>
              <Link href="/lab/guide" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-sm sm:text-base transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <span className="hidden sm:inline">Guide</span>
              </Link>
              <Link href="/" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-xs transition-colors">
                <span className="hidden sm:inline">SQL →</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/cases/trials" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-sm sm:text-base transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span className="hidden sm:inline">Trials</span>
              </Link>
              <Link href="/lab" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-xs transition-colors">
                <span className="hidden sm:inline">🔬 Lab</span>
              </Link>
              <Link href="/cloud" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-xs transition-colors">
                <span className="hidden sm:inline">☁️ Cloud</span>
              </Link>
            </>
          )}
          <NavAuth />
        </nav>
      </div>
    </header>
  );
}
