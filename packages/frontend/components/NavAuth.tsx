'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getGitHubUser, startGitHubLogin, AUTH_CHANGE_EVENT } from '@/lib/authClient';

export default function NavAuth() {
  const [user, setUser] = useState<{ login: string; avatar: string } | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const sync = () => {
      const gh = getGitHubUser();
      setUser(gh ? { login: gh.login, avatar: gh.avatar } : null);
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
    };
  }, []);

  if (user) {
    return (
      <Link
        href="/profile"
        className="flex items-center gap-1.5 px-3 py-2 -my-1 rounded-full text-bleepx-blue hover:text-blue-700 dark:hover:text-blue-400 hover:bg-bleepx-blue/5 font-medium text-sm sm:text-base transition-colors"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
        <span className="hidden sm:inline">Profile</span>
      </Link>
    );
  }

  return (
    <button
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (signingIn) return;
        setSigningIn(true);
        try {
          await startGitHubLogin();
        } catch {
          setSigningIn(false);
        }
      }}
      disabled={signingIn}
      className="flex items-center gap-1.5 px-3 py-2 -my-1 rounded-full bg-bleepx-blue text-white hover:bg-blue-700 font-medium text-sm transition-colors active:scale-95 touch-manipulation min-h-[44px]"
    >
      {signingIn ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" /></svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      )}
      <span>{signingIn ? 'Connecting...' : 'Sign In'}</span>
    </button>
  );
}
