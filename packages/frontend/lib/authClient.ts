/**
 * Auth client — talks to the existing Render backend for GitHub OAuth.
 * No NextAuth needed — uses the backend's /api/auth/github flow.
 */

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

/** Store GitHub user in localStorage */
export function setGitHubUser(user: GitHubUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch { /* ignore */ }
}

/** Clear GitHub user from localStorage */
export function clearGitHubUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * Start GitHub OAuth flow.
 * Calls the backend to get the GitHub authorization URL, then redirects.
 */
export async function startGitHubLogin(): Promise<void> {
  if (!API_URL) {
    console.error('NEXT_PUBLIC_API_URL not set');
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
