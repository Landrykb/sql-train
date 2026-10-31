import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

/**
 * /api/arena/brain-result — the public Brains scoreboard.
 *
 * GET  /api/arena/brain-result        → global leaderboard (top 20)
 * GET  /api/arena/brain-result?ticket → issues a signed fight ticket
 * POST { model, won, verse?, tier?, ticket } — record a BYOK fight outcome.
 *
 * Signing: when ARENA_RESULT_SECRET is set, results MUST carry a valid
 * HMAC ticket issued by this route — anyone can still read the board, but
 * writes require a ticket, so the board can't be filled with fabricated
 * wins by curl. When the secret is unset (local dev) it degrades to open
 * mode so nothing breaks.
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
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECRET = process.env.ARENA_RESULT_SECRET ?? '';
const TICKET_TTL_MS = 2 * 60 * 60 * 1000; // a fight must conclude within 2h

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

function b64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload: string): string {
  return b64url(createHmac('sha256', SECRET).update(payload).digest());
}

function issueTicket(model: string): string {
  const payload = b64url(JSON.stringify({ model, iat: Date.now(), n: b64url(randomBytes(8)) }));
  return `${payload}.${sign(payload)}`;
}

function verifyTicket(ticket: string, model: string): boolean {
  const [payload, sig] = ticket.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(expected), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.model === model && Date.now() - data.iat < TICKET_TTL_MS;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  // Ticket issuance mode: ?ticket=1&model=...
  if (req.nextUrl.searchParams.get('ticket')) {
    if (!SECRET) return NextResponse.json({ ticket: null, unsigned: true });
    const model = req.nextUrl.searchParams.get('model')?.slice(0, 80) ?? '';
    if (!model) return NextResponse.json({ error: 'model required' }, { status: 400 });
    return NextResponse.json({ ticket: issueTicket(model) });
  }

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
  const ticket = typeof body?.ticket === 'string' ? body.ticket : '';

  if (!model || won === null) {
    return NextResponse.json({ error: 'model and won required' }, { status: 400 });
  }

  // Signed mode: a valid ticket is mandatory — unsigned writes rejected.
  if (SECRET && !verifyTicket(ticket, model)) {
    return NextResponse.json({ error: 'Invalid or expired fight ticket' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { error } = await supabase.from('arena_brain_results').insert({ model, won, verse, tier });
  if (error) {
    return NextResponse.json({ ok: false, detail: error.message }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
