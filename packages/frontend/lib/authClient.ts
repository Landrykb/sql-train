/**
 * Auth client — uses Supabase Auth (GitHub provider) with the PKCE OAuth flow.
 *
 * Security posture (2026-04+):
 *   - The GitHub `provider_token` is **never** persisted in our own
 *     `bleepx_github_user` localStorage entry. The Supabase SDK keeps the
 *     active session (including `provider_token`) in its own storage key; we
 *     read it live with `getGitHubToken()` only at the moment we need to call
 *     the GitHub API (e.g. pushing a portfolio repo).
 *   - Pre-existing installs may have a legacy entry with `token` embedded —
 *     `migrateLegacyStoredToken()` redacts it on startup.
 *   - OAuth scope is limited to `public_repo` so a leaked token cannot touch
 *     a learner's private repositories.
 */
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const PROVIDER_TOKEN_COOKIE = 'bleepx_provider_token';

/** Read the GitHub provider_token from the Secure cookie set at OAuth callback. */
function getProviderTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${PROVIDER_TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface GitHubUser {
  login: string;
  name: string;
  avatar: string;
  email: string;
  /** @deprecated Tokens are no longer stored here. Use `getGitHubToken()` to
   *  retrieve the provider token from the active Supabase session instead. */
  token?: string;
}

const STORAGE_KEY = 'bleepx_github_user';

/** Redact any legacy `token` field persisted by older builds. Idempotent. */
export function migrateLegacyStoredToken(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'token' in parsed) {
      delete parsed.token;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch { /* ignore */ }
}

/** Get stored GitHub user from localStorage (never contains a token). */
export function getGitHubUser(): GitHubUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GitHubUser;
    // Defense-in-depth: strip token if a legacy entry is still around.
    if (parsed && 'token' in parsed) delete (parsed as { token?: string }).token;
    return parsed;
  } catch { /* ignore */ }
  return null;
}

export const AUTH_CHANGE_EVENT = 'bleepx_auth_change';

/** Store GitHub user in localStorage. The `token` field (if present) is
 *  discarded — tokens live only in the Supabase session. */
export function setGitHubUser(user: GitHubUser): void {
  try {
    // Remove token before persisting, regardless of what the caller passed.
    const { token: _drop, ...safe } = user;
    void _drop; // linter: intentionally ignored
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
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
 * Read the current GitHub `provider_token` from the active Supabase session.
 * Returns null if the user is not signed in, if Supabase is not configured,
 * or if the provider token is unavailable (GitHub provider tokens are not
 * refreshed automatically by Supabase — the user may need to re-authenticate).
 */
export async function getGitHubToken(): Promise<string | null> {
  // Try the active Supabase session first. If the provider_token was dropped
  // after a refresh, fall back to the Secure cookie we set at OAuth callback.
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.provider_token) {
        return data.session.provider_token;
      }
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.provider_token) {
        return refreshData.session.provider_token;
      }
    } catch {
      // Fall through to cookie fallback
    }
  }
  return getProviderTokenFromCookie();
}

/**
 * Start GitHub OAuth flow via Supabase Auth (PKCE).
 * Falls back to the Render backend if Supabase is not configured.
 */
export async function startGitHubLogin(): Promise<void> {
  console.log('[startGitHubLogin] Attempting GitHub login, supabase client:', !!supabase);
  // Prefer Supabase Auth — much faster, no backend cold-start
  if (supabase) {
    try {
      console.log('[startGitHubLogin] Calling signInWithOAuth with redirect to:', `${window.location.origin}/auth/callback`);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Least-privilege scope: just enough to create a public portfolio repo.
          // Avoids the full `repo` scope which grants access to private repos.
          scopes: 'read:user public_repo',
        },
      });
      if (error) {
        console.error('[startGitHubLogin] signInWithOAuth error:', error);
        throw error;
      }
      console.log('[startGitHubLogin] signInWithOAuth succeeded, redirecting to GitHub');
      return;
    } catch (err) {
      console.error('[startGitHubLogin] Supabase GitHub login failed, trying fallback:', err);
    }
  } else {
    console.error('[startGitHubLogin] Supabase client is null');
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

/** Sign out from Supabase + clear local user data and provider token cookie */
export async function logoutUser(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut().catch(() => {});
  }
  clearGitHubUser();
  if (typeof document !== 'undefined') {
    document.cookie = `${PROVIDER_TOKEN_COOKIE}=; path=/; max-age=0; secure; samesite=lax`;
  }
}
