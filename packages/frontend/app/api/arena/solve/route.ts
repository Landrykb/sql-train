import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { domainFolderMap } from '@/lib/constants';
import { getChampion, getStrategy } from '@/lib/arena/champions';

const LLM_URL = process.env.LLM_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions';
const LLM_KEY = process.env.LLM_API_KEY ?? '';
const LLM_MODEL = process.env.LLM_MODEL ?? 'openrouter/free';
const LLM_REFERER = process.env.LLM_REFERER ?? 'https://besa-sqlverse.com';
const LLM_MAX_TOKENS = parseInt(process.env.LLM_ARENA_MAX_TOKENS ?? '800', 10);
const LLM_DISABLED = process.env.LLM_DISABLED === 'true';

const requestLog = new Map<string, number[]>();
const RATE_LIMIT = parseInt(process.env.LLM_RATE_LIMIT_PER_MIN ?? '15', 10);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const log = (requestLog.get(ip) ?? []).filter((t) => t > now - 60_000);
  requestLog.set(ip, log);
  if (log.length >= RATE_LIMIT) return true;
  log.push(now);
  return false;
}

function extractSql(text: string): string {
  const block = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  const sql = (block ? block[1] : text).trim();
  // Strip any leading prose lines that aren't SQL-ish
  return sql
    .split('\n')
    .filter((line) => !/^\s*(here|sure|this|the query|output)/i.test(line))
    .join('\n')
    .trim();
}

async function loadCase(domain: string, caseId: string) {
  const folder = domainFolderMap[domain];
  if (!folder) throw new Error(`Unknown domain "${domain}"`);
  const filePath = path.join(process.cwd(), 'cases', folder, `${caseId}.yaml`);
  const c = load(await fs.readFile(filePath, 'utf-8')) as any;
  if (!c?.id) throw new Error(`Case "${caseId}" not found`);
  return c;
}

function buildPrompt(c: any, strategySuffix: string): string {
  const schemaText = (c.schema ?? [])
    .map((t: any) => `Table "${t.name}": ${(t.columns ?? []).map((col: any) => `${col.name} (${col.type})`).join(', ')}`)
    .join('\n');
  return `SQL dialect: SQLite.

SCHEMA:
${schemaText}

TASK:
${(c.instructions ?? '').trim()}

${strategySuffix}

Reply with ONLY the SQL query. No markdown fences, no explanation.`;
}

/**
 * POST /api/arena/solve { domain, caseId, championId, strategyId }
 * The chosen champion attempts the round. Falls back to the canonical
 * solutionQuery when the LLM is disabled/unreachable so the arena
 * still works offline (scripted champion mode).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { domain, caseId, championId, strategyId } = body ?? {};
  if (!domain || !caseId) {
    return NextResponse.json({ error: 'domain and caseId required' }, { status: 400 });
  }

  let c;
  try {
    c = await loadCase(domain, caseId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const champion = getChampion(championId);
  const strategy = getStrategy(strategyId);

  if (LLM_DISABLED || !LLM_KEY) {
    // Scripted champion: plays the canonical solution so the arena works without an LLM.
    return NextResponse.json({ sql: c.solutionQuery ?? '', usedLLM: false, champion: champion.name });
  }

  try {
    const resp = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LLM_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': LLM_REFERER,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: LLM_MAX_TOKENS,
        temperature: champion.id === 'hex' ? 0.9 : 0.4,
        messages: [
          { role: 'system', content: champion.systemPrompt },
          { role: 'user', content: buildPrompt(c, strategy.promptSuffix) },
        ],
      }),
    });

    if (!resp.ok) {
      console.error(`[arena] LLM ${resp.status}:`, await resp.text().catch(() => ''));
      return NextResponse.json({ sql: c.solutionQuery ?? '', usedLLM: false, champion: champion.name });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    const sql = extractSql(text);
    if (!sql) {
      return NextResponse.json({ sql: c.solutionQuery ?? '', usedLLM: false, champion: champion.name });
    }
    return NextResponse.json({ sql, usedLLM: true, champion: champion.name });
  } catch (err) {
    console.error('[arena] solve failed:', err);
    return NextResponse.json({ sql: c.solutionQuery ?? '', usedLLM: false, champion: champion.name });
  }
}
