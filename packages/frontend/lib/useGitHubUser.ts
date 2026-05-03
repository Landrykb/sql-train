'use client';

/**
 * Hook: read the current GitHub user from localStorage without triggering
 * a hydration mismatch.
 *
 * Why this exists:
 *   `getGitHubUser()` reads `localStorage`, which is not available during
 *   server rendering. Calling it directly inside JSX returns `null` on the
 *   server and the actual user on the client, which causes React error #418
 *   ("Text content did not match") on hydration.
 *
 *   This hook starts with `null` on both server *and* the first client render
 *   (so the markup matches), then reads the real value in `useEffect` after
 *   mount. It also listens for cross-tab storage events and the in-app
 *   `AUTH_CHANGE_EVENT` so the UI stays in sync when the user signs in / out.
 */
import { useEffect, useState } from 'react';
import { getGitHubUser, AUTH_CHANGE_EVENT, type GitHubUser } from './authClient';

export function useGitHubUser(): GitHubUser | null {
  const [user, setUser] = useState<GitHubUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(getGitHubUser());
    sync();
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return user;
}
