'use client';

/**
 * Auto-Gauntlet — the idle arena. Your champion fights a series of matches
 * in the background while you do anything else in the app. Occasionally it
 * gets stuck and calls for a tactical decision — answer or lose the round.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getChampion, type Champion } from '@/lib/arena/champions';
import { ARENA_XP, awardChampionXp, getChampionProgress, getEvolvedStats } from '@/lib/arena/evolution';
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
  fight: FightView;
  intervention: Intervention | null;
  results: GauntletResult[];
  xpEarned: number;
}

const INTERVENTION_PROMPTS: { prompt: string; choices: IntervChoice[] }[] = [
  {
    prompt: 'VEX-7 countered the query — your champ is hesitating. Call it:',
    choices: [
      { id: 'safe', emoji: '🛡️', label: 'Re-optimize', hint: 'steady, usually lands', winBoost: 0.35 },
      { id: 'rush', emoji: '💨', label: 'Rush it', hint: 'coin flip', winBoost: 0.15 },
      { id: 'wild', emoji: '🎲', label: 'Wildcard', hint: 'chaos — low odds', winBoost: 0.02 },
    ],
  },
  {
    prompt: 'A bug slipped into the code mid-fight. Quick — the fix:',
    choices: [
      { id: 'fix', emoji: '🔧', label: 'Patch it clean', hint: 'reliable recovery', winBoost: 0.35 },
      { id: 'force', emoji: '⚡', label: 'Force it through', hint: 'fast but fragile', winBoost: 0.15 },
      { id: 'pray', emoji: '🙏', label: 'Ship & pray', hint: 'the crowd gasps', winBoost: 0.02 },
    ],
  },
  {
    prompt: 'VEX-7 went aggressive — your champ is cornered. The play:',
    choices: [
      { id: 'defend', emoji: '🧱', label: 'Hold the line', hint: 'defensive, solid', winBoost: 0.35 },
      { id: 'counter', emoji: '🥊', label: 'Counter-punch', hint: 'swingy', winBoost: 0.15 },
      { id: 'gamble', emoji: '🃏', label: 'All-in', hint: 'glory or pain', winBoost: 0.02 },
    ],
  },
];

const HIT_LINES = ['landed a clean hit!', 'is on fire! 🔥', 'read it like a book.', 'textbook execution.'];
const MISS_LINES = ['took one on the chin…', 'whiffed that round.', 'is reeling…', 'needs the cornerman.'];
const ROUNDS_PER_MATCH = 3;
const ROUND_MS = 4200;
const BETWEEN_ROUNDS_MS = 1400;
const BETWEEN_MATCHES_MS = 2500;
const INTERVENTION_MS = 12000;

interface RunnerCtx {
  state: GauntletState;
  champion: Champion;
  start: (opts: { championId: string; verse: string; tier: string; matches: number }) => void;
  answer: (choice: IntervChoice) => void;
  dismiss: () => void;
  stop: () => void;
}

const Ctx = createContext<RunnerCtx | null>(null);
export function useArenaRunner() {
  return useContext(Ctx);
}

const initial: GauntletState = {
  status: 'idle', championId: 'dash', verse: 'SQL Arena', tier: 'rookie', totalMatches: 0,
  fight: { matchIdx: 0, round: 0, champHp: 100, rivalHp: 100, lastEvent: '' },
  intervention: null, results: [], xpEarned: 0,
};

export function ArenaRunnerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GauntletState>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const st = useRef(state);
  st.current = state;
  const matchWins = useRef({ champ: 0, rival: 0 });
  const interventionUsed = useRef(false);

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
    const line = champWon
      ? `${champ.name} ${HIT_LINES[Math.floor(Math.random() * HIT_LINES.length)]}`
      : `${champ.name} ${MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)]}`;
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
    const results = [...s.results, result];
    const done = results.length >= s.totalMatches;
    try {
      const raw = localStorage.getItem('bleepxGauntletLog');
      const log = raw ? JSON.parse(raw) : [];
      log.unshift({ t: Date.now(), champ: champ.id, verse: s.verse, tier: s.tier, ...result });
      localStorage.setItem('bleepxGauntletLog', JSON.stringify(log.slice(0, 30)));
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
    setState((p) => ({ ...p, fight: { ...p.fight, round: p.fight.round + 1, lastEvent: `${champ.name} vs VEX-7 — round ${p.fight.round + 1}…` } }));
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
      // intervention chance: once per match, ~40%
      if (!interventionUsed.current && Math.random() < 0.4) {
        interventionUsed.current = true;
        const pick = INTERVENTION_PROMPTS[Math.floor(Math.random() * INTERVENTION_PROMPTS.length)];
        const deadline = Date.now() + INTERVENTION_MS;
        setState((p) => ({
          ...p,
          intervention: { id: Date.now(), prompt: pick.prompt, choices: pick.choices, deadline },
        }));
        playBleep();
        timer.current = setTimeout(() => {
          // unanswered — the champ fumbles the round
          setState((p) => ({ ...p, intervention: null, fight: { ...p.fight, lastEvent: `${getChampion(p.championId).name} hesitated — VEX-7 capitalizes!` } }));
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
          lastEvent: won ? `${champ.name} executes your call — CLEAN HIT!` : `${champ.name} couldn't convert the call…`,
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

  const start = useCallback((opts: { championId: string; verse: string; tier: string; matches: number }) => {
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
      fight: { matchIdx: 0, round: 0, champHp: 100, rivalHp: 100, lastEvent: `${getChampion(opts.championId).name} enters the gauntlet…` },
    });
    playBleep();
    timer.current = setTimeout(() => playRound(), 1800);
  }, [playRound]);

  const stop = useCallback(() => {
    clear();
    setState((p) => ({ ...p, status: 'done', intervention: null, fight: { ...p.fight, lastEvent: 'Gauntlet called off.' } }));
  }, []);

  const dismiss = useCallback(() => {
    clear();
    setState(initial);
  }, []);

  useEffect(() => clear, []);

  const champion = getChampion(state.championId);
  return (
    <Ctx.Provider value={{ state, champion, start, answer, dismiss, stop }}>
      {children}
    </Ctx.Provider>
  );
}
