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
    // Keep the code in the URL on failure (it's already spent) so the exact
    // value OpenRouter issued can be shared for debugging; strip on success.
    if (!code) {
      setStatus('No authorization code came back — close this tab and try again.');
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
