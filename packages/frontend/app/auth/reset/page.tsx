'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { BleepxFace } from '@/components/BleepxIcons';
import PasswordStrength, { checkPassword } from '@/components/PasswordStrength';

// Password reset — accepts either a token_hash (works on any device) or a
// PKCE ?code= (same-browser flow). Then lets the user set a new password.
export default function AuthResetPage() {
  const params = useSearchParams();
  const [stage, setStage] = useState<'verifying' | 'ready' | 'done' | 'error'>('verifying');
  const [err, setErr] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) { setErr('Auth unavailable.'); setStage('error'); return; }
      const tokenHash = params.get('token_hash');
      const code = params.get('code');
      try {
        if (tokenHash) {
          const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (error) throw error;
        } else if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { data: { session } } = await sb.auth.getSession();
          if (!session) throw new Error('no session');
        }
        setStage('ready');
      } catch {
        setErr('That reset link is expired or already used — request a fresh one.');
        setStage('error');
      }
    })();
  }, [params]);

  const handleSubmit = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    if (!checkPassword(pw).ok) { setErr('Password needs 8+ characters and can\'t be a common one.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) setErr(error.message);
    else setStage('done');
  };

  const Eye = (
    <button type="button" onClick={() => setShowPw(!showPw)} aria-label="toggle password"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-bleepx-text-secondary hover:text-bleepx-text">
      {showPw ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-bleepx-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-4 flex justify-center"><BleepxFace size={48} /></div>
        {stage === 'verifying' && (
          <>
            <h1 className="text-xl font-bold text-bleepx-text mb-2">Verifying link…</h1>
            <p className="text-sm text-bleepx-text-secondary">*bleep* Checking your reset link.</p>
          </>
        )}
        {stage === 'error' && (
          <>
            <h1 className="text-xl font-bold text-bleepx-text mb-2">Link expired</h1>
            <p className="text-sm text-bleepx-text-secondary mb-5">{err}</p>
            <Link href="/" className="inline-block px-5 py-3 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-blue-700 transition-colors">
              Back home — try again
            </Link>
          </>
        )}
        {stage === 'ready' && (
          <>
            <h1 className="text-xl font-bold text-bleepx-text mb-2">Set a new password</h1>
            <div className="flex flex-col gap-2 mt-4 text-left">
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)}
                  placeholder="new password (8+ chars)"
                  className="w-full px-3 py-2.5 pr-10 rounded-full border border-bleepx-border text-sm text-bleepx-text bg-transparent" />
                {Eye}
              </div>
              <PasswordStrength password={pw} />
              <input type={showPw ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="confirm password"
                className="w-full px-3 py-2.5 rounded-full border border-bleepx-border text-sm text-bleepx-text bg-transparent" />
              <button onClick={handleSubmit}
                className={`w-full px-4 py-2.5 rounded-full border text-sm font-bold transition-colors ${
                  checkPassword(pw).ok && pw === pw2
                    ? 'bg-bleepx-blue border-bleepx-blue text-white hover:bg-blue-700'
                    : 'border-bleepx-border text-bleepx-text-secondary'
                }`}>
                Update password
              </button>
              {err && <p className="text-xs text-red-500">{err}</p>}
            </div>
          </>
        )}
        {stage === 'done' && (
          <>
            <h1 className="text-xl font-bold text-bleepx-text mb-2">Password updated</h1>
            <p className="text-sm text-bleepx-text-secondary mb-5">You&apos;re signed in — new password saved.</p>
            <Link href="/" className="inline-block px-5 py-3 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-blue-700 transition-colors">
              Back home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
