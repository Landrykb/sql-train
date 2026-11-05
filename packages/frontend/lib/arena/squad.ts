/**
 * Bleepx Arena — Squad Battle (community mode).
 *
 * A squad is one person + their agent. A battle is squad vs squad:
 * 2 people, 2 agents, the same fixed duel set, played whenever each
 * side has time. The creator shares a link; the second person opens
 * it, picks their agent, and plays. When both sides have played, the
 * server works out the winner from the two submitted scores.
 *
 * This module is the shared client-side half: types, the battle terms
 * (verses/categories/tiers mirror ArenaBattle's pickers and the
 * training registries, per the repo AGENTS.md), the API wrappers, the
 * local side-token store (localStorage, like the BYOK key — it never
 * leaves the visitor's browser except to prove "this is my side" to
 * the submit route), and the share helpers.
 */

import { CHAMPIONS } from './champions';
import { BYOK_MODELS, byokDisplayLabel, getByok, getByokModel, getByokResolved } from './byok';

export type SquadVerse = 'sql' | 'cloud' | 'lab';
export type SquadTier = 'rookie' | 'pro' | 'boss';
export type SquadStatus = 'waiting' | 'active' | 'complete';
export type SquadSide = 'creator' | 'joiner';

/** One round of a side's run — the same scoring shape a duel produces. */
export interface SquadRoundResult {
  name: string;
  won: boolean;      // the side's team (agent or human) took the round
  correct: boolean;  // the side's answer was right
  ms: number;        // solve + execute time for the round
  byPlayer: boolean; // the human fought this round (vs their agent)
}

/** A side's finished run — what gets submitted and compared. */
export interface SquadSideResult {
  wins: number;
  totalRounds: number;
  correct: number;
  avgMs: number;
  brainId: string;    // the brain that actually played (champion id or 'byok')
  brainLabel: string; // its display name
  rounds: SquadRoundResult[];
}

/** Sanitized battle state — exactly what the API returns. No tokens. */
export interface SquadBattle {
  code: string;
  verse: SquadVerse;
  domain: string;
  tier: SquadTier;
  listed: boolean;
  status: SquadStatus;
  createdAt: string;
  creator: { name: string; brainId: string; brainLabel: string; result: SquadSideResult | null };
  joiner: { name: string; brainId: string; brainLabel: string; result: SquadSideResult | null } | null;
  winner: SquadSide | 'draw' | null;
}

/** One row of the Open challenges list — names and terms only. */
export interface OpenChallenge {
  code: string;
  verse: SquadVerse;
  domain: string;
  tier: SquadTier;
  creatorName: string;
  creatorBrainLabel: string;
  createdAt: string;
}

/* ── Battle terms — mirror ArenaBattle's VERSES/TIERS and the ──
   ── training registries (repo AGENTS.md: arena categories must ──
   ── mirror SQL domains, Lab topics, Cloud providers).         ── */
export const SQUAD_VERSES: { id: SquadVerse; name: string; defaultCategory: string; categories: { id: string; label: string }[] }[] = [
  {
    id: 'sql', name: 'SQL Arena', defaultCategory: 'business',
    categories: [
      { id: 'business', label: 'Business' }, { id: 'crime', label: 'Crime' },
      { id: 'farming', label: 'Farming' }, { id: 'finance', label: 'Finance' },
      { id: 'healthcare', label: 'Healthcare' }, { id: 'social', label: 'Social' },
      { id: 'space', label: 'Space' }, { id: 'sports', label: 'Sports' },
      { id: 'trials', label: 'Trials' },
    ],
  },
  {
    id: 'cloud', name: 'Cloud Arena', defaultCategory: 'all',
    categories: [
      { id: 'all', label: 'All' }, { id: 'aws', label: 'AWS' }, { id: 'azure', label: 'Azure' },
      { id: 'gcp', label: 'GCP' }, { id: 'multi', label: 'Multi-Cloud' },
    ],
  },
  {
    id: 'lab', name: 'Lab Arena', defaultCategory: 'all',
    categories: [
      { id: 'all', label: 'All' }, { id: 'statistics', label: 'Statistics' },
      { id: 'probability', label: 'Probability' }, { id: 'python', label: 'Python' },
      { id: 'data_analysis', label: 'Data Analysis' }, { id: 'machine_learning', label: 'Machine Learning' },
      { id: 'evaluation', label: 'Evaluation' }, { id: 'feature_engineering', label: 'Feature Eng' },
      { id: 'visualization', label: 'Visualization' }, { id: 'clustering', label: 'Clustering' },
      { id: 'time_series', label: 'Time Series' }, { id: 'deep_learning', label: 'Deep Learning' },
      { id: 'llm', label: 'LLMs & NLP' }, { id: 'mlops', label: 'MLOps' },
    ],
  },
];

export const SQUAD_TIERS: { id: SquadTier; name: string }[] = [
  { id: 'rookie', name: 'Rookie' },
  { id: 'pro', name: 'Pro' },
  { id: 'boss', name: 'Boss' },
];

export function verseName(verse: string): string {
  return SQUAD_VERSES.find((v) => v.id === verse)?.name ?? 'Arena';
}

export function categoryLabel(verse: string, domain: string): string {
  return SQUAD_VERSES.find((v) => v.id === verse)?.categories.find((c) => c.id === domain)?.label ?? domain;
}

export function tierName(tier: string): string {
  return SQUAD_TIERS.find((t) => t.id === tier)?.name ?? tier;
}

/* ── Brains — a squad's agent is a house champion or the visitor's ──
   ── own connected model (BYOK), exactly like the solo Arena.    ── */
export interface BrainOption { id: string; label: string; hint: string }

export function brainOptions(): BrainOption[] {
  const champs: BrainOption[] = CHAMPIONS.map((c) => ({
    id: c.id,
    label: c.name,
    hint: `${c.title} — house champion`,
  }));
  const byok = getByok();
  if (byok) {
    champs.push({
      id: 'byok',
      label: byokDisplayLabel(BYOK_MODELS, getByokModel(), getByokResolved()),
      hint: 'Your own model — connected in this browser',
    });
  }
  return champs;
}

export function brainLabelFor(brainId: string): string {
  if (brainId === 'byok') {
    return byokDisplayLabel(BYOK_MODELS, getByokModel(), getByokResolved());
  }
  return CHAMPIONS.find((c) => c.id === brainId)?.name ?? brainId;
}

export function isBrainId(id: string): boolean {
  return id === 'byok' || CHAMPIONS.some((c) => c.id === id);
}

/* ── Side tokens — stored per battle in this browser only. ── */
const SIDES_KEY = 'bleepx_squad_sides';

export interface StoredSide { side: SquadSide; token: string }

export function getStoredSide(code: string): StoredSide | null {
  try {
    const raw = localStorage.getItem(SIDES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, StoredSide>;
    const s = map[code.toUpperCase()];
    return s && (s.side === 'creator' || s.side === 'joiner') && typeof s.token === 'string' ? s : null;
  } catch {
    return null;
  }
}

export function storeSide(code: string, side: SquadSide, token: string): void {
  try {
    const raw = localStorage.getItem(SIDES_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, StoredSide>) : {};
    map[code.toUpperCase()] = { side, token };
    localStorage.setItem(SIDES_KEY, JSON.stringify(map));
  } catch { /* storage unavailable — the side link still works for viewing */ }
}

/* ── API wrappers ── */
export type SquadApiError = 'unavailable' | 'not_found' | 'full' | 'bad_request' | 'unknown';

async function squadFetch(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const r = await fetch(path, init);
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

export async function createBattle(input: {
  name: string; brainId: string; verse: SquadVerse; domain: string; tier: SquadTier; listed: boolean;
}): Promise<{ battle: SquadBattle; token: string } | { error: SquadApiError }> {
  const { ok, status, data } = await squadFetch('/api/arena/squad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, brainLabel: brainLabelFor(input.brainId) }),
  });
  if (ok && data?.battle && data?.token) {
    storeSide(data.battle.code, 'creator', data.token);
    return { battle: data.battle as SquadBattle, token: data.token as string };
  }
  return { error: status === 503 ? 'unavailable' : status === 400 ? 'bad_request' : 'unknown' };
}

export async function joinBattle(
  code: string,
  input: { name: string; brainId: string },
): Promise<{ battle: SquadBattle; token: string } | { error: SquadApiError }> {
  const { ok, status, data } = await squadFetch('/api/arena/squad/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, ...input, brainLabel: brainLabelFor(input.brainId) }),
  });
  if (ok && data?.battle && data?.token) {
    storeSide(code, 'joiner', data.token);
    return { battle: data.battle as SquadBattle, token: data.token as string };
  }
  return { error: status === 503 ? 'unavailable' : status === 404 ? 'not_found' : status === 409 ? 'full' : status === 400 ? 'bad_request' : 'unknown' };
}

export async function getBattle(code: string): Promise<{ battle: SquadBattle } | { error: SquadApiError }> {
  const { ok, status, data } = await squadFetch(`/api/arena/squad?code=${encodeURIComponent(code)}`);
  if (ok && data?.battle) return { battle: data.battle as SquadBattle };
  return { error: status === 503 ? 'unavailable' : status === 404 ? 'not_found' : 'unknown' };
}

export async function getOpenChallenges(): Promise<OpenChallenge[]> {
  const { ok, data } = await squadFetch('/api/arena/squad/open');
  if (ok && Array.isArray(data?.challenges)) return data.challenges as OpenChallenge[];
  return [];
}

export async function submitSideResult(
  code: string,
  token: string,
  result: SquadSideResult,
): Promise<{ battle: SquadBattle } | { error: SquadApiError }> {
  const { ok, status, data } = await squadFetch('/api/arena/squad/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, token, result }),
  });
  if (ok && data?.battle) return { battle: data.battle as SquadBattle };
  return { error: status === 503 ? 'unavailable' : status === 404 ? 'not_found' : status === 401 ? 'bad_request' : 'unknown' };
}

/* ── Sharing ── */
export function battlePath(code: string): string {
  return `/arena/squad/${code.toUpperCase()}`;
}

export function battleUrl(code: string): string {
  if (typeof window === 'undefined') return battlePath(code);
  return `${window.location.origin}${battlePath(code)}`;
}

/** The challenge voice — matches the Arena's existing share text style. */
export function squadShareText(creatorName?: string): string {
  const who = creatorName ? `${creatorName} challenges you` : 'I challenge you';
  return `${who}: my AI and me vs you and yours. Same tasks. Best score wins.`;
}
