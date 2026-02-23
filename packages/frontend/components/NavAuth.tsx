'use client';

import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

export default function NavAuth() {
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated' && !!session?.user;

  if (isSignedIn) {
    return (
      <Link
        href="/profile"
        className="flex items-center gap-1.5 text-bleepx-blue hover:text-blue-700 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
      >
        {session.user?.image ? (
          <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
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
      onClick={() => signIn('github')}
      className="flex items-center gap-1.5 text-bleepx-blue hover:text-blue-700 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
      <span className="hidden sm:inline">Sign In</span>
    </button>
  );
}
