'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { initAnalytics, track, Events, hasAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics';

/** Initializes PostHog on mount + renders a small consent banner (first visit only). */
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    initAnalytics();
    // Show banner if user has never made a choice
    try {
      const v = localStorage.getItem('bleepx_analytics_consent');
      if (v === null) setShowBanner(true);
    } catch { /* ignore */ }
    // Track initial page view
    track(Events.PAGE_VIEW, { path: window.location.pathname });
  }, []);

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
