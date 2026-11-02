'use client';

import { useEffect, useState } from 'react';
import { track, Events } from '@/lib/analytics';
import { finishByokConnect, rawQueryParam } from '@/lib/arena/byok';

// OAuth callback for the "connect your own brain" flow — exchanges the
// OpenRouter code for a scoped key (browser-only) and returns to the arena.
export default function ByokCallbackPage() {
  const [status, setStatus] = useState('Connecting your brain…');

  useEffect(() => {
    track(Events.BYOK_VIEWED);
    const search = window.location.search;
    const code = rawQueryParam(search, 'code');
    const state = rawQueryParam(search, 'state');
    // Drop the single-use code from the URL so reload/back can't resend it.
    if (code) window.history.replaceState(null, '', window.location.pathname);
    if (!code) {
      setStatus('No authorization code came back — close this tab and try again.');
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
        setStatus(`Authorization failed${detail ? ` (${detail})` : ''} — close this tab and try again.`);
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1C2129' }}>
      <p className="text-sm text-slate-300">{status}</p>
    </div>
  );
}
