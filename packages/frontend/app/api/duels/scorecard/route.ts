import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

/**
 * GET /api/duels/scorecard — aggregates over `duel_runs`.
 *
 *   ?subject=<id>   → that subject's card (+ its per-task baselines)
 *   (no param)      → every subject with recorded runs, most active first
 *   ?limit=<n>      → how many recent runs to include (default 50, max 200)
 *
 * A card carries: attempts, completed, passes, pass rate, average
 * runtime, total cost where recorded, a per-kind breakdown, and a
 * per-task breakdown. Alongside it, `baselines` gives the HUMAN
 * pass-rate per task — the baseline-first rule (frozen spec §4): an
 * agent's number is only shown next to what humans did on the same
 * task + version.
 *
 * Sanitized by construction: the query never selects `submitted`, so no
 * subject's raw code/rows can appear here — only aggregates and run
 * metadata. Aggregation happens in this route (same approach as the
 * brain-result board) over at most 5000 recent runs.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RunRow {
  run_id: string;
  subject: { type?: string; id?: string; model?: string; version?: string } | null;
  task_id: string;
  task_version: string;
  kind: string;
  runtime_ms: number | null;
  status: string;
  verdict: { correct?: boolean } | null;
  cost: { tokens?: number; usd?: number } | null;
  verified_by: string;
  created_at: string;
}

interface KindAgg { attempts: number; completed: number; passes: number }
interface TaskAgg { attempts: number; completed: number; passes: number; pass_rate: number | null }

interface SubjectCard {
  subject: { type: string; id: string; model?: string; version?: string };
  attempts: number;
  completed: number;
  passes: number;
  pass_rate: number | null;
  avg_runtime_ms: number | null;
  total_cost: { tokens: number; usd: number } | null;
  by_kind: Record<string, KindAgg>;
  tasks: Record<string, TaskAgg>;
  last_run_at: string | null;
}

const rate = (passes: number, completed: number): number | null =>
  completed > 0 ? Math.round((passes / completed) * 1000) / 1000 : null;

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get('subject')?.slice(0, 80) || null;
  const limitRaw = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 50;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ subjects: [], baselines: {}, runs: [] }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('duel_runs')
    .select('run_id, subject, task_id, task_version, kind, runtime_ms, status, verdict, cost, verified_by, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error || !data) {
    return NextResponse.json({ subjects: [], baselines: {}, runs: [] }, { status: 503 });
  }
  const rows = data as unknown as RunRow[];

  // ── per-subject aggregation ──
  const cards = new Map<string, SubjectCard & { runtimeSum: number; runtimeCount: number }>();
  const keyOf = (r: RunRow) => `${r.subject?.type ?? 'human'}:${r.subject?.id ?? 'unknown'}`;
  for (const r of rows) {
    const key = keyOf(r);
    let card = cards.get(key);
    if (!card) {
      card = {
        subject: {
          type: r.subject?.type ?? 'human',
          id: r.subject?.id ?? 'unknown',
          ...(r.subject?.model ? { model: r.subject.model } : {}),
          ...(r.subject?.version ? { version: r.subject.version } : {}),
        },
        attempts: 0, completed: 0, passes: 0, pass_rate: null,
        avg_runtime_ms: null, total_cost: null,
        by_kind: {}, tasks: {}, last_run_at: r.created_at,
        runtimeSum: 0, runtimeCount: 0,
      };
      cards.set(key, card);
    }
    const done = r.status === 'completed';
    const passed = done && r.verdict?.correct === true;
    card.attempts += 1;
    if (done) card.completed += 1;
    if (passed) card.passes += 1;
    if (done && typeof r.runtime_ms === 'number') {
      card.runtimeSum += r.runtime_ms;
      card.runtimeCount += 1;
    }
    if (r.cost && (typeof r.cost.tokens === 'number' || typeof r.cost.usd === 'number')) {
      card.total_cost = card.total_cost ?? { tokens: 0, usd: 0 };
      card.total_cost.tokens += r.cost.tokens ?? 0;
      card.total_cost.usd += r.cost.usd ?? 0;
    }
    const kind = (card.by_kind[r.kind] ??= { attempts: 0, completed: 0, passes: 0 });
    kind.attempts += 1;
    if (done) kind.completed += 1;
    if (passed) kind.passes += 1;
    const task = (card.tasks[r.task_id] ??= { attempts: 0, completed: 0, passes: 0, pass_rate: null });
    task.attempts += 1;
    if (done) task.completed += 1;
    if (passed) task.passes += 1;
  }

  const subjects: SubjectCard[] = [...cards.values()].map(({ runtimeSum, runtimeCount, ...card }) => {
    card.pass_rate = rate(card.passes, card.completed);
    card.avg_runtime_ms = runtimeCount > 0 ? Math.round(runtimeSum / runtimeCount) : null;
    for (const t of Object.values(card.tasks)) t.pass_rate = rate(t.passes, t.completed);
    if (card.total_cost) card.total_cost.usd = Math.round(card.total_cost.usd * 10000) / 10000;
    return card;
  }).sort((a, b) => b.attempts - a.attempts).slice(0, 50);

  // ── human baselines per task (all human runs, same task + version) ──
  const baselineAcc = new Map<string, TaskAgg>();
  for (const r of rows) {
    if (r.subject?.type !== 'human') continue;
    const agg = baselineAcc.get(r.task_id) ?? { attempts: 0, completed: 0, passes: 0, pass_rate: null };
    agg.attempts += 1;
    if (r.status === 'completed') {
      agg.completed += 1;
      if (r.verdict?.correct === true) agg.passes += 1;
    }
    baselineAcc.set(r.task_id, agg);
  }
  const baselines: Record<string, TaskAgg> = {};
  for (const [task_id, agg] of baselineAcc) {
    agg.pass_rate = rate(agg.passes, agg.completed);
    baselines[task_id] = agg;
  }

  // ── recent runs (metadata only — never submissions) ──
  const runs = rows.slice(0, limit).map((r) => ({
    run_id: r.run_id,
    subject: { type: r.subject?.type ?? 'human', id: r.subject?.id ?? 'unknown' },
    task_id: r.task_id,
    kind: r.kind,
    status: r.status,
    correct: r.status === 'completed' ? r.verdict?.correct === true : null,
    runtime_ms: r.runtime_ms,
    verified_by: r.verified_by,
    created_at: r.created_at,
  }));

  if (subjectId) {
    const mine = subjects.filter((s) => s.subject.id === subjectId);
    return NextResponse.json({ subjects: mine, baselines, runs: runs.filter((r) => r.subject.id === subjectId) });
  }
  return NextResponse.json({ subjects, baselines, runs });
}
