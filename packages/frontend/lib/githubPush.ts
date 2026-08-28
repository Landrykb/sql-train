/**
 * Push SQL portfolio files to GitHub using the user's OAuth token.
 * Uses the GitHub API directly — no backend needed.
 */

import { getGitHubUser, getGitHubToken, GitHubUser } from './authClient';
import { loadInterpretation, formatReportMarkdown, type ReportData } from './reportGeneration';

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

function toBase64(content: string) {
  const bytes = new TextEncoder().encode(content);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary);
}

async function ghFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
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
      auto_init: true,
      default_branch: 'main',
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
  // Check if file exists on main to get its SHA (needed for updates)
  const existing = await ghFetch(`/repos/${repo}/contents/${filePath}?ref=main`, token);
  let sha: string | undefined;
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const body: any = {
    message,
    content: toBase64(content),
    branch: 'main',
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
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your portfolio.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = `sql-portfolio-${domain}`;

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${f.path} — BleepxQuery`);
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
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your work.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = 'sql-portfolio';

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${domain}/${caseId}: ${caseName} — BleepxQuery`);
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

/** Push a BleepxLab project to GitHub */
export async function pushLabProjectToGitHub(
  domain: string,
  projectId: string,
  projectName: string,
  files: PortfolioFile[],
  onProgress?: (msg: string) => void,
  user?: GitHubUser | null,
): Promise<PushResult> {
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your work.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = 'ds-portfolio';

  // Add interpretation report if available
  const interpretation = loadInterpretation('lab', `lab-${domain}`);
  if (interpretation) {
    const reportContent = formatReportMarkdown(interpretation);
    files.push({ path: `${domain}/${projectId}/ANALYSIS.md`, content: reportContent });
    
    // Add graphs if available
    if (interpretation.graphs && interpretation.graphs.length > 0) {
      interpretation.graphs.forEach((graph, idx) => {
        if (graph.imageData) {
          files.push({ 
            path: `${domain}/${projectId}/graphs/graph-${idx + 1}.svg`, 
            content: graph.imageData 
          });
        }
      });
    }
  }

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${domain}/${projectId}: ${projectName} — BleepxLab`);
    }

    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}/tree/main/${domain}/${projectId}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again.' };
    }
    return { success: false, error: msg };
  }
}

interface CloudMissionLike {
  slug: string;
  title: string;
  section: string;
  level: string;
  stars: number;
  skills: string[];
  description: string;
  labType: string;
}

/** Push all completed SQL cases for a domain to GitHub as a complete portfolio */
export async function pushDomainPortfolioToGitHub(
  domain: string,
  caseIds: string[],
  caseData: Record<string, { name: string; query?: string; solution?: string }>,
  onProgress?: (msg: string) => void,
  user?: GitHubUser | null,
): Promise<PushResult> {
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your portfolio.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = 'sql-portfolio';
  const domainTitle = domain.charAt(0).toUpperCase() + domain.slice(1);

  const readme = `# ${domainTitle} Portfolio\n\n` +
    `Complete SQL analytics portfolio for ${domainTitle} domain from BleepxQuery.\n\n` +
    `## Completed Cases\n\n${caseIds.map(id => {
      const data = caseData[id];
      return `- **${data.name}** (\`${id}\`)`;
    }).join('\n')}\n\n` +
    `---\n*Generated by [BleepxQuery](https://bleepxacademy.vercel.app) — SwiftLink Training Program*\n`;

  const files: PortfolioFile[] = [
    { path: `${domain}/README.md`, content: readme },
  ];

  // Add interpretation report if available
  const interpretation = loadInterpretation('query', `query-${domain}`);
  if (interpretation) {
    const reportContent = formatReportMarkdown(interpretation);
    files.push({ path: `${domain}/ANALYSIS.md`, content: reportContent });
    
    // Add graphs if available
    if (interpretation.graphs && interpretation.graphs.length > 0) {
      interpretation.graphs.forEach((graph, idx) => {
        if (graph.imageData) {
          files.push({ 
            path: `${domain}/graphs/graph-${idx + 1}.svg`, 
            content: graph.imageData 
          });
        }
      });
    }
  }

  caseIds.forEach(id => {
    const data = caseData[id];
    if (data.query) {
      files.push({ path: `${domain}/${id}/query.sql`, content: data.query });
    }
    if (data.solution) {
      files.push({ path: `${domain}/${id}/solution.sql`, content: data.solution });
    }
  });

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${domain} portfolio — BleepxQuery`);
    }
    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}/tree/main/${domain}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again.' };
    }
    return { success: false, error: msg };
  }
}

/** Push all completed Lab projects for a domain to GitHub as a complete portfolio */
export async function pushLabDomainPortfolioToGitHub(
  domain: string,
  projectIds: string[],
  projectData: Record<string, { name: string; code?: string }>,
  onProgress?: (msg: string) => void,
): Promise<PushResult> {
  const user = getGitHubUser();
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your portfolio.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = 'ds-portfolio';

  const readme = `# ${domain} Portfolio\n\n` +
    `Complete data science portfolio for ${domain} domain from BleepxLab.\n\n` +
    `## Completed Projects\n\n${projectIds.map(id => {
      const data = projectData[id];
      return `- **${data.name}** (\`${id}\`)`;
    }).join('\n')}\n\n` +
    `---\n*Generated by [BleepxLab](https://bleepxacademy.vercel.app/lab) — Data Science Training Program*\n`;

  const files: PortfolioFile[] = [
    { path: `${domain}/README.md`, content: readme },
  ];

  // Add interpretation report if available
  const interpretation = loadInterpretation('lab', `lab-${domain}`);
  if (interpretation) {
    const reportContent = formatReportMarkdown(interpretation);
    files.push({ path: `${domain}/ANALYSIS.md`, content: reportContent });
    
    // Add graphs if available
    if (interpretation.graphs && interpretation.graphs.length > 0) {
      interpretation.graphs.forEach((graph, idx) => {
        if (graph.imageData) {
          files.push({ 
            path: `${domain}/graphs/graph-${idx + 1}.svg`, 
            content: graph.imageData 
          });
        }
      });
    }
  }

  projectIds.forEach(id => {
    const data = projectData[id];
    if (data.code) {
      files.push({ path: `${domain}/${id}/solution.py`, content: data.code });
    }
  });

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${domain} portfolio — BleepxLab`);
    }
    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}/tree/main/${domain}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again.' };
    }
    return { success: false, error: msg };
  }
}

/** Push all completed Cloud missions for a provider to GitHub as a complete portfolio */
export async function pushCloudProviderPortfolioToGitHub(
  provider: string,
  missionSlugs: string[],
  missionData: Record<string, { title: string; skills: string[]; description: string; iacCode?: string }>,
  onProgress?: (msg: string) => void,
  user?: GitHubUser | null,
): Promise<PushResult> {
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your portfolio.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = 'cloud-portfolio';
  const providerTitle = provider.charAt(0).toUpperCase() + provider.slice(1);

  const readme = `# ${providerTitle} Portfolio\n\n` +
    `Complete cloud architecture portfolio for ${providerTitle} from BleepxCloud.\n\n` +
    `## Completed Missions\n\n${missionSlugs.map(slug => {
      const data = missionData[slug];
      return `- **${data.title}** (\`${slug}\`) — Skills: ${data.skills.join(', ')}`;
    }).join('\n')}\n\n` +
    `---\n*Generated by [BleepxCloud](https://bleepxacademy.vercel.app/cloud) — Cloud Architecture Training*\n`;

  const files: PortfolioFile[] = [
    { path: `${provider}/README.md`, content: readme },
  ];

  // Add interpretation report if available
  const interpretation = loadInterpretation('cloud', `cloud-${provider}`);
  if (interpretation) {
    const reportContent = formatReportMarkdown(interpretation);
    files.push({ path: `${provider}/ANALYSIS.md`, content: reportContent });
    
    // Add graphs if available
    if (interpretation.graphs && interpretation.graphs.length > 0) {
      interpretation.graphs.forEach((graph, idx) => {
        if (graph.imageData) {
          files.push({ 
            path: `${provider}/graphs/graph-${idx + 1}.svg`, 
            content: graph.imageData 
          });
        }
      });
    }
  }

  missionSlugs.forEach(slug => {
    const data = missionData[slug];
    const missionReadme = `# ${data.title}\n\n` +
      `**Skills:** ${data.skills.map(s => `\`${s}\``).join(', ')}\n\n` +
      `## Description\n\n${data.description}\n\n`;
    files.push({ path: `${provider}/${slug}/README.md`, content: missionReadme });
    if (data.iacCode) {
      const ext = provider === 'azure' ? 'main.bicep' : 'main.tf';
      files.push({ path: `${provider}/${slug}/${ext}`, content: data.iacCode });
    }
  });

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${provider} portfolio — BleepxCloud`);
    }
    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}/tree/main/${provider}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again.' };
    }
    return { success: false, error: msg };
  }
}

/** Push a single BleepxCloud mission (README + optional IaC) to GitHub. */
export async function pushCloudMissionToGitHub(
  provider: string,
  mission: CloudMissionLike,
  providerName: string,
  iacCode: string | null,
  onProgress?: (msg: string) => void,
  user?: GitHubUser | null,
): Promise<PushResult> {
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your work.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = 'cloud-portfolio';
  const dir = `${provider}/${mission.slug}`;

  const readme = `# ${mission.title}\n\n` +
    `**Provider:** ${providerName} (${provider.toUpperCase()})  \n` +
    `**Section:** ${mission.section}  \n` +
    `**Level:** ${mission.level} ${'⭐'.repeat(mission.stars)}  \n` +
    `**Skills:** ${mission.skills.map((s) => `\`${s}\``).join(', ')}\n\n` +
    `## Mission Briefing\n\n${mission.description}\n\n` +
    (iacCode ? `## Infrastructure as Code\n\nSee the template in this folder.\n\n` : '') +
    `---\n*Completed via [BleepxCloud](https://bleepxacademy.vercel.app/cloud) — cloud architecture & certification training.*\n`;

  const files: PortfolioFile[] = [{ path: `${dir}/README.md`, content: readme }];
  if (iacCode) {
    const ext = provider === 'azure' ? 'main.bicep' : 'main.tf';
    files.push({ path: `${dir}/${ext}`, content: iacCode });
  }

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${dir}: ${mission.title} — BleepxCloud`);
    }
    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}/tree/main/${dir}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again with GitHub.' };
    }
    return { success: false, error: msg };
  }
}
