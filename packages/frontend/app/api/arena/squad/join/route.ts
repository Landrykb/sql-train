import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  SQUAD_TABLE, SQUAD_PUBLIC_COLUMNS, isRateLimited, clientIp,
  newSideToken, hashToken,
  cleanName, cleanBrainId, cleanBrainLabel,
  sanitizeBattle, isMissingTable, type SquadRow,
} from '@/lib/arena/squadServer';

/**
 * POST /api/arena/squad/join { code, name, brainId, brainLabel? }
 * Takes the empty second seat of a battle. Returns { battle, token } —
 * the token proves "this browser is the joiner side" at submit time.
 * A battle holds exactly two sides: joining a full or finished battle
 * is refused (409).
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
  const name = cleanName(body?.name);
  const brainId = cleanBrainId(body?.brainId);
  if (!code || !name || !brainId) {
    return NextResponse.json({ error: 'code, name and a valid brain are required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'squad_unavailable' }, { status: 503 });

  const { data: existing, error: readErr } = await supabase
    .from(SQUAD_TABLE)
    .select('code, status, joiner_name')
    .eq('code', code)
    .maybeSingle();
  if (isMissingTable(readErr)) return NextResponse.json({ error: 'squad_unavailable' }, { status: 503 });
  if (readErr) return NextResponse.json({ error: 'lookup failed' }, { status: 503 });
  if (!existing) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  if (existing.joiner_name || existing.status === 'complete') {
    return NextResponse.json({ error: 'This battle already has two squads' }, { status: 409 });
  }

  const token = newSideToken();
  const { data, error } = await supabase
    .from(SQUAD_TABLE)
    .update({
      joiner_name: name,
      joiner_brain_id: brainId,
      joiner_brain_label: cleanBrainLabel(body?.brainLabel, brainId),
      joiner_token_hash: hashToken(token),
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('code', code)
    .is('joiner_name', null)
    .select(SQUAD_PUBLIC_COLUMNS)
    .single();
  if (isMissingTable(error)) return NextResponse.json({ error: 'squad_unavailable' }, { status: 503 });
  if (error || !data) {
    // Lost a race with another joiner — the seat is taken.
    return NextResponse.json({ error: 'This battle already has two squads' }, { status: 409 });
  }

  return NextResponse.json({ battle: sanitizeBattle(data as unknown as SquadRow), token });
}
