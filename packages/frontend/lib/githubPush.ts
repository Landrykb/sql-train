/**
 * Push SQL portfolio files to GitHub using the user's OAuth token.
 * Uses the GitHub API directly — no backend needed.
 */

import { getGitHubUser } from './authClient';

interface PortfolioFile {
  path: string;
  content: string;
}

interface PushResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
}

const GITHUB_API = 'https://api.github.com';

async function ghFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res;
}

/** Create a repo if it doesn't exist, returns the repo full_name */
async function ensureRepo(token: string, repoName: string): Promise<string> {
  // Check if repo exists
  const user = getGitHubUser();
  if (!user) throw new Error('Not signed in');
  const check = await ghFetch(`/repos/${user.login}/${repoName}`, token);
  if (check.ok) {
    return `${user.login}/${repoName}`;
  }
  // Create repo
  const create = await ghFetch('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      name: repoName,
      description: 'SQL Analytics Portfolio — BleepxQuery SwiftLink Training Program',
      private: false,
      auto_init: false,
    }),
  });
  if (!create.ok) {
    const err = await create.json();
    throw new Error(err.message || 'Failed to create repository');
  }
  return `${user.login}/${repoName}`;
}

/** Push a single file to a repo (create or update) */
async function pushFile(token: string, repo: string, filePath: string, content: string, message: string): Promise<void> {
  // Check if file exists to get its SHA (needed for updates)
  const existing = await ghFetch(`/repos/${repo}/contents/${filePath}`, token);
  let sha: string | undefined;
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const body: any = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(`/repos/${repo}/contents/${filePath}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to push ${filePath}: ${err.message}`);
  }
}

/** Push an entire portfolio to GitHub */
export async function pushPortfolioToGitHub(
  domain: string,
  files: PortfolioFile[],
  onProgress?: (msg: string) => void,
): Promise<PushResult> {
  const user = getGitHubUser();
  if (!user?.token) {
    return { success: false, error: 'Sign in with GitHub first to push your portfolio.' };
  }

  const repoName = `sql-portfolio-${domain}`;

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(user.token, repoName);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(user.token, repo, f.path, f.content, `Add ${f.path} — BleepxQuery`);
    }

    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again with GitHub to refresh your token.' };
    }
    return { success: false, error: msg };
  }
}

/** Push an individual case visualization to GitHub */
export async function pushCaseToGitHub(
  domain: string,
  caseId: string,
  caseName: string,
  files: PortfolioFile[],
  onProgress?: (msg: string) => void,
): Promise<PushResult> {
  const user = getGitHubUser();
  if (!user?.token) {
    return { success: false, error: 'Sign in with GitHub first to push your work.' };
  }

  const repoName = 'sql-portfolio';

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(user.token, repoName);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(user.token, repo, f.path, f.content, `Add ${domain}/${caseId}: ${caseName} — BleepxQuery`);
    }

    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}/tree/main/${domain}/${caseId}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again with GitHub to refresh your token.' };
    }
    return { success: false, error: msg };
  }
}
