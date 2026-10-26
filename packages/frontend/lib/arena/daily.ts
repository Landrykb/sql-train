// Daily Duel — one featured fight per day, same for everyone (Wordle mechanic).
// Deterministic from the date so every player faces the same rival + verse,
// and streaks reward coming back daily.

export interface DailyDuelSpec {
  day: string;             // '2026-10-26'
  seed: number;
  rival: string;
  verse: string;           // display name ('SQL Arena' | 'Cloud Arena' | 'Lab Arena')
  tier: 'rookie' | 'pro' | 'boss';
  bonusXp: number;
}

export const RIVAL_POOL = ['VEX-7', 'NULLBYTE', 'PRAXIS-9', 'KOBOLD', 'SABLE', 'JINX', 'MERCURIAL'];
const VERSES = ['SQL Arena', 'Cloud Arena', 'Lab Arena'];
const TIERS: DailyDuelSpec['tier'][] = ['rookie', 'pro', 'boss'];

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// small deterministic hash — date → 0..2^31
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const dailyDuelSpec = (day = todayKey()): DailyDuelSpec => {
  const h = hash(`duel-${day}`);
  return {
    day,
    seed: h,
    rival: RIVAL_POOL[h % RIVAL_POOL.length],
    verse: VERSES[h % VERSES.length],
    tier: TIERS[Math.floor(h / 7) % TIERS.length],
    bonusXp: 150 + (Math.floor(h / 13) % 3) * 50, // 150-250
  };
};

const STREAK_KEY = 'bleepxDuelStreak';
export interface DuelStreak { count: number; lastDay: string }

export function getDuelStreak(): DuelStreak {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastDay: '' };
  } catch { return { count: 0, lastDay: '' }; }
}

/** Record that the daily duel was played today. Call once per win/loss resolution. */
export function markDuelPlayed(day = todayKey()): DuelStreak {
  const s = getDuelStreak();
  if (s.lastDay === day) return s;
  const yesterday = new Date(Date.now() - 86400000);
  const next: DuelStreak = {
    count: s.lastDay === todayKey(yesterday) ? s.count + 1 : 1,
    lastDay: day,
  };
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

/** Rival head-to-head records (ghost PvP ladder). */
const RIVAL_RECORDS_KEY = 'bleepxRivalRecords';
export interface RivalRecord { w: number; l: number }

export function getRivalRecords(): Record<string, RivalRecord> {
  try {
    const raw = localStorage.getItem(RIVAL_RECORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function recordRivalResult(rival: string, won: boolean) {
  const r = getRivalRecords();
  r[rival] = r[rival] || { w: 0, l: 0 };
  if (won) r[rival].w += 1; else r[rival].l += 1;
  try { localStorage.setItem(RIVAL_RECORDS_KEY, JSON.stringify(r)); } catch { /* ignore */ }
}
