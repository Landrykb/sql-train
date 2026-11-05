import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  SQUAD_TABLE, SQUAD_PUBLIC_COLUMNS, isRateLimited, clientIp,
  tokenMatches, sanitizeResult, computeWinner,
  sanitizeBattle, isMissingTable, type SquadRow,
} from '@/lib/arena/squadServer';
import type { SquadSideResult } from '@/lib/arena/squad';

/**
 * POST /api/arena/squad/submit { code, token, result }
 * Records one side's finished run. The token must match the side's
 * stored hash; the score is recomputed from the per-round payload
 * (see sanitizeResult) — a client-sent winner or total is never
 * trusted. One live submission per side: a side may replace its
 * result only while the battle is not complete. When both sides are
 * in, the winner is computed here and the battle closes.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const code = typeof body?.code === 'string' ? body.code.toUpperCase().slice(0, 12) : '';
  const token = typeof body?.token === 'string' ? body.token : '';
  const result = sanitizeResult(body?.result);
  if (!code || !token || !result) {
    return NextResponse.json({ error: 'code, token and a valid result are required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'squad_unavailable' }, { status: 503 });

  const { data: row, error: readErr } = await supabase
    .from(SQUAD_TABLE)
    .select(`${SQUAD_PUBLIC_COLUMNS}, creator_token_hash, joiner_token_hash`)
    .eq('code', code)
    .maybeSingle();
  if (isMissingTable(readErr)) return NextResponse.json({ error: 'squad_unavailable' }, { status: 503 });
  if (readErr) return NextResponse.json({ error: 'lookup failed' }, { status: 503 });
  if (!row) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  if (row.status === 'complete') {
    return NextResponse.json({ error: 'This battle is already complete' }, { status: 409 });
  }

  const side = tokenMatches(token, row.creator_token_hash)
    ? 'creator'
    : tokenMatches(token, row.joiner_token_hash)
      ? 'joiner'
      : null;
  if (!side) return NextResponse.json({ error: 'That token does not belong to this battle' }, { status: 401 });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  let creatorResult = (row.creator_result as SquadSideResult | null) ?? null;
  let joinerResult = (row.joiner_result as SquadSideResult | null) ?? null;
  if (side === 'creator') {
    patch.creator_result = result;
    patch.creator_submitted_at = now;
    creatorResult = result;
  } else {
    patch.joiner_result = result;
    patch.joiner_submitted_at = now;
    joinerResult = result;
  }

  if (creatorResult && joinerResult) {
    patch.status = 'complete';
    patch.winner = computeWinner(creatorResult, joinerResult);
  }

  const { data, error } = await supabase
    .from(SQUAD_TABLE)
    .update(patch)
    .eq('code', code)
    .select(SQUAD_PUBLIC_COLUMNS)
    .single();
  if (isMissingTable(error)) return NextResponse.json({ error: 'squad_unavailable' }, { status: 503 });
  if (error || !data) return NextResponse.json({ error: 'Could not save the result' }, { status: 503 });

  return NextResponse.json({ battle: sanitizeBattle(data as unknown as SquadRow) });
}
