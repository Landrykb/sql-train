'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import NavAuth from '@/components/NavAuth';
import { DashboardIcon, TrialsIcon, GuideIcon, ProjectsIcon, VerseIcon } from '@/components/NavIcons';
import { verseFromPath, setActiveVerse, VERSE_THEMES, type Verse } from '@/lib/verse';

const VERSE_OPTIONS: { verse: Verse; href: string }[] = [
  { verse: 'query', href: '/' },
  { verse: 'lab', href: '/lab' },
  { verse: 'cloud', href: '/cloud' },
];

function VerseSwitcher({ current }: { current: Verse }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const theme = VERSE_THEMES[current];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full border border-bleepx-border bg-bleepx-bg text-xs sm:text-sm font-semibold transition-colors ${theme.accentText} hover:bg-bleepx-bg/80`}
        aria-label="Switch verse"
      >
        <VerseIcon verse={current} size={16} />
        <span className="hidden sm:inline">{theme.label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-white dark:bg-gray-900 border border-bleepx-border shadow-xl overflow-hidden z-50">
          {VERSE_OPTIONS.map(({ verse, href }) => {
            const active = verse === current;
            const t = VERSE_THEMES[verse];
            return (
              <Link
                key={verse}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-bleepx-bg font-semibold ' + t.accentText
                    : 'text-bleepx-text-secondary hover:bg-bleepx-bg hover:text-bleepx-text'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <VerseIcon verse={verse} size={18} className={t.accentText} />
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NavHeader() {
  const pathname = usePathname();
  const currentVerse = verseFromPath(pathname);

  useEffect(() => {
    const v = verseFromPath(pathname);
    if (v) setActiveVerse(v);
  }, [pathname]);

  const homeHref = currentVerse === 'lab' ? '/lab' : currentVerse === 'cloud' ? '/cloud' : '/';
  const brand = currentVerse ? VERSE_THEMES[currentVerse].label : 'Profile';
  const brandColor = currentVerse ? VERSE_THEMES[currentVerse].accentText : 'text-bleepx-text';

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

          {currentVerse === 'cloud' ? (
            <>
              <Link href="/cloud/trials" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-sm sm:text-base transition-colors">
                <TrialsIcon size={20} />
                <span className="hidden sm:inline">Trials</span>
              </Link>
              <Link href="/cloud/guide" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-sky-600 font-semibold text-sm sm:text-base transition-colors">
                <GuideIcon size={20} />
                <span className="hidden sm:inline">Guide</span>
              </Link>
            </>
          ) : currentVerse === 'lab' ? (
            <>
              <Link href="/lab" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-sm sm:text-base transition-colors">
                <ProjectsIcon size={20} />
                <span className="hidden sm:inline">Projects</span>
              </Link>
              <Link href="/lab/guide" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-teal-600 font-semibold text-sm sm:text-base transition-colors">
                <GuideIcon size={20} />
                <span className="hidden sm:inline">Guide</span>
              </Link>
            </>
          ) : currentVerse === 'query' ? (
            <Link href="/cases/trials" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-sm sm:text-base transition-colors">
              <TrialsIcon size={20} />
              <span className="hidden sm:inline">Trials</span>
            </Link>
          ) : null}

          {currentVerse && <><div className="h-6 w-px bg-bleepx-border hidden sm:block" /><VerseSwitcher current={currentVerse} /></>}
          <NavAuth />
        </nav>
      </div>
    </header>
  );
}
