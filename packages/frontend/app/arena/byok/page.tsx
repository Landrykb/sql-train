'use client';

import { useEffect, useState } from 'react';
import { track, Events } from '@/lib/analytics';
import { finishByokConnect, rawQueryParam } from '@/lib/arena/byok';

// OAuth callback for the "connect your own brain" flow — exchanges the
// OpenRouter code for a scoped key (browser-only) and returns to the arena.
export default function ByokCallbackPage() {
  const [status, setStatus] = useState('Connecting your brain…');
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
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('Connected — back to the arena.');
        track(Events.BYOK_CONNECTED);
        window.location.href = '/arena';
      } else {
        const detail = [result.status ? `HTTP ${result.status}` : null, result.error]
          .filter(Boolean)
          .join(': ');
        console.error('[byok] connect failed:', detail);
        setStatus(
          `Authorization failed${detail ? ` (${detail})` : ''} — try again, or paste an OpenRouter key in the arena. (code: ${code.slice(0, 6)}…${code.slice(-3)}, len ${code.length})`,
        );
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1C2129' }}>
      <p className="text-sm text-slate-300">{status}</p>
    </div>
  );
}
