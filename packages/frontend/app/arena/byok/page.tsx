'use client';

import { useEffect, useState } from 'react';
import { finishByokConnect } from '@/lib/arena/byok';

// OAuth callback for the "connect your own brain" flow — exchanges the
// OpenRouter code for a scoped key (browser-only) and returns to the arena.
export default function ByokCallbackPage() {
  const [status, setStatus] = useState('Connecting your brain…');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setStatus('No authorization code came back — close this tab and try again.');
      return;
    }
    finishByokConnect(code).then((ok) => {
      if (ok) {
        setStatus('Connected — back to the arena.');
        window.location.href = '/arena';
      } else {
        setStatus('Authorization failed — close this tab and try again.');
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1C2129' }}>
      <p className="text-sm text-slate-300">{status}</p>
    </div>
  );
}
