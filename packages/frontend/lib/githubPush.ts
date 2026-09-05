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

/** Convert an array of row objects to a CSV string. */
function rowsToCsv(rows: Record<string, any>[]): string {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = rows.map((row) => headers.map((h) => escape(row[h])).join(','));
  return [headers.join(','), ...lines].join('\n');
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
  const author = user?.name || user?.login || 'unknown';
  const create = await ghFetch('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      name: repoName,
      description: `Portfolio by ${author}`,
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
      await pushFile(token, repo, f.path, f.content, `Add ${f.path}`);
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
      await pushFile(token, repo, f.path, f.content, `Add ${domain}/${caseId}: ${caseName}`);
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
      await pushFile(token, repo, f.path, f.content, `Add ${domain}/${projectId}: ${projectName}`);
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
  caseData: Record<string, { name: string; query?: string; solution?: string; results?: Record<string, any>[] }>,
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
  const author = user.name || user.login;

  const caseList = caseIds.map((id) => {
    const data = caseData[id] || { name: id };
    const resultNote = data.results?.length ? ` — *${data.results.length} rows analyzed*` : '';
    return `- **${data.name}** (\`${id}\`)${resultNote}`;
  }).join('\n');

  const readme = `# ${domainTitle} SQL Analytics Portfolio\n\n` +
    `A curated set of SQL analytics queries completed by **${author}** for the **${domainTitle}** domain.\n\n` +
    `Each case folder contains the original query, any solution notes, and a CSV of the returned results so you can inspect the actual output.\n\n` +
    `## Completed Cases\n\n${caseList}\n\n` +
    `---\n*Assembled by **${author}** with a little *bleep* guidance. Not bad for a human.*\n`;

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

  caseIds.forEach((id) => {
    const data = caseData[id] || { name: id };
    const caseReadme = `# ${data.name}\n\n` +
      `Case: \`${id}\` in the **${domainTitle}** domain.\n\n` +
      (data.query ? `## Query\n\n\`\`\`sql\n${data.query}\n\`\`\`\n\n` : '') +
      (data.solution ? `## Solution\n\n\`\`\`sql\n${data.solution}\n\`\`\`\n\n` : '') +
      (data.results?.length ? `## Results\n\n\`${data.results.length}\` rows returned. See \`results.csv\` for the full dataset.\n\n` : '') +
      `---\n*Pushed by **${author}** — *bleep* approved.*\n`;

    files.push({ path: `${domain}/${id}/README.md`, content: caseReadme });

    if (data.query) {
      files.push({ path: `${domain}/${id}/query.sql`, content: data.query });
    }
    if (data.solution) {
      files.push({ path: `${domain}/${id}/solution.sql`, content: data.solution });
    }
    if (data.results?.length) {
      files.push({ path: `${domain}/${id}/results.csv`, content: rowsToCsv(data.results) });
    }
  });

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${f.path}`);
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
  projectData: Record<string, { name: string; code?: string; description?: string }>,
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
  const author = user.name || user.login;

  const projectList = projectIds.map((id) => {
    const data = projectData[id] || { name: id };
    return `- **${data.name}** (\`${id}\`)`;
  }).join('\n');

  const readme = `# ${domain} Data Science Portfolio\n\n` +
    `A collection of data science notebooks and analysis completed by **${author}** for the **${domain}** domain.\n\n` +
    `Each project folder contains a solution notebook and a short write-up of the approach.\n\n` +
    `## Completed Projects\n\n${projectList}\n\n` +
    `---\n*Curated by **${author}** — *bleep* thinks you might actually know what you're doing.*\n`;

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

  projectIds.forEach((id) => {
    const data = projectData[id] || { name: id };
    const projectReadme = `# ${data.name}\n\n` +
      `Project: \`${id}\` in the **${domain}** domain.\n\n` +
      (data.description ? `${data.description}\n\n` : '') +
      (data.code ? `## Solution\n\n\`\`\`python\n${data.code}\n\`\`\`\n\n` : '') +
      `---\n*Pushed by **${author}** — *bleep* approved.*\n`;

    files.push({ path: `${domain}/${id}/README.md`, content: projectReadme });

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
      await pushFile(token, repo, f.path, f.content, `Add ${f.path}`);
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
  const author = user.name || user.login;

  const missionList = missionSlugs.map((slug) => {
    const data = missionData[slug] || { title: slug, skills: [], description: '' };
    return `- **${data.title}** (\`${slug}\`) — Skills: ${data.skills.join(', ')}`;
  }).join('\n');

  const readme = `# ${providerTitle} Cloud Architecture Portfolio\n\n` +
    `A set of cloud architecture missions completed by **${author}** on **${providerTitle}**.\n\n` +
    `Each mission includes the design description, targeted skills, and any infrastructure-as-code that was produced.\n\n` +
    `## Completed Missions\n\n${missionList}\n\n` +
    `---\n*Architected by **${author}** — *bleep* gives this one two circuits up.*\n`;

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

  missionSlugs.forEach((slug) => {
    const data = missionData[slug] || { title: slug, skills: [], description: '' };
    const missionReadme = `# ${data.title}\n\n` +
      `Mission: \`${slug}\` on **${providerTitle}**.\n\n` +
      `**Skills:** ${data.skills.map((s) => `\`${s}\``).join(', ')}\n\n` +
      `## Description\n\n${data.description}\n\n` +
      (data.iacCode ? `## Infrastructure as Code\n\nSee the included IaC file for the provisioned architecture.\n\n` : '') +
      `---\n*Pushed by **${author}** — *bleep* approved.*\n`;
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
      await pushFile(token, repo, f.path, f.content, `Add ${f.path}`);
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
  const author = user.name || user.login;

  const readme = `# ${mission.title}\n\n` +
    `**Provider:** ${providerName} (${provider.toUpperCase()})  \n` +
    `**Section:** ${mission.section}  \n` +
    `**Level:** ${mission.level} ${'*'.repeat(mission.stars)}  \n` +
    `**Skills:** ${mission.skills.map((s) => `\`${s}\``).join(', ')}\n\n` +
    `## Mission Briefing\n\n${mission.description}\n\n` +
    (iacCode ? `## Infrastructure as Code\n\nSee the template in this folder.\n\n` : '') +
    `---\n*Completed by **${author}** — *bleep* gives this cloud a thumbs up.*\n`;

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
      await pushFile(token, repo, f.path, f.content, `Add ${dir}: ${mission.title}`);
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

/** Data for a Bleepx ETL pipeline run. */
export interface ETLPipelineData {
  sourceUrl: string;
  rawCsv: string;
  sqlQuery: string;
  sqlResult: string;
  pythonCode: string;
  transformedCsv: string;
  s3Bucket: string;
  s3Key: string;
  timestamp?: string;
  name?: string;
}

/** Push a complete Bleepx ETL pipeline (Bronze → Silver → Gold → S3) to GitHub. */
export async function pushETLPipelineToGitHub(
  data: ETLPipelineData,
  onProgress?: (msg: string) => void,
  user?: GitHubUser | null,
): Promise<PushResult> {
  const token = await getGitHubToken();
  if (!user) {
    return { success: false, error: 'Sign in with GitHub first to push your ETL pipeline.' };
  }
  if (!token) {
    return { success: false, error: 'GitHub token not available. Please sign in again to refresh your session.' };
  }

  const repoName = 'etl-portfolio';
  const author = user.name || user.login;
  const date = data.timestamp ? new Date(data.timestamp).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const runName = data.name?.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || `etl-run-${date}`;
  const dir = `etl-pipelines/${runName}`;

  const rawRows = data.rawCsv ? Math.max(0, data.rawCsv.trim().split('\n').length - 1) : 0;
  const sqlRows = data.sqlResult ? Math.max(0, data.sqlResult.trim().split('\n').length - 1) : 0;
  const outRows = data.transformedCsv ? Math.max(0, data.transformedCsv.trim().split('\n').length - 1) : 0;

  const readme = `# ETL Pipeline: ${runName}\n\n` +
    `A full browser-based ETL pipeline by **${author}**.\n\n` +
    `## Medallion flow\n\n` +
    `- **Bronze (Extract):** raw CSV from ${data.sourceUrl || 'user input'} (${rawRows} data rows)\n` +
    `- **Silver (SQL):** exploration and aggregation in \`query.sql\` (${sqlRows} data rows)\n` +
    `- **Gold (Python):** transformation in \`transform.py\` (${outRows} data rows)\n` +
    `- **Load (S3):** uploaded to \`${data.s3Bucket || '—'}/${data.s3Key || '—'}\`\n\n` +
    `## Files\n\n` +
    `- \`raw.csv\` — Bronze source data\n` +
    `- \`query.sql\` — Silver SQL\n` +
    `- \`sql_result.csv\` — Silver output\n` +
    `- \`transform.py\` — Gold Python\n` +
    `- \`output.csv\` — Gold output ready for S3\n` +
    `- \`s3_manifest.txt\` — S3 destination\n` +
    `- \`pipeline.json\` — run metadata\n\n` +
    `---\n*Pushed by **${author}** — *bleep* approved.*\n`;

  const safeMeta = { ...data };
  delete (safeMeta as any).rawCsv;
  delete (safeMeta as any).sqlResult;
  delete (safeMeta as any).transformedCsv;

  const files: PortfolioFile[] = [
    { path: `${dir}/README.md`, content: readme },
    { path: `${dir}/query.sql`, content: data.sqlQuery },
    { path: `${dir}/transform.py`, content: data.pythonCode },
    { path: `${dir}/raw.csv`, content: data.rawCsv },
    { path: `${dir}/sql_result.csv`, content: data.sqlResult },
    { path: `${dir}/output.csv`, content: data.transformedCsv },
    { path: `${dir}/s3_manifest.txt`, content: `bucket: ${data.s3Bucket}\nkey: ${data.s3Key}\n` },
    { path: `${dir}/pipeline.json`, content: JSON.stringify(safeMeta, null, 2) },
  ];

  try {
    onProgress?.('Creating repository...');
    const repo = await ensureRepo(token, repoName);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onProgress?.(`Pushing ${f.path} (${i + 1}/${files.length})...`);
      await pushFile(token, repo, f.path, f.content, `Add ${f.path}`);
    }
    onProgress?.('Done!');
    return { success: true, repoUrl: `https://github.com/${repo}/tree/main/${dir}` };
  } catch (err: any) {
    const msg = err.message || 'Push failed';
    if (msg.includes('Bad credentials')) {
      return { success: false, error: 'Bad credentials — please sign out and sign in again.' };
    }
    return { success: false, error: msg };
  }
}
