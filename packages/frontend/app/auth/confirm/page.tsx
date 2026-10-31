'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { BleepxFace } from '@/components/BleepxFace';

// Verifies email links via token_hash — works on ANY device/browser,
// unlike the PKCE code exchange which is bound to the requesting browser.
const TYPES = ['email', 'signup', 'magiclink'] as const;

export default function AuthConfirmPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const sb = getSupabaseBrowserClient();
      const tokenHash = params.get('token_hash');
      if (!sb || !tokenHash) {
        setMsg('Invalid or expired link — request a fresh one.');
        setStatus('error');
        return;
      }
      const preferred = params.get('type') || '';
      const order = [preferred, ...TYPES].filter((t, i, a) => a.indexOf(t) === i);
      let lastErr = '';
      for (const t of order) {
        const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: t as typeof TYPES[number] });
        if (!error) { window.location.replace('/'); return; }
        lastErr = error.message;
      }
      setMsg(lastErr || 'Link expired — request a fresh one.');
      setStatus('error');
    })();
  }, [params]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-bleepx-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-4 flex justify-center"><BleepxFace size={48} /></div>
        {status === 'verifying' ? (
          <>
            <h1 className="text-xl font-bold text-bleepx-text mb-2">Signing you in…</h1>
            <p className="text-sm text-bleepx-text-secondary">*bleep* Verifying your email link.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-bleepx-text mb-2">Couldn&apos;t sign you in</h1>
            <p className="text-sm text-bleepx-text-secondary mb-5">{msg}</p>
            <Link href="/" className="inline-block px-5 py-3 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-blue-700 transition-colors">
              Back home — try again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
