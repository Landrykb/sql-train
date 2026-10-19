/**
 * Bleepx Arena — champion evolution.
 * Champions earn XP from arena fights AND from verse training
 * (bridged off the bleepxPoints economy via completedCases).
 * Each stage measurably changes the fighter: fewer bugs, better
 * quiz accuracy, faster/steadier typing — a buggy bot literally
 * learns to stop glitching.
 */

import type { Champion } from './champions';
import { CASE_TIERS } from '../constants';
import { LAB_CASE_TIERS } from '../labConstants';

export interface EvoStage {
  level: number;
  name: string;
  emoji: string;
  xpNeeded: number;   // cumulative XP required to reach this stage
  aura: string;       // ring glow color for the stage
  blurb: string;
}

export const EVO_STAGES: EvoStage[] = [
  { level: 0, name: 'Hatchling',  emoji: '🐣', xpNeeded: 0,    aura: '#64748B', blurb: 'Fresh out of the box. Raw and buggy.' },
  { level: 1, name: 'Trainee',    emoji: '🥊', xpNeeded: 150,  aura: '#60A5FA', blurb: 'Learning the ropes. Fewer face-plants.' },
  { level: 2, name: 'Contender',  emoji: '⚔️', xpNeeded: 400,  aura: '#34D399', blurb: 'Real fight instincts forming.' },
  { level: 3, name: 'Veteran',    emoji: '🛡️', xpNeeded: 800,  aura: '#A78BFA', blurb: 'Battle-tested. Bugs are rare now.' },
  { level: 4, name: 'Apex',       emoji: '👑', xpNeeded: 1400, aura: '#FBBF24', blurb: 'Top of the food chain.' },
  { level: 5, name: 'Legend',     emoji: '🌟', xpNeeded: 2200, aura: '#F472B6', blurb: 'The arena tells stories about this one.' },
];

const XP_KEY = 'bleepxChampionXp';        // { [championId]: number }
const TRAIN_SYNC_KEY = 'bleepxChampionTrainSync'; // { [championId]: points already converted }
export const SELECTED_KEY = 'bleepxChampionId';

/* Fraction of verse-training points converted into champion XP. */
const TRAIN_CONVERSION = 0.5;

/* Arena XP awards. */
export const ARENA_XP = {
  roundWon: 40,
  roundLost: 10,
  playerRoundWon: 60,   // coaching pays off — your own hit feeds the champ more
  matchWon: 80,
};

function readStore<T>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as T;
  } catch {
    return {} as T;
  }
}

export function getChampionXp(championId: string): number {
  if (typeof window === 'undefined') return 0;
  return readStore<Record<string, number>>(XP_KEY)[championId] ?? 0;
}

export function stageForXp(xp: number): EvoStage {
  let s = EVO_STAGES[0];
  for (const st of EVO_STAGES) if (xp >= st.xpNeeded) s = st;
  return s;
}

export interface ChampionProgress {
  xp: number;
  stage: EvoStage;
  nextStage: EvoStage | null;
  progressPct: number; // 0-100 toward next stage
}

export function getChampionProgress(championId: string): ChampionProgress {
  const xp = getChampionXp(championId);
  const stage = stageForXp(xp);
  const nextStage = EVO_STAGES[stage.level + 1] ?? null;
  const progressPct = nextStage
    ? Math.min(100, Math.round(((xp - stage.xpNeeded) / (nextStage.xpNeeded - stage.xpNeeded)) * 100))
    : 100;
  return { xp, stage, nextStage, progressPct };
}

/**
 * Award XP to a champion. Returns the new progress plus `evolved` /
 * `newStage` when this award crossed a stage boundary.
 */
export function awardChampionXp(championId: string, amount: number): { progress: ChampionProgress; evolved: boolean } {
  if (typeof window === 'undefined' || amount <= 0) {
    return { progress: getChampionProgress(championId), evolved: false };
  }
  const before = getChampionProgress(championId);
  const store = readStore<Record<string, number>>(XP_KEY);
  store[championId] = (store[championId] ?? 0) + Math.round(amount);
  try { localStorage.setItem(XP_KEY, JSON.stringify(store)); } catch { /* quota */ }
  const after = getChampionProgress(championId);
  return { progress: after, evolved: after.stage.level > before.stage.level };
}

export function getSelectedChampionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SELECTED_KEY);
}

export function setSelectedChampionId(id: string) {
  try { localStorage.setItem(SELECTED_KEY, id); } catch { /* quota */ }
}

/**
 * Bridge verse training into champion XP. Reads `completedCases`
 * (monotonic) + the same tier scoring useProgress uses, converts a
 * fraction of lifetime earned points into XP for the given champion,
 * and remembers what was already converted. Call on arena mount and
 * after any training completion.
 */
export function syncTrainingXp(championId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const completed: string[] = JSON.parse(
      localStorage.getItem('completedCases') || localStorage.getItem('completed') || '[]'
    );
    // Recompute lifetime earned points the same way useProgress does.
    const earned = completed.reduce(
      (sum, id) => sum + ((CASE_TIERS?.[id] ?? LAB_CASE_TIERS?.[id] ?? 1) * 10),
      0
    );
    const entitlement = Math.floor(earned * TRAIN_CONVERSION);
    const synced = readStore<Record<string, number>>(TRAIN_SYNC_KEY);
    const already = synced[championId] ?? 0;
    const delta = entitlement - already;
    if (delta <= 0) return 0;
    synced[championId] = entitlement;
    localStorage.setItem(TRAIN_SYNC_KEY, JSON.stringify(synced));
    awardChampionXp(championId, delta);
    return delta;
  } catch {
    return 0;
  }
}

export interface EvolvedStats {
  bugRate: number;
  quizAccuracy: number;
  typingSpeed: number;
  typeStyle: Champion['typeStyle'];
}

/**
 * Stage-scaled fighting stats — this is where evolution becomes visible:
 * bugRate decays hard (~28% per stage), quizAccuracy climbs toward .97,
 * typing speeds up, and erratic fighters settle into bursts at Veteran.
 */
export function getEvolvedStats(champion: Champion, stageLevel: number): EvolvedStats {
  const s = Math.max(0, Math.min(stageLevel, EVO_STAGES.length - 1));
  return {
    bugRate: Math.max(0.02, champion.bugRate * Math.pow(0.72, s)),
    quizAccuracy: Math.min(0.97, champion.quizAccuracy + (0.97 - champion.quizAccuracy) * (s / (EVO_STAGES.length - 1))),
    typingSpeed: Math.round(champion.typingSpeed * (1 + s * 0.08)),
    typeStyle: champion.typeStyle === 'erratic' && s >= 3 ? 'burst' : champion.typeStyle,
  };
}
