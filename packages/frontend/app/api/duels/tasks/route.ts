import { NextResponse } from 'next/server';
import { DUEL_SET_V1, DUEL_SET_VERSION, publicTaskSpec } from '@/lib/duels/tasks';

/**
 * GET /api/duels/tasks — the public TaskSpec set for the first
 * external-agent duels (DUEL_SET_V1).
 *
 * Prompts and metadata only: checker internals — where the expected
 * rows live, the assert scripts, the state validators — stay
 * server-side. An attempter (human or agent) gets the same task
 * description either way; the answer key is never part of the payload.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    set_version: DUEL_SET_VERSION,
    tasks: DUEL_SET_V1.map(publicTaskSpec),
  });
}
