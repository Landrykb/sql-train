import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  SQUAD_TABLE, SQUAD_PUBLIC_COLUMNS, isRateLimited, clientIp,
  newBattleCode, newSideToken, hashToken,
  cleanName, cleanBrainId, cleanBrainLabel, cleanTerms,
  sanitizeBattle, isMissingTable, type SquadRow,
} from '@/lib/arena/squadServer';

/**
 * /api/arena/squad — Squad Battle battles.
 *
 * POST { name, brainId, brainLabel?, verse, domain, tier, listed }
 *   → creates a battle, returns { battle, token }. The token proves
 *     "this browser is the creator side" for the submit route; only
 *     its SHA-256 hash is stored.
 * GET ?code=XXXXXX
 *   → the battle's public state (names, brains, results, winner —
 *     never token hashes).
 *
 * Required table: packages/frontend/supabase-squad-battles.sql
 * (arena_squad_battles). Until it exists, every call answers 503 with
 * { error: 'squad_unavailable' } and the UI says so plainly.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailable() {
  return NextResponse.json({ error: 'squad_unavailable' }, { status: 503 });
}

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

  const name = cleanName(body?.name);
  const brainId = cleanBrainId(body?.brainId);
  const terms = cleanTerms(body);
  if (!name || !brainId || !terms) {
    return NextResponse.json({ error: 'name, a valid brain, verse, domain and tier are required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailable();

  const token = newSideToken();
  const row = {
    code: newBattleCode(),
    verse: terms.verse,
    domain: terms.domain,
    tier: terms.tier,
    listed: body?.listed === true,
    status: 'waiting',
    creator_name: name,
    creator_brain_id: brainId,
    creator_brain_label: cleanBrainLabel(body?.brainLabel, brainId),
    creator_token_hash: hashToken(token),
  };

  // Code collisions are vanishingly unlikely (31^6) — retry once anyway.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from(SQUAD_TABLE)
      .insert(row)
      .select(SQUAD_PUBLIC_COLUMNS)
      .single();
    if (!error && data) {
      return NextResponse.json({ battle: sanitizeBattle(data as unknown as SquadRow), token });
    }
    if (isMissingTable(error)) return unavailable();
    if (error?.code !== '23505') break;
    row.code = newBattleCode();
  }
  return NextResponse.json({ error: 'Could not create the battle' }, { status: 503 });
}

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').toUpperCase().slice(0, 12);
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailable();

  const { data, error } = await supabase
    .from(SQUAD_TABLE)
    .select(SQUAD_PUBLIC_COLUMNS)
    .eq('code', code)
    .maybeSingle();
  if (isMissingTable(error)) return unavailable();
  if (error) return NextResponse.json({ error: 'lookup failed' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });

  return NextResponse.json({ battle: sanitizeBattle(data as unknown as SquadRow) });
}
