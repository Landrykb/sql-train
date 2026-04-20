'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getGitHubUser, startGitHubLogin, AUTH_CHANGE_EVENT } from '@/lib/authClient';
import { track, Events } from '@/lib/analytics';
import { BleepxFace } from './BleepxIcons';

interface SignInGateProps {
  open: boolean;
  onClose: () => void;
  /** Short description of what they're trying to do, e.g. "run this SQL" */
  action?: string;
}

export default function SignInGate({ open, onClose, action }: SignInGateProps) {
  useEffect(() => {
    if (open) track(Events.AUTH_SIGN_IN_GATE_SHOWN, { action });
  }, [open, action]);

  if (!open) return null;

  const handleSignIn = async () => {
    track(Events.AUTH_SIGN_IN_START, { from: 'gate', action });
    await startGitHubLogin();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bleepx-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex justify-center"><BleepxFace size={48} /></div>
        <h2 className="text-xl font-bold text-bleepx-text mb-2">Sign in to continue</h2>
        <p className="text-sm text-bleepx-text-secondary mb-5">
          *bleep* You can browse everything freely, but to <strong>{action || 'solve challenges'}</strong> we need you to sign in with GitHub.
          This lets us save your progress, award points, and push your work to your own repo.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSignIn}
            className="w-full px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
            Sign in with GitHub
          </button>
          <button onClick={onClose} className="w-full px-5 py-2 rounded-full text-bleepx-text-secondary text-xs hover:text-bleepx-text transition-colors">
            Maybe later — keep browsing
          </button>
        </div>
        <p className="text-[10px] text-bleepx-text-secondary mt-4">
          By signing in you agree to our{' '}
          <Link href="/terms" className="underline">Terms</Link> and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
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
    setUser(getGitHubUser());
    const handler = () => setUser(getGitHubUser());
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
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
