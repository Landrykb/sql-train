// Tracks the user's last-active "verse" so shared routes (e.g. /profile)
// can theme themselves correctly. The verse is otherwise derived purely
// from the URL prefix, which does not work for shared pages.

export type Verse = 'query' | 'lab' | 'cloud';

const VERSE_KEY = 'bleepx_active_verse';

export function verseFromPath(pathname: string | null | undefined): Verse | null {
  if (!pathname) return null;
  if (pathname.startsWith('/lab')) return 'lab';
  if (pathname.startsWith('/cloud')) return 'cloud';
  if (pathname === '/' || pathname.startsWith('/cases')) return 'query';
  return null;
}

export function setActiveVerse(verse: Verse) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VERSE_KEY, verse);
  } catch {
    /* ignore */
  }
}

export function getActiveVerse(): Verse {
  if (typeof window === 'undefined') return 'query';
  try {
    const v = window.localStorage.getItem(VERSE_KEY);
    if (v === 'query' || v === 'lab' || v === 'cloud') return v;
  } catch {
    /* ignore */
  }
  return 'query';
}

export interface VerseTheme {
  label: string;
  // Tailwind gradient stops for banners / accents
  gradient: string;
  // Solid accent color classes for links/badges
  accentBg: string;
  accentText: string;
  accentHover: string;
}

export const VERSE_THEMES: Record<Verse, VerseTheme> = {
  query: {
    label: 'BleepxQuery',
    gradient: 'from-bleepx-blue via-indigo-600 to-bleepx-pink',
    accentBg: 'bg-bleepx-blue/10 dark:bg-bleepx-blue/20',
    accentText: 'text-bleepx-blue dark:text-blue-400',
    accentHover: 'hover:bg-bleepx-blue/20 dark:hover:bg-bleepx-blue/30',
  },
  lab: {
    label: 'BleepxLab',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    accentBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    accentText: 'text-teal-600 dark:text-teal-400',
    accentHover: 'hover:bg-teal-500/20 dark:hover:bg-teal-500/30',
  },
  cloud: {
    label: 'BleepxCloud',
    gradient: 'from-sky-600 via-blue-600 to-indigo-700',
    accentBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    accentText: 'text-sky-600 dark:text-sky-400',
    accentHover: 'hover:bg-sky-500/20 dark:hover:bg-sky-500/30',
  },
};
