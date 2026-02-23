'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getGitHubUser, startGitHubLogin, AUTH_CHANGE_EVENT } from '@/lib/authClient';

export default function NavAuth() {
  const [user, setUser] = useState<{ login: string; avatar: string } | null>(null);

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
        className="flex items-center gap-1.5 text-bleepx-blue hover:text-blue-700 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
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
      onClick={() => startGitHubLogin()}
      className="flex items-center gap-1.5 text-bleepx-blue hover:text-blue-700 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
      <span className="hidden sm:inline">Sign In</span>
    </button>
  );
}
