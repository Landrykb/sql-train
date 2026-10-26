// Seeded match replay — powers /arena/watch?d=... spectate links.
// Encodes a full match's events into a compact URL-safe seed so anyone can
// "watch" the fight deterministically without a backend.

export interface ReplayEvent {
  round: number;
  kind: 'hit' | 'miss' | 'call' | 'ko';
  line: string;
  champHp: number;
  rivalHp: number;
}

export interface MatchReplay {
  champ: string;
  champSprite: string;
  champColor: string;
  rival: string;
  rivalSprite: string;
  rivalColor: string;
  verse: string;
  tier: string;
  events: ReplayEvent[];
  result: { won: boolean; champWins: number; rivalWins: number };
}

// mulberry32 — tiny deterministic PRNG
export const seededRng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const WIN_LINES = [
  'went index-only — 4x faster!', 'pre-aggregated before the join — clean!', 'one-shot the whole round!',
  'vectorized it — 12x on the loop!', 'fanned out workers — done in parallel!', 'pruned the plan — instant!',
];
const LOSE_LINES = [
  'N+1\'d it — 400 queries too many…', 'cold-started at the worst moment…', 'full seq scan ate the round…',
  'locked the wrong row — deadlock!', 'OOM\'d loading the frame…', 'over-provisioned — too slow!',
];

/** Encode a replay to a compact URL param. */
export function encodeReplay(r: MatchReplay): string {
  const json = JSON.stringify({
    c: r.champ, cs: r.champSprite, cc: r.champColor,
    r: r.rival, rs: r.rivalSprite, rc: r.rivalColor,
    v: r.verse, t: r.tier, e: r.events, w: r.result,
  });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeReplay(param: string): MatchReplay | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const j = JSON.parse(new TextDecoder().decode(bytes));
    return {
      champ: j.c, champSprite: j.cs, champColor: j.cc,
      rival: j.r, rivalSprite: j.rs, rivalColor: j.rc,
      verse: j.v, tier: j.t, events: j.e, result: j.w,
    };
  } catch { return null; }
}

/** Generate a deterministic scripted match from a seed (used for demo/watch links). */
export function generateReplay(seed: number, champ: { name: string; sprite: string; color: string }, rivalName: string, rivalSprite: string, rivalColor: string, verse: string, tier: string): MatchReplay {
  const rng = seededRng(seed);
  const events: ReplayEvent[] = [];
  let champHp = 100, rivalHp = 100, cw = 0, rw = 0;
  for (let round = 0; round < 3; round++) {
    const champWon = rng() < 0.55;
    const dmg = 28 + Math.floor(rng() * 22);
    if (champWon) { cw += 1; rivalHp = Math.max(0, rivalHp - dmg); }
    else { rw += 1; champHp = Math.max(0, champHp - dmg); }
    const pool = champWon ? WIN_LINES : LOSE_LINES;
    events.push({
      round,
      kind: champWon ? 'hit' : 'miss',
      line: `${champ.name} ${pool[Math.floor(rng() * pool.length)]}`,
      champHp,
      rivalHp,
    });
    if (champHp <= 0 || rivalHp <= 0) break;
  }
  return {
    champ: champ.name, champSprite: champ.sprite, champColor: champ.color,
    rival: rivalName, rivalSprite, rivalColor,
    verse, tier,
    events,
    result: { won: cw > rw, champWins: cw, rivalWins: rw },
  };
}
