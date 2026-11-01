'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getGitHubUser, startGitHubLogin, setProviderTokenCookie, AUTH_CHANGE_EVENT } from '@/lib/authClient';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import PasswordStrength, { checkPassword } from './PasswordStrength';
import { track, Events } from '@/lib/analytics';
import { BleepxFace } from './BleepxIcons';
import { Skeleton, SkeletonButton } from './Skeleton';

const SpinnerIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
  </svg>
);

interface SignInGateProps {
  open: boolean;
  onClose: () => void;
  /** Short description of what they're trying to do, e.g. "run this SQL" */
  action?: string;
}

export default function SignInGate({ open, onClose, action }: SignInGateProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      track(Events.AUTH_SIGN_IN_GATE_SHOWN, { action });
      setIsLoading(false);
    }
  }, [open, action]);

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPw, setShowPw] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState('');

  if (!open) return null;

  const handleEmailSignIn = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !email.trim()) return;
    setEmailErr('');
    setBusy('link');
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    }).finally(() => setBusy(''));
    if (error) setEmailErr(error.message);
    else { setEmailSent(true); track(Events.AUTH_SIGN_IN_START, { from: 'gate', method: 'email' }); }
  };

  const handleEmailAuth = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !email.trim() || password.length < 6) return;
    setEmailErr('');
    setBusy('auth');
    if (mode === 'signin') {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password }).finally(() => setBusy(''));
      if (error) setEmailErr(error.message === 'Invalid login credentials' ? 'Wrong email or password — or create an account below.' : error.message);
      else onClose();
    } else {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      }).finally(() => setBusy(''));
      if (error) setEmailErr(error.message);
      else if (data.session) onClose();
      else setEmailSent(true); // email-confirm required → show link/code path
    }
  };

  const handleForgot = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !email.trim()) { setEmailErr('Enter your email first.'); return; }
    setEmailErr('');
    setBusy('forgot');
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    }).finally(() => setBusy(''));
    if (error) setEmailErr(error.message);
    else setResetSent(true);
  };

  const handleVerifyOtp = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !otp.trim()) return;
    setEmailErr('');
    setBusy('otp');
    // 'email' covers magic-link codes; 'signup' covers new-account confirmations.
    let { error } = await sb.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'email' });
    if (error) ({ error } = await sb.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'signup' }));
    setBusy('');
    if (error) setEmailErr(error.message);
    else onClose();
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    track(Events.AUTH_SIGN_IN_START, { from: 'gate', action });
    await startGitHubLogin();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bleepx-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <>
            <div className="mx-auto mb-3 flex justify-center">
              <Skeleton variant="circular" width={48} height={48} />
            </div>
            <Skeleton width="60%" height={24} className="mx-auto mb-2" />
            <Skeleton width="90%" height={16} className="mx-auto mb-5" />
            <SkeletonButton height={48} />
            <Skeleton width="40%" height={20} className="mx-auto mt-2" />
            <Skeleton width="80%" height={12} className="mx-auto mt-4" />
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex justify-center"><BleepxFace size={48} /></div>
            <h2 className="text-xl font-bold text-bleepx-text mb-2">Sign in to continue</h2>
            <p className="text-sm text-bleepx-text-secondary mb-5">
              *bleep* You can browse and run everything freely — to <strong>{action || 'solve challenges'}</strong> we ask you to sign in.
              New or returning — same flow, no password. Your progress saves and syncs; GitHub also lets you push your work to your own repo.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSignIn}
                className="w-full px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
                Sign in with GitHub
              </button>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-bleepx-border" />
                <span className="text-[10px] text-bleepx-text-secondary">or</span>
                <div className="h-px flex-1 bg-bleepx-border" />
              </div>
              {emailSent ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-bleepx-text">Check your inbox — we sent a link + code to <strong>{email}</strong>. Open it <strong>in this same browser</strong>, or type/paste the 8-digit code:</p>
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && otp.length === 8) handleVerifyOtp(); }}
                        className="absolute inset-0 w-full opacity-0 cursor-text"
                        aria-label="verification code"
                        autoFocus
                      />
                      <div className="flex gap-1.5 pointer-events-none">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className={`relative w-8 h-11 rounded-xl border flex items-center justify-center text-base font-bold transition-all ${
                              otp[i]
                                ? 'border-bleepx-blue bg-bleepx-blue/5 text-bleepx-text'
                                : i === otp.length
                                  ? 'border-bleepx-blue ring-2 ring-bleepx-blue/30 text-bleepx-text-secondary'
                                  : 'border-bleepx-border text-bleepx-text-secondary'
                            }`}
                          >
                            {otp[i] || (i === otp.length && <span className="w-0.5 h-5 bg-bleepx-blue animate-pulse rounded-full" />)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleVerifyOtp}
                      disabled={busy !== ''}
                      className={`w-full px-4 py-2.5 rounded-full border text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                        otp.length === 8
                          ? 'bg-bleepx-blue border-bleepx-blue text-white hover:bg-blue-700'
                          : 'border-bleepx-border text-bleepx-text-secondary'
                      }`}
                    >
                      {busy === 'otp' ? (<><SpinnerIcon /> Verifying…</>) : 'Verify'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-3 py-2.5 rounded-full border border-bleepx-border text-sm text-bleepx-text bg-transparent"
                  />
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && email.trim() && password.length >= 6) handleEmailAuth(); }}
                      placeholder={mode === 'signin' ? 'password' : 'choose a password (8+ chars)'}
                      className="w-full px-3 py-2.5 pr-10 rounded-full border border-bleepx-border text-sm text-bleepx-text bg-transparent"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} aria-label="show password"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-bleepx-text-secondary hover:text-bleepx-text">
                      {showPw ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {mode === 'signup' && <PasswordStrength password={password} email={email} />}
                  <button
                    onClick={handleEmailAuth}
                    disabled={busy !== ''}
                    className={`w-full px-4 py-2.5 rounded-full border text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                      email.trim() && (mode === 'signin' ? password.length >= 6 : checkPassword(password, email).ok)
                        ? 'bg-bleepx-blue border-bleepx-blue text-white hover:bg-blue-700'
                        : 'border-bleepx-border text-bleepx-text-secondary'
                    }`}
                  >
                    {busy === 'auth' ? (<><SpinnerIcon /> Working…</>) : mode === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setEmailErr(''); }}
                      className="text-[11px] text-bleepx-text-secondary hover:text-bleepx-text transition-colors"
                    >
                      {mode === 'signin' ? 'New here? Create account' : 'Have an account? Sign in'}
                    </button>
                    <span className="flex gap-3">
                      {mode === 'signin' && (
                        <button
                          onClick={handleForgot}
                          className="text-[11px] text-bleepx-text-secondary hover:text-bleepx-text transition-colors underline"
                        >
                          {busy === 'forgot' ? (<span className="inline-flex items-center gap-1"><SpinnerIcon className="w-3 h-3" /> sending…</span>) : 'forgot password?'}
                        </button>
                      )}
                      <button
                        onClick={() => { if (email.trim()) handleEmailSignIn(); }}
                        className="text-[11px] text-bleepx-text-secondary hover:text-bleepx-text transition-colors underline"
                      >
                        {busy === 'link' ? (<span className="inline-flex items-center gap-1"><SpinnerIcon className="w-3 h-3" /> sending…</span>) : 'email me a link instead'}
                      </button>
                    </span>
                  </div>
                </div>
              )}
              {resetSent && <p className="text-xs text-emerald-600">Reset email sent — open the link and choose a new password.</p>}
              {emailErr && <p className="text-xs text-red-500">{emailErr}</p>}
              <button onClick={onClose} className="w-full px-5 py-2 rounded-full text-bleepx-text-secondary text-xs hover:text-bleepx-text transition-colors">
                Maybe later — keep browsing
              </button>
            </div>
            <p className="text-xs text-bleepx-text-secondary mt-4">
              By signing in you agree to our{' '}
              <Link href="/terms" className="underline">Terms</Link> and{' '}
              <Link href="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Hook that returns `{ user, requireAuth }`. Call `requireAuth()` before a gated action;
 * returns true if user is signed in, otherwise triggers the gate and returns false. */
export function useAuthGate() {
  const [user, setUser] = useState<ReturnType<typeof getGitHubUser>>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateAction, setGateAction] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    
    const loadUser = async () => {
      // Check both localStorage (legacy) and Supabase session (current)
      const localUser = getGitHubUser();
      if (localUser?.login && mounted) {
        setUser(localUser);
        return;
      }
      
      // Fall back to Supabase session
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase');
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session?.user) {
          const u = session.user;
          const ghUser = {
            login: u.user_metadata?.user_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
            avatar: u.user_metadata?.avatar_url || '',
            email: u.email || '',
          };
          setUser(ghUser);
          // Sync to localStorage for backward compatibility and to the secure
          // provider-token cookie so GitHub exports can read it immediately.
          const { setGitHubUser } = await import('@/lib/authClient');
          setGitHubUser(ghUser);
          if (session.provider_token) setProviderTokenCookie(session.provider_token);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[useAuthGate] Failed to load user from Supabase:', err);
      }
    };

    loadUser();

    // Listen for auth state changes
    const handler = () => {
      loadUser();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);

    // Also listen for the sync cookie from OAuth callback
    const checkSyncCookie = () => {
      if (document.cookie.includes('bleepx_auth_sync=true')) {
        loadUser();
        // Clear the cookie after processing
        document.cookie = 'bleepx_auth_sync=; Max-Age=-1; path=/; secure; samesite=lax';
      }
    };
    const syncInterval = setInterval(checkSyncCookie, 1000);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
      clearInterval(syncInterval);
    };
  }, []);

  const requireAuth = useCallback((action?: string): boolean => {
    const current = getGitHubUser();
    if (current?.login) return true;
    setGateAction(action);
    setGateOpen(true);
    return false;
  }, []);

  const GateComponent = useCallback(() => (
    <SignInGate open={gateOpen} onClose={() => setGateOpen(false)} action={gateAction} />
  ), [gateOpen, gateAction]);

  return { user, requireAuth, GateComponent, isSignedIn: !!user?.login };
}
