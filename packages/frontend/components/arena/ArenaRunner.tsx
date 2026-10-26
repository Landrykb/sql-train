'use client';

/**
 * Auto-Gauntlet — the idle arena. Your champion fights a series of matches
 * in the background while you do anything else in the app. Occasionally it
 * gets stuck and calls for a tactical decision — answer or lose the round.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getChampion, type Champion } from '@/lib/arena/champions';
import { ARENA_XP, awardChampionXp, getChampionProgress, getEvolvedStats } from '@/lib/arena/evolution';
import { markDuelPlayed, recordRivalResult } from '@/lib/arena/daily';
import { seededRng } from '@/lib/arena/replay';
import { playBleep } from '@/lib/audio';

export interface IntervChoice {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  winBoost: number; // added to round win probability
}

export interface Intervention {
  id: number;
  prompt: string;
  choices: IntervChoice[];
  deadline: number; // epoch ms
}

export interface FightView {
  matchIdx: number;
  round: number;
  champHp: number;
  rivalHp: number;
  lastEvent: string;
}

export interface GauntletResult {
  won: boolean;
  champWins: number;
  rivalWins: number;
}

export interface GauntletState {
  status: 'idle' | 'running' | 'done';
  championId: string;
  verse: string;
  tier: string;
  totalMatches: number;
  endless: boolean; // keep-fighting mode — rematches forever until stopped
  isDaily: boolean;  // this gauntlet is today's daily duel
  rivalName: string;
  fight: FightView;
  intervention: Intervention | null;
  results: GauntletResult[];
  xpEarned: number;
}

// How the user limits the champ's behavior while it fights on its own.
export interface RunnerPrefs {
  notify: boolean;          // browser-notification pings when the tab is hidden
  assist: 'always' | 'focused'; // 'always' asks anytime; 'focused' only asks while you're watching
  autoRematch: boolean;     // dive back in after the gauntlet completes
}

const PREFS_KEY = 'bleepxGauntletPrefs';
// remembers an in-flight gauntlet across reloads so the champ can "fight while you were gone"
const ACTIVE_GAUNTLET_KEY = 'bleepxActiveGauntlet';
const DEFAULT_PREFS: RunnerPrefs = { notify: true, assist: 'always', autoRematch: false };
const loadPrefs = (): RunnerPrefs => {
  try { return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')) }; }
  catch { return DEFAULT_PREFS; }
};

// Ghost rivals — the gauntlet rotates who your champ faces, not just the house bot.
const GHOST_RIVALS = ['VEX-7', 'NULLBYTE', 'PRAXIS-9', 'KOBOLD', 'SABLE'];

// Every intervention is a real engineering call — the label IS the technique,
// the hint is the tradeoff. Cornering your champ teaches real optimization vocab.
const INTERVENTION_PROMPTS: Record<string, { prompt: string; choices: IntervChoice[] }[]> = {
  sql: [
    {
      prompt: 'EXPLAIN shows a full seq scan over 2M rows — VEX-7\'s plan is faster. The call:',
      choices: [
        { id: 'safe', emoji: '🛡️', label: 'Composite index (region, ts)', hint: 'covering index — reliable', winBoost: 0.35 },
        { id: 'rush', emoji: '💨', label: 'CTE + early pre-filter', hint: 'planner may still seq-scan', winBoost: 0.15 },
        { id: 'wild', emoji: '🎲', label: 'Materialized view', hint: 'huge win or locking pain', winBoost: 0.02 },
      ],
    },
    {
      prompt: 'N+1 detected — 400 queries per render. Quick — the fix:',
      choices: [
        { id: 'fix', emoji: '🔧', label: 'Batch into one JOIN', hint: 'set-based, always lands', winBoost: 0.35 },
        { id: 'force', emoji: '⚡', label: 'LATERAL join per group', hint: 'elegant but fiddly', winBoost: 0.15 },
        { id: 'pray', emoji: '🙏', label: 'Cache in app memory', hint: 'fast demo, stale data', winBoost: 0.02 },
      ],
    },
    {
      prompt: 'The big join is timing out — VEX-7 is gaining. The play:',
      choices: [
        { id: 'defend', emoji: '🧱', label: 'Pre-aggregate in subquery', hint: 'shrinks the join input', winBoost: 0.35 },
        { id: 'counter', emoji: '🥊', label: 'Window fn over join', hint: 'one pass — powerful, tricky', winBoost: 0.15 },
        { id: 'gamble', emoji: '🃏', label: 'Partition table by date', hint: 'right answer, wrong deadline', winBoost: 0.02 },
      ],
    },
  ],
  cloud: [
    {
      prompt: 'Lambda is cold-starting on every burst — latency is bleeding. The call:',
      choices: [
        { id: 'safe', emoji: '🛡️', label: 'Provisioned concurrency', hint: 'warm pools, predictable', winBoost: 0.35 },
        { id: 'rush', emoji: '💨', label: 'Trim deps into one layer', hint: 'shaves init, fiddly bundle', winBoost: 0.15 },
        { id: 'wild', emoji: '🎲', label: 'SnapStart pre-warmed snapshot', hint: 'great or config hell', winBoost: 0.02 },
      ],
    },
    {
      prompt: 'Audit flags an over-privileged IAM role mid-mission. The fix:',
      choices: [
        { id: 'fix', emoji: '🔧', label: 'Least-privilege ARNs only', hint: 'correct, slower to write', winBoost: 0.35 },
        { id: 'force', emoji: '⚡', label: 'Wild resources, tight actions', hint: 'passes check, thin ice', winBoost: 0.15 },
        { id: 'pray', emoji: '🙏', label: 'Ship admin, fix later', hint: 'never ends well', winBoost: 0.02 },
      ],
    },
    {
      prompt: 'Pipeline bottleneck — everything queues behind one worker. The play:',
      choices: [
        { id: 'defend', emoji: '🧱', label: 'Fan out: SQS + workers', hint: 'classic decoupling', winBoost: 0.35 },
        { id: 'counter', emoji: '🥊', label: 'Parallel Step Functions', hint: 'powerful, easy to miswire', winBoost: 0.15 },
        { id: 'gamble', emoji: '🃏', label: 'Bigger instance', hint: 'money, not architecture', winBoost: 0.02 },
      ],
    },
  ],
  lab: [
    {
      prompt: 'A Python loop is crawling 500k rows — VEX-7 is way ahead. The call:',
      choices: [
        { id: 'safe', emoji: '🛡️', label: 'Vectorize with np.where', hint: 'SIMD speed, usually lands', winBoost: 0.35 },
        { id: 'rush', emoji: '💨', label: 'multiprocessing.Pool', hint: 'fast — pickling may bite', winBoost: 0.15 },
        { id: 'wild', emoji: '🎲', label: 'Numba @njit hot loop', hint: 'compiler magic or type errors', winBoost: 0.02 },
      ],
    },
    {
      prompt: 'Dataset load is blowing up memory. Quick — the fix:',
      choices: [
        { id: 'fix', emoji: '🔧', label: 'Downcast dtypes + categoricals', hint: 'often 10x smaller', winBoost: 0.35 },
        { id: 'force', emoji: '⚡', label: 'Stream with chunks=', hint: 'works, code gets ugly', winBoost: 0.15 },
        { id: 'pray', emoji: '🙏', label: 'Just load a sample', hint: 'fast demo, wrong answer', winBoost: 0.02 },
      ],
    },
    {
      prompt: 'A bug slipped in — groupby returns wrong aggregates. The play:',
      choices: [
        { id: 'defend', emoji: '🧱', label: '.pipe() assertion chain', hint: 'methodical, solid', winBoost: 0.35 },
        { id: 'counter', emoji: '🥊', label: 'Pure-dict reduce rewrite', hint: 'dodges pandas quirks', winBoost: 0.15 },
        { id: 'gamble', emoji: '🃏', label: 'Monkey-patch the agg', hint: 'works until it doesn\'t', winBoost: 0.02 },
      ],
    },
  ],
};

const verseKey = (verse: string) =>
  verse.toLowerCase().includes('cloud') ? 'cloud' : verse.toLowerCase().includes('lab') ? 'lab' : 'sql';

// Round flavor is verse-aware too — every ticker line narrates a real technique.
const HIT_LINES: Record<string, string[]> = {
  sql: ['went index-only — 4x faster!', 'pre-aggregated into a clean join.', 'read the plan like a book.', 'textbook window function.'],
  cloud: ['auto-scaled before the spike!', 'locked IAM tight and still shipped.', 'cached the hot path — clean p99.', 'textbook decoupling.'],
  lab: ['vectorized the whole column!', 'broadcast the op — zero loops.', 'fit it all in 200MB.', 'clean aggregation, first try.'],
};
const MISS_LINES: Record<string, string[]> = {
  sql: ['seq-scanned the whole table…', 'blew the join order.', 'deadlocked on the hot row.', 'needs the cornerman.'],
  cloud: ['throttled at the queue…', 'hit the service quota.', 'over-privileged — flagged.', 'cold-start cost the round.'],
  lab: ['iterrows ate the round…', 'dtype blew up to float64.', 'PicklingError mid-fan-out.', 'groupby keyed on the wrong column.'],
};
const ROUNDS_PER_MATCH = 3;
const ROUND_MS = 4200;
const BETWEEN_ROUNDS_MS = 1400;
const BETWEEN_MATCHES_MS = 2500;
const INTERVENTION_MS = 12000;

interface RunnerCtx {
  state: GauntletState;
  champion: Champion;
  prefs: RunnerPrefs;
  setPrefs: (p: Partial<RunnerPrefs>) => void;
  start: (opts: { championId: string; verse: string; tier: string; matches: number; daily?: boolean; rival?: string }) => void;
  answer: (choice: IntervChoice) => void;
  dismiss: () => void;
  stop: () => void;
  awayRecap: string | null;
  clearAwayRecap: () => void;
}

const Ctx = createContext<RunnerCtx | null>(null);
export function useArenaRunner() {
  return useContext(Ctx);
}

const initial: GauntletState = {
  status: 'idle', championId: 'dash', verse: 'SQL Arena', tier: 'rookie', totalMatches: 0, endless: false, isDaily: false, rivalName: 'VEX-7',
  fight: { matchIdx: 0, round: 0, champHp: 100, rivalHp: 100, lastEvent: '' },
  intervention: null, results: [], xpEarned: 0,
};

const notify = (title: string, body: string) => {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
    const n = new Notification(title, { body, tag: 'bleepx-gauntlet', icon: '/icons/icon-192x192.png' });
    n.onclick = () => window.focus();
  } catch { /* notifications unavailable */ }
};

export function ArenaRunnerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GauntletState>(initial);
  const [prefs, setPrefsState] = useState<RunnerPrefs>(DEFAULT_PREFS);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const st = useRef(state);
  st.current = state;
  const pf = useRef(prefs);
  pf.current = prefs;
  const matchWins = useRef({ champ: 0, rival: 0 });
  const interventionUsed = useRef(false);
  const [awayRecap, setAwayRecap] = useState<string | null>(null);
  const awaySince = useRef<number | null>(null);

  useEffect(() => { setPrefsState(loadPrefs()); }, []);

  // Offline catch-up: if a gauntlet was running when the app last closed,
  // simulate what happened in between (deterministic, capped) and recap it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_GAUNTLET_KEY);
      localStorage.removeItem(ACTIVE_GAUNTLET_KEY);
      if (!raw) return;
      const active: { champId: string; verse: string; at: number } = JSON.parse(raw);
      const elapsed = Date.now() - active.at;
      if (elapsed < 120_000) return; // nothing meaningful happened
      const fights = Math.min(5, Math.floor(elapsed / 90_000));
      if (fights <= 0) return;
      const rng = seededRng(active.at);
      const champ = getChampion(active.champId);
      const log = JSON.parse(localStorage.getItem('bleepxGauntletLog') || '[]');
      let w = 0;
      for (let i = 0; i < fights; i++) {
        const won = rng() < 0.5;
        if (won) w += 1;
        const cw = won ? 3 : Math.floor(rng() * 3);
        const rival = GHOST_RIVALS[Math.floor(rng() * GHOST_RIVALS.length)];
        log.unshift({ t: active.at + i * 90_000, champ: champ.id, verse: active.verse, tier: 'rookie', won, champWins: cw, rivalWins: 3 - cw, rival });
        recordRivalResult(rival, won);
      }
      localStorage.setItem('bleepxGauntletLog', JSON.stringify(log.slice(0, 30)));
      const xp = w * ARENA_XP.matchWon + (fights - w) * ARENA_XP.roundLost * 3;
      awardChampionXp(champ.id, xp);
      setAwayRecap(`While you were away: ${champ.name} picked ${fights} fight${fights > 1 ? 's' : ''} — ${w}W ${fights - w}L · +${xp}XP. Results in the arena.`);
    } catch { /* ignore */ }
  }, []);

  // "while you were away" recap — tab hidden → return → summarize log entries
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        awaySince.current = Date.now();
        // stamp the active-gauntlet marker so catch-up measures real away time
        try {
          const raw = localStorage.getItem(ACTIVE_GAUNTLET_KEY);
          if (raw) localStorage.setItem(ACTIVE_GAUNTLET_KEY, JSON.stringify({ ...JSON.parse(raw), at: Date.now() }));
        } catch { /* ignore */ }
        return;
      }
      const since = awaySince.current;
      awaySince.current = null;
      if (!since || Date.now() - since < 15000) return;
      try {
        const raw = localStorage.getItem('bleepxGauntletLog');
        const log: { t: number; champ: string; won: boolean; rivalWins: number; champWins: number }[] = raw ? JSON.parse(raw) : [];
        const fresh = log.filter((e) => e.t > since);
        if (!fresh.length) return;
        const w = fresh.filter((e) => e.won).length;
        const champ = getChampion(fresh[0].champ);
        setAwayRecap(`While you were away: ${champ.name} picked ${fresh.length} fight${fresh.length > 1 ? 's' : ''} — ${w}W ${fresh.length - w}L. Results in the arena.`);
      } catch { /* ignore */ }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const setPrefs = useCallback((p: Partial<RunnerPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...p };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  const finishRound = useCallback(() => {
    const s = st.current;
    const prog = getChampionProgress(s.championId);
    const champ = getChampion(s.championId);
    const evolved = getEvolvedStats(champ, prog.stage.level);
    // win prob grows with stage; buggy champs whiff more
    const winP = Math.min(0.88, Math.max(0.18, 0.5 + prog.stage.level * 0.06 - evolved.bugRate * 0.4));
    const champWon = Math.random() < winP;
    matchWins.current[champWon ? 'champ' : 'rival'] += 1;
    awardChampionXp(s.championId, champWon ? ARENA_XP.roundWon : ARENA_XP.roundLost);
    const hit = champWon ? 28 + Math.floor(Math.random() * 22) : 0;
    const taken = champWon ? 0 : 28 + Math.floor(Math.random() * 22);
    const pool = champWon ? HIT_LINES[verseKey(s.verse)] ?? HIT_LINES.sql : MISS_LINES[verseKey(s.verse)] ?? MISS_LINES.sql;
    const line = `${champ.name} ${pool[Math.floor(Math.random() * pool.length)]}`;
    setState((p) => ({
      ...p,
      xpEarned: p.xpEarned + (champWon ? ARENA_XP.roundWon : ARENA_XP.roundLost),
      fight: {
        ...p.fight,
        champHp: Math.max(0, p.fight.champHp - taken),
        rivalHp: Math.max(0, p.fight.rivalHp - hit),
        lastEvent: line,
      },
    }));
    return champWon;
  }, []);

  const finishMatch = useCallback(() => {
    const s = st.current;
    const champ = getChampion(s.championId);
    const { champ: cw, rival: rw } = matchWins.current;
    const won = cw > rw;
    if (won) awardChampionXp(s.championId, ARENA_XP.matchWon);
    const result: GauntletResult = { won, champWins: cw, rivalWins: rw };
    const results = [...s.results, result].slice(-30);
    const done = results.length >= s.totalMatches && !pf.current.autoRematch;
    const nextRival = GHOST_RIVALS[Math.floor(Math.random() * GHOST_RIVALS.length)];
    if (done) {
      const w = results.filter((r) => r.won).length;
      notify('🏁 Gauntlet done', `${champ.name} — ${w}W ${results.length - w}L · +${s.xpEarned}XP`);
      try { localStorage.removeItem(ACTIVE_GAUNTLET_KEY); } catch { /* ignore */ }
    }
    try {
      const raw = localStorage.getItem('bleepxGauntletLog');
      const log = raw ? JSON.parse(raw) : [];
      log.unshift({ t: Date.now(), champ: champ.id, verse: s.verse, tier: s.tier, daily: s.isDaily, rival: s.rivalName, ...result });
      localStorage.setItem('bleepxGauntletLog', JSON.stringify(log.slice(0, 30)));
      recordRivalResult(s.rivalName, won);
      if (s.isDaily) {
        markDuelPlayed();
        awardChampionXp(s.championId, 150); // daily bonus on top of normal XP
      }
      const pts = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
      localStorage.setItem('bleepxPoints', String(pts + (won ? ARENA_XP.matchWon : 0)));
    } catch { /* ignore */ }
    matchWins.current = { champ: 0, rival: 0 };
    interventionUsed.current = false;
    setState((p) => ({
      ...p,
      status: done ? 'done' : 'running',
      results,
      xpEarned: p.xpEarned + (won ? ARENA_XP.matchWon : 0),
      rivalName: nextRival,
      fight: {
        matchIdx: p.fight.matchIdx + 1,
        round: 0,
        champHp: 100,
        rivalHp: 100,
        lastEvent: won ? `${champ.name} takes the match! 🏆` : `${champ.name} drops the match…`,
      },
    }));
    return done;
  }, []);

  const playRound = useCallback(() => {
    const s = st.current;
    if (s.status !== 'running') return;
    const champ = getChampion(s.championId);
    setState((p) => ({ ...p, fight: { ...p.fight, round: p.fight.round + 1, lastEvent: `${champ.name} vs ${s.rivalName} — round ${p.fight.round + 1}…` } }));
    timer.current = setTimeout(() => {
      const doneRound = () => {
        const wonRound = finishRound();
        const { champ: cw, rival: rw } = matchWins.current;
        const roundsLeft = cw + rw < ROUNDS_PER_MATCH;
        if (!roundsLeft) {
          const last = finishMatch();
          if (!last) timer.current = setTimeout(() => playRound(), BETWEEN_MATCHES_MS);
        } else {
          timer.current = setTimeout(() => playRound(), BETWEEN_ROUNDS_MS);
        }
        return wonRound;
      };
      // intervention chance: once per match, ~40% — in 'focused' mode the champ
      // decides solo while you're away (no YOUR CALL when the tab is hidden)
      const askNow = pf.current.assist === 'always' || !document.hidden;
      if (!interventionUsed.current && Math.random() < 0.4 && askNow) {
        interventionUsed.current = true;
        const pool = INTERVENTION_PROMPTS[verseKey(st.current.verse)] ?? INTERVENTION_PROMPTS.sql;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const deadline = Date.now() + INTERVENTION_MS;
        setState((p) => ({
          ...p,
          intervention: { id: Date.now(), prompt: pick.prompt, choices: pick.choices, deadline },
        }));
        playBleep();
        notify(`⚡ YOUR CALL — ${champ.name} needs you`, pick.prompt);
        timer.current = setTimeout(() => {
          // unanswered — the champ fumbles the round
          setState((p) => ({ ...p, intervention: null, fight: { ...p.fight, lastEvent: `${getChampion(p.championId).name} hesitated — ${p.rivalName} capitalizes!` } }));
          matchWins.current.rival += 1;
          awardChampionXp(st.current.championId, ARENA_XP.roundLost);
          setState((p) => ({
            ...p,
            xpEarned: p.xpEarned + ARENA_XP.roundLost,
            fight: { ...p.fight, champHp: Math.max(0, p.fight.champHp - 40) },
          }));
          const { champ: cw2, rival: rw2 } = matchWins.current;
          if (cw2 + rw2 < ROUNDS_PER_MATCH) {
            timer.current = setTimeout(() => playRound(), BETWEEN_ROUNDS_MS);
          } else {
            const last = finishMatch();
            if (!last) timer.current = setTimeout(() => playRound(), BETWEEN_MATCHES_MS);
          }
        }, INTERVENTION_MS);
        return;
      }
      doneRound();
    }, ROUND_MS);
  }, [finishMatch, finishRound]);

  const answer = useCallback((choice: IntervChoice) => {
    clear();
    const s = st.current;
    const champ = getChampion(s.championId);
    setState((p) => ({ ...p, intervention: null, fight: { ...p.fight, lastEvent: `You called ${choice.emoji} ${choice.label}…` } }));
    timer.current = setTimeout(() => {
      const won = Math.random() < 0.3 + choice.winBoost * 1.6; // safe ≈ 86%, rush ≈ 54%, wild ≈ 33%
      matchWins.current[won ? 'champ' : 'rival'] += 1;
      awardChampionXp(s.championId, won ? ARENA_XP.playerRoundWon : ARENA_XP.roundLost);
      setState((p) => ({
        ...p,
        xpEarned: p.xpEarned + (won ? ARENA_XP.playerRoundWon : ARENA_XP.roundLost),
        fight: {
          ...p.fight,
          champHp: Math.max(0, p.fight.champHp - (won ? 0 : 34)),
          rivalHp: Math.max(0, p.fight.rivalHp - (won ? 40 : 0)),
          lastEvent: won ? `${champ.name} executes ${choice.label} — CLEAN HIT!` : `${champ.name}'s ${choice.label} backfires…`,
        },
      }));
      const { champ: cw, rival: rw } = matchWins.current;
      if (cw + rw < ROUNDS_PER_MATCH) {
        timer.current = setTimeout(() => playRound(), BETWEEN_ROUNDS_MS);
      } else {
        const last = finishMatch();
        if (!last) timer.current = setTimeout(() => playRound(), BETWEEN_MATCHES_MS);
      }
    }, 1400);
  }, [finishMatch, playRound]);

  const start = useCallback((opts: { championId: string; verse: string; tier: string; matches: number; daily?: boolean; rival?: string }) => {
    clear();
    matchWins.current = { champ: 0, rival: 0 };
    interventionUsed.current = false;
    setState({
      ...initial,
      status: 'running',
      championId: opts.championId,
      verse: opts.verse,
      tier: opts.tier,
      totalMatches: opts.matches,
      endless: pf.current.autoRematch,
      isDaily: !!opts.daily,
      rivalName: opts.rival ?? GHOST_RIVALS[Math.floor(Math.random() * GHOST_RIVALS.length)],
      fight: { matchIdx: 0, round: 0, champHp: 100, rivalHp: 100, lastEvent: `${getChampion(opts.championId).name} enters the gauntlet…` },
    });
    // mark an active gauntlet so the champ can "keep fighting" after a reload
    try { localStorage.setItem(ACTIVE_GAUNTLET_KEY, JSON.stringify({ champId: opts.championId, verse: opts.verse, at: Date.now() })); } catch { /* ignore */ }
    playBleep();
    // request notification permission lazily so away-pings can reach you
    try {
      if (pf.current.notify && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* ignore */ }
    timer.current = setTimeout(() => playRound(), 1800);
  }, [playRound]);

  const stop = useCallback(() => {
    clear();
    try { localStorage.removeItem(ACTIVE_GAUNTLET_KEY); } catch { /* ignore */ }
    setState((p) => ({ ...p, status: 'done', intervention: null, fight: { ...p.fight, lastEvent: 'Gauntlet called off.' } }));
  }, []);

  const dismiss = useCallback(() => {
    clear();
    try { localStorage.removeItem(ACTIVE_GAUNTLET_KEY); } catch { /* ignore */ }
    setState(initial);
  }, []);

  useEffect(() => clear, []);

  const champion = getChampion(state.championId);
  return (
    <Ctx.Provider value={{ state, champion, prefs, setPrefs, start, answer, dismiss, stop, awayRecap, clearAwayRecap: () => setAwayRecap(null) }}>
      {children}
    </Ctx.Provider>
  );
}
