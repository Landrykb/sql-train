/**
 * Auth client — uses Supabase Auth (GitHub provider) for fast OAuth.
 * Falls back to the Render backend flow if Supabase is not configured.
 */
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface GitHubUser {
  login: string;
  name: string;
  avatar: string;
  email: string;
  token: string;
}

const STORAGE_KEY = 'bleepx_github_user';

/** Get stored GitHub user from localStorage */
export function getGitHubUser(): GitHubUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export const AUTH_CHANGE_EVENT = 'bleepx_auth_change';

/** Store GitHub user in localStorage */
export function setGitHubUser(user: GitHubUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch { /* ignore */ }
}

/** Clear GitHub user from localStorage */
export function clearGitHubUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch { /* ignore */ }
}

/**
 * Start GitHub OAuth flow via Supabase Auth.
 * Falls back to the Render backend if Supabase is not configured.
 */
export async function startGitHubLogin(): Promise<void> {
  // Prefer Supabase Auth — much faster, no backend cold-start
  if (supabase) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'repo',
        },
      });
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Supabase GitHub login failed, trying fallback:', err);
    }
  }

  // Fallback: legacy Render backend flow
  if (!API_URL) {
    console.error('No auth provider configured (set NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_API_URL)');
    return;
  }
  try {
    const resp = await fetch(`${API_URL}/api/auth/github`);
    const data = await resp.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error('Failed to start GitHub login:', err);
  }
}

/** Sign out from Supabase + clear local user data */
export async function logoutUser(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut().catch(() => {});
  }
  clearGitHubUser();
}
