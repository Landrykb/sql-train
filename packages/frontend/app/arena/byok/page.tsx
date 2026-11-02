'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track, Events } from '@/lib/analytics';
import { finishByokConnect, rawQueryParam } from '@/lib/arena/byok';

// OAuth callback for the "connect your own brain" flow — exchanges the
// OpenRouter code for a scoped key (browser-only) and returns to the arena.
export default function ByokCallbackPage() {
  const [status, setStatus] = useState('Connecting your brain…');
  const [failed, setFailed] = useState(false);
  // Read the code during RENDER — before any effect runs. AnalyticsProvider's
  // mount effect rewrites `?code=` to REDACTED, so an effect that reads the URL
  // can already be too late (the exchange then fails with 400 "Invalid code").
  const [params] = useState(() => {
    if (typeof window === 'undefined') return { code: null as string | null, state: null as string | null };
    const search = window.location.search;
    return { code: rawQueryParam(search, 'code'), state: rawQueryParam(search, 'state') };
  });
  const { code, state } = params;

  useEffect(() => {
    track(Events.BYOK_VIEWED);
    // Single-use credential: never leave it in the URL/history.
    window.history.replaceState(null, '', window.location.pathname);
    if (!code) {
      setStatus('No authorization code came back — close this tab and try again.');
      return;
    }
    // The shared analytics provider rewrites `?code=` to REDACTED on mount —
    // a reload of this page must not send that placeholder to the exchange.
    if (code === 'REDACTED') {
      setStatus('This callback was already handled — back to the arena to check your connection.');
      return;
    }
    finishByokConnect(code, state).then((result) => {
      if (result.ok) {
        setStatus('Connected — back to the arena.');
        track(Events.BYOK_CONNECTED);
        window.location.href = '/arena';
      } else {
        const detail = [result.status ? `HTTP ${result.status}` : null, result.error]
          .filter(Boolean)
          .join(': ');
        console.error('[byok] connect failed:', detail);
        setFailed(true);
        setStatus(
          `Authorization failed${detail ? ` (${detail})` : ''} — try again, or paste an OpenRouter key in the arena.`,
        );
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1C2129' }}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-slate-300">{status}</p>
        {failed && (
          <Link
            href="/arena"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0d1117] transition active:scale-95"
          >
            Back to the arena
          </Link>
        )}
      </div>
    </div>
  );
}
