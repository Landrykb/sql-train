/**
 * Squad Battle — server-only helpers for the /api/arena/squad routes.
 *
 * Trust rules (same spirit as the signed fight tickets on
 * /api/arena/brain-result):
 *  - Each side gets a random secret token at create/join time. Only its
 *    SHA-256 hash is stored, so reading the table never reveals a
 *    usable token.
 *  - A result is accepted only with the side's token, and the score is
 *    RECOMPUTED here from the per-round payload — summary numbers a
 *    client sends are never trusted.
 *  - The winner is computed here, never taken from the client.
 *  - Public reads return a sanitized shape: names, brains, terms,
 *    results, winner. Token hashes never leave the server.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { CHAMPIONS } from './champions';
import type { SquadBattle, SquadSide, SquadSideResult } from './squad';

export const SQUAD_TABLE = 'arena_squad_battles';

/* ── Rate limiting — same tiny per-IP approach as the other arena routes ── */
const hits = new Map<string, number[]>();
const LIMIT = 30;
const WINDOW_MS = 60_000;

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

/* ── Codes + tokens ── */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — easy to read aloud

export function newBattleCode(): string {
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export function newSideToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatches(token: string, storedHash: string | null | undefined): boolean {
  if (!token || !storedHash) return false;
  const a = Buffer.from(hashToken(token), 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ── Input validation (manual, matching the existing arena routes) ── */
export function cleanName(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, 24) : '';
}

export function cleanBrainId(v: unknown): string | null {
  if (v === 'byok') return 'byok';
  return CHAMPIONS.some((c) => c.id === v) ? (v as string) : null;
}

export function cleanBrainLabel(v: unknown, brainId: string): string {
  if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 80);
  if (brainId === 'byok') return 'Your own model';
  return CHAMPIONS.find((c) => c.id === brainId)?.name ?? brainId;
}

export function cleanTerms(body: any): { verse: string; domain: string; tier: string } | null {
  const verse = body?.verse;
  const tier = body?.tier;
  const domain = typeof body?.domain === 'string' ? body.domain.slice(0, 32) : '';
  if (!['sql', 'cloud', 'lab'].includes(verse)) return null;
  if (!['rookie', 'pro', 'boss'].includes(tier)) return null;
  if (!domain) return null;
  return { verse, domain, tier };
}

/**
 * Validate a submitted run and RECOMPUTE its score from the rounds.
 * Returns null for anything malformed. Summary fields sent by the
 * client are ignored — wins/correct/avgMs are derived here.
 */
export function sanitizeResult(body: any): SquadSideResult | null {
  if (!body || typeof body !== 'object' || !Array.isArray(body.rounds)) return null;
  const rounds: SquadSideResult['rounds'] = body.rounds.slice(0, 10).map((r: any) => ({
    name: typeof r?.name === 'string' ? r.name.slice(0, 80) : 'Round',
    won: r?.won === true,
    correct: r?.correct === true,
    ms: Math.max(0, Math.min(3_600_000, Math.round(Number(r?.ms) || 0))),
    byPlayer: r?.byPlayer === true,
  }));
  if (rounds.length === 0) return null;
  const brainId = cleanBrainId(body.brainId) ?? 'dash';
  return {
    wins: rounds.filter((r) => r.won).length,
    totalRounds: rounds.length,
    correct: rounds.filter((r) => r.correct).length,
    avgMs: Math.round(rounds.reduce((a, r) => a + r.ms, 0) / rounds.length),
    brainId,
    brainLabel: cleanBrainLabel(body.brainLabel, brainId),
    rounds,
  };
}

/** Winner from the two recomputed scores: rounds won, then correct, then speed. */
export function computeWinner(
  creator: SquadSideResult,
  joiner: SquadSideResult,
): SquadSide | 'draw' {
  if (creator.wins !== joiner.wins) return creator.wins > joiner.wins ? 'creator' : 'joiner';
  if (creator.correct !== joiner.correct) return creator.correct > joiner.correct ? 'creator' : 'joiner';
  if (creator.avgMs !== joiner.avgMs) return creator.avgMs < joiner.avgMs ? 'creator' : 'joiner';
  return 'draw';
}

/* ── Row → public shape ── */
export interface SquadRow {
  code: string;
  verse: string;
  domain: string;
  tier: string;
  listed: boolean;
  status: string;
  created_at: string;
  creator_name: string;
  creator_brain_id: string;
  creator_brain_label: string;
  creator_result: SquadSideResult | null;
  joiner_name: string | null;
  joiner_brain_id: string | null;
  joiner_brain_label: string | null;
  joiner_result: SquadSideResult | null;
  winner: string | null;
}

export const SQUAD_PUBLIC_COLUMNS =
  'code, verse, domain, tier, listed, status, created_at, creator_name, creator_brain_id, creator_brain_label, creator_result, joiner_name, joiner_brain_id, joiner_brain_label, joiner_result, winner';

export function sanitizeBattle(row: SquadRow): SquadBattle {
  return {
    code: row.code,
    verse: row.verse as SquadBattle['verse'],
    domain: row.domain,
    tier: row.tier as SquadBattle['tier'],
    listed: !!row.listed,
    status: row.status as SquadBattle['status'],
    createdAt: row.created_at,
    creator: {
      name: row.creator_name,
      brainId: row.creator_brain_id,
      brainLabel: row.creator_brain_label,
      result: row.creator_result ?? null,
    },
    joiner: row.joiner_name
      ? {
          name: row.joiner_name,
          brainId: row.joiner_brain_id ?? '',
          brainLabel: row.joiner_brain_label ?? '',
          result: row.joiner_result ?? null,
        }
      : null,
    winner: (row.winner as SquadBattle['winner']) ?? null,
  };
}

/** True when a Supabase error means the migration has not been applied yet. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /arena_squad_battles/.test(error.message ?? '');
}
