'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getGitHubUser, startGitHubLogin, AUTH_CHANGE_EVENT } from '@/lib/authClient';
import { BleepxGitHub } from '@/components/BleepxIcons';

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
        <BleepxGitHub size={18} />
      )}
      <span>{signingIn ? 'Connecting...' : 'Sign In'}</span>
    </button>
  );
}
