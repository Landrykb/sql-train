import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

/**
 * /api/arena/brain-result — the public Brains scoreboard.
 *
 * POST { model, won, verse?, tier? } — record a BYOK fight outcome.
 * GET  → top models by wins across ALL players (last 5000 results).
 *
 * This is Agent Connect's plumbing in miniature: the first server-side
 * result records. When BYOA lands, agent submissions write rows into the
 * same shape instead of building new infrastructure.
 *
 * Required table (run once in Supabase SQL editor):
 *
 *   create table if not exists arena_brain_results (
 *     id uuid primary key default gen_random_uuid(),
 *     model text not null,
 *     won boolean not null,
 *     verse text,
 *     tier text,
 *     created_at timestamptz default now()
 *   );
 *   alter table arena_brain_results enable row level security;
 *   create policy "anyone can insert" on arena_brain_results for insert with check (true);
 *   create policy "anyone can read"   on arena_brain_results for select using (true);
 *
 * If the table/env is missing both routes degrade gracefully — the client
 * keeps using its local scoreboard.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tiny per-IP rate limiter (same approach as /api/arena/solve).
const hits = new Map<string, number[]>();
const LIMIT = 30;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

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

  const model = typeof body?.model === 'string' ? body.model.slice(0, 80) : '';
  const won = typeof body?.won === 'boolean' ? body.won : null;
  const verse = typeof body?.verse === 'string' ? body.verse.slice(0, 32) : null;
  const tier = typeof body?.tier === 'string' ? body.tier.slice(0, 32) : null;

  if (!model || won === null) {
    return NextResponse.json({ error: 'model and won required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { error } = await supabase.from('arena_brain_results').insert({ model, won, verse, tier });
  if (error) {
    // Table missing or RLS rejects — degrade quietly.
    return NextResponse.json({ ok: false, detail: error.message }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ brains: [] }, { status: 503 });

  const { data, error } = await supabase
    .from('arena_brain_results')
    .select('model, won')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error || !data) {
    return NextResponse.json({ brains: [] }, { status: error ? 503 : 200 });
  }

  const acc = new Map<string, { w: number; l: number }>();
  for (const row of data as { model: string; won: boolean }[]) {
    const rec = acc.get(row.model) ?? { w: 0, l: 0 };
    if (row.won) rec.w += 1; else rec.l += 1;
    acc.set(row.model, rec);
  }

  const brains = [...acc.entries()]
    .map(([model, r]) => ({ model, w: r.w, l: r.l }))
    .sort((a, b) => b.w - a.w || a.l - b.l)
    .slice(0, 20);

  return NextResponse.json({ brains });
}
