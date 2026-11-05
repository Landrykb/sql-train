import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { SQUAD_TABLE, isMissingTable } from '@/lib/arena/squadServer';
import type { OpenChallenge } from '@/lib/arena/squad';

/**
 * GET /api/arena/squad/open — the Open challenges list.
 * Public battles still waiting for a second squad (listed = true,
 * status = 'waiting'), newest first. Names, brains and terms only —
 * no tokens, no result payloads. When the table is missing the list
 * is simply empty: the section hides itself instead of erroring.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ challenges: [] });

  const { data, error } = await supabase
    .from(SQUAD_TABLE)
    .select('code, verse, domain, tier, creator_name, creator_brain_label, created_at')
    .eq('listed', true)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data) {
    if (error && !isMissingTable(error)) {
      return NextResponse.json({ challenges: [] }, { status: 503 });
    }
    return NextResponse.json({ challenges: [] });
  }

  const challenges: OpenChallenge[] = data.map((r) => ({
    code: r.code,
    verse: r.verse,
    domain: r.domain,
    tier: r.tier,
    creatorName: r.creator_name,
    creatorBrainLabel: r.creator_brain_label,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ challenges });
}
