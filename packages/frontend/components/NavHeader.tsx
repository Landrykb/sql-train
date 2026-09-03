'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavAuth from '@/components/NavAuth';
import { DashboardIcon, TrialsIcon, GuideIcon, ProjectsIcon, VerseIcon } from '@/components/NavIcons';
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
            <DashboardIcon size={20} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          {isCloud ? (
            <>
              <Link href="/cloud/trials" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-sm sm:text-base transition-colors">
                <TrialsIcon size={20} />
                <span className="hidden sm:inline">Trials</span>
              </Link>
              <Link href="/cloud/guide" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-sm sm:text-base transition-colors">
                <GuideIcon size={20} />
                <span className="hidden sm:inline">Guide</span>
              </Link>
              <Link href="/" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-xs transition-colors">
                <VerseIcon verse="query" size={18} />
                <span className="hidden sm:inline">SQL</span>
              </Link>
            </>
          ) : isLab ? (
            <>
              <Link href="/lab" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-sm sm:text-base transition-colors">
                <ProjectsIcon size={20} />
                <span className="hidden sm:inline">Projects</span>
              </Link>
              <Link href="/lab/guide" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-sm sm:text-base transition-colors">
                <GuideIcon size={20} />
                <span className="hidden sm:inline">Guide</span>
              </Link>
              <Link href="/" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-xs transition-colors">
                <VerseIcon verse="query" size={18} />
                <span className="hidden sm:inline">SQL</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/cases/trials" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-sm sm:text-base transition-colors">
                <TrialsIcon size={20} />
                <span className="hidden sm:inline">Trials</span>
              </Link>
              <Link href="/lab" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-xs transition-colors">
                <VerseIcon verse="lab" size={18} />
                <span className="hidden sm:inline">Lab</span>
              </Link>
              <Link href="/cloud" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-xs transition-colors">
                <VerseIcon verse="cloud" size={18} />
                <span className="hidden sm:inline">Cloud</span>
              </Link>
            </>
          )}
          <NavAuth />
        </nav>
      </div>
    </header>
  );
}
