'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { initAnalytics, capturePageview, setAnalyticsConsent } from '@/lib/analytics';
import { scrubCurrentUrl } from '@/lib/sanitizeUrl';
import { migrateLegacyStoredToken } from '@/lib/authClient';

/** Initializes PostHog on mount + renders a small consent banner (first visit only). */
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const pathname = usePathname();

  // One-time init. We intentionally scrub the URL *before* PostHog boots so no
  // OAuth hash/query parameter ever reaches posthog.init's autoloaded pageview.
  useEffect(() => {
    // Defense-in-depth: strip tokens from the current URL before anything else.
    // NOTE: Supabase PKCE callback reads `code` via `exchangeCodeForSession` on
    // the dedicated /auth/callback page, which handles its own scrubbing after
    // the exchange. Everywhere else, a stray ?code / #access_token is noise
    // we should erase immediately.
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/callback')) {
      scrubCurrentUrl();
    }
    // One-shot: scrub any legacy GitHub token left in bleepx_github_user by
    // older builds (before we moved tokens into the Supabase session only).
    migrateLegacyStoredToken();
    initAnalytics();
    try {
      const v = localStorage.getItem('bleepx_analytics_consent');
      if (v === null) setShowBanner(true);
    } catch { /* ignore */ }
  }, []);

  // Manual pageview on every client-side navigation (sanitized).
  useEffect(() => {
    if (!pathname) return;
    capturePageview(pathname);
  }, [pathname]);

  const accept = () => {
    setAnalyticsConsent(true);
    setShowBanner(false);
  };
  const decline = () => {
    setAnalyticsConsent(false);
    setShowBanner(false);
  };

  return (
    <>
      {children}
      {showBanner && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-50 bg-bleepx-white border border-bleepx-border rounded-2xl shadow-lg p-4 text-sm">
          <p className="text-bleepx-text font-medium mb-1">🍪 A tiny *bleep* about privacy</p>
          <p className="text-xs text-bleepx-text-secondary mb-3">
            We use anonymous analytics to understand which challenges help learners most. No personal data, no selling, no ads.{' '}
            <Link href="/privacy" className="underline text-teal-600">Read more</Link>.
          </p>
          <div className="flex gap-2">
            <button onClick={accept} className="flex-1 px-3 py-1.5 rounded-full bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors">Accept</button>
            <button onClick={decline} className="flex-1 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-bleepx-text text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Decline</button>
          </div>
        </div>
      )}
    </>
  );
}
