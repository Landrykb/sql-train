import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { domainFolderMap } from '@/lib/constants';
import { duelTaskById, DUEL_SET_VERSION, type DuelTaskSpec } from '@/lib/duels/tasks';
import { sqlVerdictForRows } from '@/lib/duels/compareServer';

/**
 * POST /api/duels/attempt — record one duel attempt as a Scoring Record
 * (frozen spec §4) in `duel_runs`. This route is the ONLY way a score
 * comes to exist.
 *
 * Verification levels, stated honestly:
 *  - SQL: the verdict is RECOMPUTED here from the submitted result rows
 *    against the case's expected rows (lib/duels/compareServer.ts). Any
 *    verdict the client sends for a SQL task is ignored.
 *    → verified_by: 'server_recompute'
 *  - Python / Cloud: v1 has no server code-execution runner (that is
 *    Agent Connect Phase 3), so the verdict recorded is the one the
 *    platform's own in-browser checkers produced — validated strictly
 *    for shape, never trusted for SQL-style recompute.
 *    → verified_by: 'platform_checker'
 *
 * Safety rails:
 *  - task_id must be in DUEL_SET_V1; task_version + duel_set_version
 *    are stamped from the registry, never taken from the client.
 *  - credential-shaped fields (api key / token / password / …) anywhere
 *    in the subject or submission are rejected — BYOK keys stay in the
 *    browser, and an attempt payload is never a place for one.
 *  - per-IP rate limit, same in-memory approach as the arena routes.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Attempts fire per checker run during play; the brain-result board uses
// 30/min for single match outcomes, duel attempts get a higher ceiling.
const hits = new Map<string, number[]>();
const LIMIT = 60;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

const STATUSES = ['completed', 'error', 'timeout', 'abandoned'] as const;

// ─── validation helpers (manual, mirroring the arena routes) ────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;
}

const CREDENTIAL_KEY = /^(api[-_]?key|access[-_]?token|auth[-_]?token|token|password|secret|authorization|bearer)$/i;

function hasCredentialKey(value: unknown, depth = 0): boolean {
  if (depth > 3 || !isObj(value)) return false;
  for (const [k, v] of Object.entries(value)) {
    if (CREDENTIAL_KEY.test(k) || /api[-_]?key/i.test(k)) return true;
    if (hasCredentialKey(v, depth + 1)) return true;
  }
  return false;
}

function validSubject(v: unknown): Record<string, unknown> | null {
  if (!isObj(v)) return null;
  if (v.type !== 'human' && v.type !== 'agent') return null;
  const id = str(v.id, 80);
  if (!id) return null;
  const out: Record<string, unknown> = { type: v.type, id };
  if (v.model !== undefined) {
    const m = str(v.model, 80);
    if (!m) return null;
    out.model = m;
  }
  if (v.version !== undefined) {
    const ver = str(v.version, 80);
    if (!ver) return null;
    out.version = ver;
  }
  return out;
}

function validCost(v: unknown): Record<string, number> | null | undefined {
  if (v === undefined || v === null) return null;
  if (!isObj(v)) return undefined;
  const out: Record<string, number> = {};
  for (const k of Object.keys(v)) {
    if (k !== 'tokens' && k !== 'usd') return undefined;
  }
  if (v.tokens !== undefined) {
    if (typeof v.tokens !== 'number' || !Number.isFinite(v.tokens) || v.tokens < 0 || v.tokens > 100_000_000) return undefined;
    out.tokens = Math.round(v.tokens);
  }
  if (v.usd !== undefined) {
    if (typeof v.usd !== 'number' || !Number.isFinite(v.usd) || v.usd < 0 || v.usd > 10_000) return undefined;
    out.usd = v.usd;
  }
  return out;
}

type CellValue = string | number | boolean | null;

function validCell(v: unknown): v is CellValue {
  return v === null || typeof v === 'string' || typeof v === 'boolean' ||
    (typeof v === 'number' && Number.isFinite(v));
}

/** Validate + normalize the per-kind submission. Returns null when malformed. */
function validSubmission(task: DuelTaskSpec, v: unknown): Record<string, unknown> | null {
  if (!isObj(v)) return null;
  if (task.kind === 'sql') {
    if (!Array.isArray(v.rows) || v.rows.length > 2000) return null;
    for (const row of v.rows) {
      if (Array.isArray(row)) {
        if (row.length > 64 || !row.every(validCell)) return null;
      } else if (isObj(row)) {
        const vals = Object.values(row);
        if (vals.length > 64 || !vals.every(validCell)) return null;
      } else return null;
    }
    const out: Record<string, unknown> = { rows: v.rows };
    if (v.query !== undefined) {
      const q = str(v.query, 20_000);
      if (q === null && v.query !== '') return null;
      out.query = q ?? '';
    }
    return out;
  }
  if (task.kind === 'python') {
    const code = str(v.code, 20_000);
    return code ? { code } : null;
  }
  // cloud
  if (!Array.isArray(v.actions) || v.actions.length > 50) return null;
  if (!v.actions.every((a) => typeof a === 'string' && a.length <= 200)) return null;
  return { actions: v.actions };
}

/** Strict per-kind verdict shape for platform-checker (Python/Cloud) runs. */
function validPlatformVerdict(task: DuelTaskSpec, v: unknown): Record<string, unknown> | null {
  if (!isObj(v) || typeof v.correct !== 'boolean') return null;
  const listKey = task.kind === 'python' ? 'failed_assertions' : 'unmet_state';
  const allowed = new Set(['correct', 'error_type', listKey]);
  for (const k of Object.keys(v)) if (!allowed.has(k)) return null;
  const out: Record<string, unknown> = { correct: v.correct, error_type: null };
  if (v.error_type !== undefined && v.error_type !== null) {
    const e = str(v.error_type, 40);
    if (!e) return null;
    out.error_type = e;
  }
  if (v[listKey] !== undefined) {
    const list = v[listKey];
    if (!Array.isArray(list) || list.length > 10 || !list.every((s) => typeof s === 'string' && s.length <= 300)) return null;
    out[listKey] = list;
  } else {
    out[listKey] = [];
  }
  return out;
}

// ─── SQL expected rows (server-side only, cached per task) ──────────────────

const expectedCache = new Map<string, Record<string, unknown>[]>();

async function loadExpectedRows(task: DuelTaskSpec): Promise<Record<string, unknown>[]> {
  const cached = expectedCache.get(task.task_id);
  if (cached) return cached;
  const folder = domainFolderMap[task.domain_key];
  if (!folder) throw new Error(`No case folder for domain "${task.domain_key}"`);
  const filePath = path.join(process.cwd(), 'cases', folder, `${task.task_id}.yaml`);
  const doc = load(await fs.readFile(filePath, 'utf-8')) as { expected?: Record<string, unknown>[] };
  const rows = Array.isArray(doc?.expected) ? doc.expected : [];
  expectedCache.set(task.task_id, rows);
  return rows;
}

// ─── route ──────────────────────────────────────────────────────────────────

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

  const task = typeof body?.task_id === 'string' ? duelTaskById(body.task_id) : undefined;
  if (!task) {
    return NextResponse.json({ error: 'Unknown task — attempts are only recorded for the duel set' }, { status: 400 });
  }

  const subject = validSubject(body?.subject);
  if (!subject) {
    return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
  }

  if (hasCredentialKey(body?.subject) || hasCredentialKey(body?.submission)) {
    return NextResponse.json(
      { error: 'Attempt payloads must not contain credentials — API keys stay in the browser' },
      { status: 400 },
    );
  }

  const status = body?.status === undefined ? 'completed' : body.status;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const runtime_ms = body?.runtime_ms === undefined
    ? null
    : typeof body.runtime_ms === 'number' && Number.isFinite(body.runtime_ms) && body.runtime_ms >= 0 && body.runtime_ms <= 3_600_000
      ? Math.round(body.runtime_ms)
      : undefined;
  if (runtime_ms === undefined) {
    return NextResponse.json({ error: 'Invalid runtime_ms' }, { status: 400 });
  }

  const cost = validCost(body?.cost);
  if (cost === undefined) {
    return NextResponse.json({ error: 'Invalid cost' }, { status: 400 });
  }

  const match_id = body?.match_id === undefined ? null : str(body.match_id, 64);
  if (body?.match_id !== undefined && match_id === null) {
    return NextResponse.json({ error: 'Invalid match_id' }, { status: 400 });
  }
  const team_role = body?.team_role === undefined ? null : str(body.team_role, 32);
  if (body?.team_role !== undefined && team_role === null) {
    return NextResponse.json({ error: 'Invalid team_role' }, { status: 400 });
  }

  const submission = validSubmission(task, body?.submission);
  if (!submission) {
    return NextResponse.json({ error: 'Invalid submission for this task kind' }, { status: 400 });
  }

  // ── verdict ──
  let verdict: Record<string, unknown>;
  let verified_by: 'server_recompute' | 'platform_checker';
  if (status !== 'completed') {
    // No checker ran to completion — the outcome is the status itself.
    verdict = { correct: false, error_type: status };
    verified_by = task.kind === 'sql' ? 'server_recompute' : 'platform_checker';
  } else if (task.kind === 'sql') {
    let expected: Record<string, unknown>[];
    try {
      expected = await loadExpectedRows(task);
    } catch {
      return NextResponse.json({ error: 'Task expected rows unavailable' }, { status: 500 });
    }
    verdict = { ...(sqlVerdictForRows(submission.rows as unknown[], expected)) };
    verified_by = 'server_recompute';
  } else {
    const v = validPlatformVerdict(task, body?.verdict);
    if (!v) {
      return NextResponse.json({ error: 'Invalid verdict for this task kind' }, { status: 400 });
    }
    verdict = v;
    verified_by = 'platform_checker';
  }

  // Cap the stored payload: scores don't need more than the first 500 rows.
  const storedSubmission = { ...submission };
  if (Array.isArray(storedSubmission.rows) && storedSubmission.rows.length > 500) {
    storedSubmission.rows = (storedSubmission.rows as unknown[]).slice(0, 500);
    storedSubmission.rows_truncated = true;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false, detail: 'scoring store unavailable' }, { status: 503 });

  const { data, error } = await supabase
    .from('duel_runs')
    .insert({
      subject,
      task_id: task.task_id,
      task_version: task.version,
      duel_set_version: DUEL_SET_VERSION,
      kind: task.kind,
      submitted: storedSubmission,
      runtime_ms,
      status,
      verdict,
      cost,
      verified_by,
      match_id,
      team_role,
    })
    .select('run_id')
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, detail: 'insert failed' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, run_id: data.run_id, verdict, verified_by });
}
