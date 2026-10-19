'use client';

/**
 * Bleepx Arena — the duel.
 * Pick a champion + strategy, watch it fight VEX-7 (the house bot)
 * through real cases, or tag in and fight one round yourself.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { initSQL, loadCSV, runQuery } from '@/lib/sqlClient/browser';
import { compareResults } from '@/lib/compare';
import { CHAMPIONS, STRATEGY_CARDS, RIVAL, type Champion, type StrategyCard } from '@/lib/arena/champions';
import { playBleep } from '@/lib/audio';

interface RoundDef {
  id: string;
  name: string;
  tier: number;
  instructions: string;
  skills: string[];
  datasets: { name: string; file: string }[];
  schema: { name: string; columns: { name: string; type: string }[] }[];
  solutionQuery: string;
  seedQuery: string;
}

interface FighterResult {
  sql: string;
  correct: boolean | null;
  solveMs: number;
  execMs: number;
  rows: number;
  error?: string;
}

interface RoundResult {
  round: RoundDef;
  champ: FighterResult;
  rival: FighterResult;
  champWon: boolean;
  byPlayer: boolean;
}

type Phase = 'select' | 'loading' | 'fight' | 'done';
type FightStep = 'intro' | 'typing' | 'youFight' | 'executing' | 'verdict';

const BG = '#1C2129';
const TEAL = '#57ECF4';

/* Reveals SQL like it's being typed live. */
function TypedSql({ text, cps, active, onDone }: { text: string; cps: number; active: boolean; onDone?: () => void }) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    setShown(0);
    doneRef.current = false;
    if (!text) { doneRef.current = true; onDone?.(); return; }
    const tick = Math.max(8, Math.floor(1000 / cps));
    const step = Math.max(1, Math.floor(cps / 50));
    const t = setInterval(() => {
      setShown((s) => {
        const n = s + step;
        if (n >= text.length) {
          clearInterval(t);
          if (!doneRef.current) { doneRef.current = true; onDone?.(); }
          return text.length;
        }
        return n;
      });
    }, tick);
    return () => clearInterval(t);
  }, [text, cps, active]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed font-mono text-slate-200 min-h-[3rem]">
      {text.slice(0, shown)}
      {shown < text.length && <span className="animate-pulse">▌</span>}
    </pre>
  );
}

function Avatar({ color, emoji, size = 'md' }: { color: string; emoji: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-16 h-16 text-3xl' : size === 'sm' ? 'w-8 h-8 text-base' : 'w-11 h-11 text-xl';
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center bg-[#0d1117] border-2 shrink-0`}
      style={{ borderColor: color, boxShadow: `0 0 14px ${color}66` }}
    >
      {emoji}
    </div>
  );
}

export default function ArenaBattle() {
  const [phase, setPhase] = useState<Phase>('select');
  const [champion, setChampion] = useState<Champion>(CHAMPIONS[0]);
  const [strategy, setStrategy] = useState<StrategyCard>(STRATEGY_CARDS[0]);
  const [mode, setMode] = useState<'coach' | 'tagteam'>('coach');
  const [rounds, setRounds] = useState<RoundDef[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [step, setStep] = useState<FightStep>('intro');
  const [champSql, setChampSql] = useState('');
  const [rivalSql, setRivalSql] = useState('');
  const [champTyped, setChampTyped] = useState(false);
  const [rivalTyped, setRivalTyped] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [verdict, setVerdict] = useState<string>('');
  const [playerSql, setPlayerSql] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const domain = 'business';
  const playerRound = 2; // last round in tag-team mode

  const isPlayerRound = mode === 'tagteam' && roundIdx === playerRound;

  const loadMatch = useCallback(async () => {
    setPhase('loading');
    setStatus('Preparing the arena…');
    try {
      const resp = await fetch(`/api/arena/match?domain=${domain}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? 'Failed to load match');
      setRounds(data.rounds);
      setStatus('Loading datasets…');
      await initSQL();
      const seen = new Set<string>();
      for (const r of data.rounds as RoundDef[]) {
        for (const d of r.datasets) {
          if (!seen.has(d.name)) {
            seen.add(d.name);
            await loadCSV(d.name, d.file);
          }
        }
      }
      setPhase('fight');
      setRoundIdx(0);
      setStep('intro');
    } catch (err: any) {
      setStatus(`Couldn't open the arena: ${err.message}`);
      setPhase('select');
    }
  }, []);

  // Score a side's SQL: run it, compare against the canonical solution.
  const runAndScore = useCallback(async (sql: string, round: RoundDef): Promise<FighterResult> => {
    const t0 = performance.now();
    try {
      const res = await runQuery(sql);
      const execMs = Math.round(performance.now() - t0);
      const cols = res?.columns ?? [];
      const grid = (res?.data ?? []).map((row: unknown[]) =>
        Object.fromEntries(cols.map((c, i) => [c, row[i]]))
      ) as Record<string, string | number | null>[];
      const { correct } = await compareResults(grid, [], round.solutionQuery, sql, []);
      return { sql, correct, solveMs: 0, execMs, rows: grid.length };
    } catch (err: any) {
      return { sql, correct: false, solveMs: 0, execMs: Math.round(performance.now() - t0), rows: 0, error: err?.message };
    }
  }, []);

  // Drive one round.
  useEffect(() => {
    if (phase !== 'fight' || step !== 'intro') return;
    const round = rounds[roundIdx];
    if (!round) return;
    let cancelled = false;

    const go = async () => {
      setChampSql('');
      setRivalSql('');
      setChampTyped(false);
      setRivalTyped(false);
      setVerdict('');
      setPlayerSql(round.seedQuery || '-- write your query here\nSELECT 1;');

      if (isPlayerRound) {
        setStep('youFight');
        return;
      }

      // Champion solves via API while rival "types" the canonical answer.
      const t0 = performance.now();
      const solvePromise = fetch('/api/arena/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, caseId: round.id, championId: champion.id, strategyId: strategy.id }),
      })
        .then((r) => r.json())
        .then((d) => ({ sql: d?.sql ?? 'SELECT 1;', ms: Math.round(performance.now() - t0) }))
        .catch(() => ({ sql: 'SELECT 1;', ms: Math.round(performance.now() - t0) }));

      const rivalDelay = RIVAL.solveDelayMs[roundIdx % RIVAL.solveDelayMs.length];
      const [solve] = await Promise.all([solvePromise, new Promise((r) => setTimeout(r, Math.min(rivalDelay, 400)))]);
      if (cancelled) return;

      (window as any).__champSolveMs = solve.ms;
      setRivalSql(round.solutionQuery);
      setChampSql(solve.sql);
      setStep('typing');
    };

    go();
    return () => { cancelled = true; };
  }, [phase, step, roundIdx, rounds, champion, strategy, isPlayerRound]);

  // When both SQLs are revealed, execute.
  useEffect(() => {
    if (step !== 'typing') return;
    if (!champTyped || !rivalTyped) return;
    setStep('executing');
  }, [step, champTyped, rivalTyped]);

  useEffect(() => {
    if (step !== 'executing') return;
    let cancelled = false;
    const round = rounds[roundIdx];
    const run = async () => {
      const champSolveMs = (window as any).__champSolveMs ?? 0;
      const rivalSolveMs = RIVAL.solveDelayMs[roundIdx % RIVAL.solveDelayMs.length];
      const [champRes, rivalRes] = await Promise.all([
        runAndScore(isPlayerRound ? playerSql : champSql, round),
        runAndScore(round.solutionQuery, round),
      ]);
      if (cancelled) return;
      const champ: FighterResult = { ...champRes, solveMs: champSolveMs };
      const rival: FighterResult = { ...rivalRes, solveMs: rivalSolveMs };

      let champWon = false;
      if (champ.correct && !rival.correct) champWon = true;
      else if (champ.correct && rival.correct) champWon = champ.solveMs + champ.execMs < rival.solveMs + rival.execMs;
      const label = isPlayerRound ? 'You' : champion.name;
      const winsVerb = isPlayerRound ? 'win' : 'wins';
      const wasVerb = isPlayerRound ? 'were' : 'was';
      const possLabel = isPlayerRound ? 'your' : `${label}'s`;
      const v = champ.correct && champWon
        ? `${label} ${winsVerb} the round — correct and faster!`
        : champ.correct
        ? `${label} ${wasVerb} right but ${RIVAL.name} was faster.`
        : `${RIVAL.name} takes the round — ${possLabel} query missed.${champ.error ? ` (${champ.error})` : ''}`;

      setVerdict(v);
      setResults((rs) => [...rs, { round, champ, rival, champWon, byPlayer: isPlayerRound }]);
      setStep('verdict');
      playBleep();
    };
    run();
    return () => { cancelled = true; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextRound = () => {
    playBleep();
    if (roundIdx + 1 >= rounds.length) {
      setPhase('done');
    } else {
      setRoundIdx((i) => i + 1);
      setStep('intro');
    }
  };

  const playerFight = () => {
    (window as any).__champSolveMs = 0;
    setChampSql(playerSql);
    setRivalSql(rounds[roundIdx].solutionQuery);
    setStep('typing');
  };

  // Match card data
  const wins = results.filter((r) => r.champWon).length;
  const correct = results.filter((r) => r.champ.correct).length;
  const totalRounds = results.length;
  const avgMs = results.length
    ? Math.round(results.reduce((a, r) => a + r.champ.solveMs + r.champ.execMs, 0) / results.length)
    : 0;
  const matchWon = wins > totalRounds - wins;
  const xp = wins * 100 + (matchWon ? 120 : 0);

  useEffect(() => {
    if (phase !== 'done' || xpAwarded) return;
    setXpAwarded(true);
    try {
      const pts = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
      localStorage.setItem('bleepxPoints', String(pts + xp));
      const raw = localStorage.getItem('bleepxArenaStats');
      const st = raw ? JSON.parse(raw) : { matches: 0, wins: 0, xp: 0 };
      st.matches += 1;
      if (matchWon) st.wins += 1;
      st.xp += xp;
      localStorage.setItem('bleepxArenaStats', JSON.stringify(st));
    } catch { /* ignore storage errors */ }
  }, [phase, xpAwarded, xp, matchWon]);

  const shareText = `⚔️ BLEEPX ARENA — ${isPlayerRound || mode === 'tagteam' ? 'You + ' : ''}${champion.name} ${wins}-${totalRounds - wins} vs ${RIVAL.name}
Business Arena • ${correct}/${totalRounds} correct • avg ${(avgMs / 1000).toFixed(1)}s
${matchWon ? 'W. My bot holds the belt.' : 'L. Running it back.'}
Think your champion beats mine? ${typeof window !== 'undefined' ? window.location.origin + '/arena' : ''}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }
    } catch { /* fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  /* ─── SELECT ─── */
  if (phase === 'select' || phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ background: BG }}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="text-3xl font-black text-white tracking-tight">BLEEPX ARENA</h1>
          <p className="text-sm mt-2 max-w-xs mx-auto" style={{ color: TEAL }}>
            Coach your champion through {MAX_ROUNDS_DISPLAY} rounds against {RIVAL.name}, the house bot. Or tag in and fight one yourself.
          </p>
          {status && <p className="text-xs text-slate-400 mt-3">{status}</p>}
        </div>

        {phase === 'loading' ? (
          <div className="flex flex-col items-center gap-3 mt-10">
            <div className="w-10 h-10 rounded-full border-4 border-slate-700 animate-spin" style={{ borderTopColor: TEAL }} />
            <p className="text-slate-400 text-sm">Loading arena…</p>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Pick your champion</p>
              <div className="space-y-3">
                {CHAMPIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setChampion(c); playBleep(); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                      champion.id === c.id ? 'bg-slate-800/80 scale-[1.02]' : 'bg-slate-800/30 opacity-70 hover:opacity-100'
                    }`}
                    style={{ borderColor: champion.id === c.id ? c.color : '#2B333C' }}
                  >
                    <Avatar color={c.color} emoji={c.emoji} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">
                        {c.name} <span className="font-normal text-slate-400">· {c.title}</span>
                      </p>
                      <p className="text-xs text-slate-400 truncate">{c.blurb}</p>
                    </div>
                    {champion.id === c.id && <span className="text-lg">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Strategy card</p>
              <div className="grid grid-cols-3 gap-2">
                {STRATEGY_CARDS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setStrategy(s); playBleep(); }}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      strategy.id === s.id ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70'
                    }`}
                    style={{ borderColor: strategy.id === s.id ? TEAL : '#2B333C' }}
                  >
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <p className="text-[11px] font-bold text-white leading-tight">{s.name}</p>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">{strategy.description}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">How do you play?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('coach')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${mode === 'coach' ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70'}`}
                  style={{ borderColor: mode === 'coach' ? TEAL : '#2B333C' }}
                >
                  <p className="font-bold text-white text-sm">🎧 Coach mode</p>
                  <p className="text-[11px] text-slate-400 mt-1">Watch & tune. Your champion fights all 3 rounds.</p>
                </button>
                <button
                  onClick={() => setMode('tagteam')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${mode === 'tagteam' ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70'}`}
                  style={{ borderColor: mode === 'tagteam' ? TEAL : '#2B333C' }}
                >
                  <p className="font-bold text-white text-sm">🤝 Tag-team</p>
                  <p className="text-[11px] text-slate-400 mt-1">Champion fights 2 rounds — you fight the last one.</p>
                </button>
              </div>
            </div>

            <button
              onClick={loadMatch}
              className="w-full py-4 rounded-2xl font-black text-lg tracking-wide text-[#0d1117] transition-transform active:scale-95"
              style={{ background: TEAL, boxShadow: `0 0 24px ${TEAL}55` }}
            >
              ENTER THE ARENA
            </button>
            <p className="text-center text-[11px] text-slate-500">
              {mode === 'tagteam' ? 'You fight round 3 — your champion warms up on 1–2.' : `${champion.name} fights all ${MAX_ROUNDS_DISPLAY} rounds under ${strategy.name}.`}
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ─── MATCH CARD ─── */
  if (phase === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ background: BG }}>
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl" style={{ boxShadow: `0 0 40px ${TEAL}22` }}>
          <p className="text-center text-[11px] font-bold tracking-[0.3em] text-slate-400 mb-5">MATCH RESULT</p>
          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar color={champion.color} emoji={champion.emoji} size="lg" />
              <p className="text-xs font-bold" style={{ color: champion.color }}>{champion.name.toUpperCase()}</p>
            </div>
            <p className="text-4xl font-black text-white">{wins}<span className="text-slate-600 mx-2">—</span>{totalRounds - wins}</p>
            <div className="flex flex-col items-center gap-2">
              <Avatar color={RIVAL.color} emoji={RIVAL.emoji} size="lg" />
              <p className="text-xs font-bold" style={{ color: RIVAL.color }}>{RIVAL.name}</p>
            </div>
          </div>
          <p className="text-center text-lg font-black mb-5" style={{ color: matchWon ? '#4ADE80' : '#F87171' }}>
            {matchWon ? '🏆 MATCH WON' : '💀 DEFEATED'}
          </p>
          <div className="space-y-3 mb-5">
            <StatBar label="CORRECT" left={`${correct}/${totalRounds}`} right={`${results.filter((r) => r.rival.correct).length}/${totalRounds}`} pct={totalRounds ? (correct / totalRounds) * 100 : 0} />
            <StatBar label="AVG SOLVE TIME" left={`${(avgMs / 1000).toFixed(1)}s`} right={`${((results.reduce((a, r) => a + r.rival.solveMs + r.rival.execMs, 0) / Math.max(1, totalRounds)) / 1000).toFixed(1)}s`} pct={Math.min(100, 3000 / Math.max(1, avgMs) * 50)} />
            <StatBar label="ROUNDS WON" left={`${wins}/${totalRounds}`} right={`${totalRounds - wins}/${totalRounds}`} pct={totalRounds ? (wins / totalRounds) * 100 : 0} />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-800/70 px-4 py-3 mb-5">
            <p className="text-sm font-bold" style={{ color: TEAL }}>+{xp} XP</p>
            <p className="text-[11px] text-slate-400">added to your Bleepx points</p>
          </div>
          <button
            onClick={share}
            className="w-full py-3.5 rounded-2xl font-black text-[#0d1117] mb-3 transition-transform active:scale-95"
            style={{ background: TEAL }}
          >
            {copied ? 'COPIED!' : 'SHARE RESULT'}
          </button>
          <button
            onClick={() => { setPhase('select'); setStatus(''); setResults([]); setRoundIdx(0); setXpAwarded(false); }}
            className="w-full py-3 rounded-2xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            RUN IT BACK
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-6">better bots. brighter wins.</p>
      </div>
    );
  }

  /* ─── FIGHT ─── */
  const round = rounds[roundIdx];
  if (!round) return null;
  const scorePips = rounds.map((_, i) => results[i]?.champWon);

  return (
    <div className="min-h-screen flex flex-col px-4 py-4" style={{ background: BG }}>
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold tracking-widest text-slate-400">ROUND {roundIdx + 1}/{rounds.length}</p>
        <div className="flex gap-1.5">
          {scorePips.map((w, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full border ${i === roundIdx ? 'animate-pulse' : ''}`}
              style={{
                borderColor: '#475569',
                background: w === undefined ? 'transparent' : w ? '#4ADE80' : '#F87171',
              }}
            />
          ))}
        </div>
      </div>

      {/* round title */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-black text-white">{round.name}</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{round.instructions}</p>
      </div>

      {/* arena: two fighters */}
      <div className="flex-1 flex flex-col gap-3 max-w-lg mx-auto w-full">
        <FighterCard
          side="you"
          color={isPlayerRound ? TEAL : champion.color}
          emoji={isPlayerRound ? '🧑‍💻' : champion.emoji}
          name={isPlayerRound ? 'YOU' : champion.name.toUpperCase()}
          subtitle={isPlayerRound ? 'tagged in!' : `${champion.title} · ${strategy.name}`}
          step={step}
          sql={champSql}
          typingSpeed={champion.typingSpeed}
          typingActive={step === 'typing'}
          onTyped={() => setChampTyped(true)}
          result={results[roundIdx]?.champ}
        />
        <div className="text-center text-2xl font-black text-slate-600 -my-1">VS</div>
        <FighterCard
          side="rival"
          color={RIVAL.color}
          emoji={RIVAL.emoji}
          name={RIVAL.name}
          subtitle={RIVAL.title}
          step={step}
          sql={rivalSql}
          typingSpeed={110}
          typingActive={step === 'typing'}
          onTyped={() => setRivalTyped(true)}
          result={results[roundIdx]?.rival}
        />
      </div>

      {/* verdict + actions */}
      <div className="max-w-lg mx-auto w-full mt-4 space-y-3">
        {step === 'youFight' && (
          <div className="rounded-2xl border-2 p-3" style={{ borderColor: TEAL }}>
            <p className="text-xs font-bold mb-2" style={{ color: TEAL }}>🤝 You're tagged in — write the query:</p>
            <textarea
              value={playerSql}
              onChange={(e) => setPlayerSql(e.target.value)}
              rows={5}
              spellCheck={false}
              className="w-full bg-[#0d1117] text-slate-200 font-mono text-xs rounded-lg p-3 border border-slate-700 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={playerFight}
              className="w-full mt-2 py-3 rounded-xl font-black text-[#0d1117] transition-transform active:scale-95"
              style={{ background: TEAL }}
            >
              FIGHT
            </button>
          </div>
        )}
        {step === 'verdict' && (
          <>
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-center">
              <p className="text-sm font-bold text-white">{verdict}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isPlayerRound ? 'you' : champion.name}: {results[roundIdx]?.champ.correct ? '✅' : '❌'}{' '}
                {((results[roundIdx]?.champ.solveMs ?? 0) + (results[roundIdx]?.champ.execMs ?? 0))}ms ·{' '}
                {RIVAL.name}: {results[roundIdx]?.rival.correct ? '✅' : '❌'}{' '}
                {((results[roundIdx]?.rival.solveMs ?? 0) + (results[roundIdx]?.rival.execMs ?? 0))}ms
              </p>
            </div>
            <button
              onClick={nextRound}
              className="w-full py-3.5 rounded-2xl font-black text-[#0d1117] transition-transform active:scale-95"
              style={{ background: TEAL }}
            >
              {roundIdx + 1 >= rounds.length ? 'SEE MATCH RESULT' : 'NEXT ROUND →'}
            </button>
          </>
        )}
        {(step === 'intro' || step === 'typing' || step === 'executing') && (
          <p className="text-center text-xs text-slate-500 animate-pulse">
            {step === 'intro' && 'Bleepx is reading the round…'}
            {step === 'typing' && 'Fighters are writing their queries…'}
            {step === 'executing' && 'Executing — racing the clock…'}
          </p>
        )}
      </div>
    </div>
  );
}

const MAX_ROUNDS_DISPLAY = 3;

function StatBar({ label, left, right, pct }: { label: string; left: string; right: string; pct: number }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-slate-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold w-12 text-left" style={{ color: TEAL }}>{left}</span>
        <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TEAL }} />
        </div>
        <span className="text-xs font-bold w-12 text-right text-amber-300">{right}</span>
      </div>
    </div>
  );
}

function FighterCard({
  side, color, emoji, name, subtitle, step, sql, typingSpeed, typingActive, onTyped, result,
}: {
  side: 'you' | 'rival';
  color: string;
  emoji: string;
  name: string;
  subtitle: string;
  step: FightStep;
  sql: string;
  typingSpeed: number;
  typingActive: boolean;
  onTyped: () => void;
  result?: FighterResult;
}) {
  return (
    <div className="rounded-2xl border-2 bg-slate-900/60 p-3 transition-all" style={{ borderColor: step === 'executing' ? color : '#2B333C' }}>
      <div className="flex items-center gap-3 mb-2">
        <Avatar color={color} emoji={emoji} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white leading-tight">{name}</p>
          <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: step === 'executing' ? color : '#1e293b',
            color: step === 'executing' ? '#0d1117' : '#94a3b8',
          }}
        >
          {step === 'typing' ? 'WRITING…' : step === 'executing' ? 'RUNNING' : step === 'verdict' ? (result?.correct ? 'HIT' : 'MISS') : 'READY'}
        </span>
      </div>
      <div className="rounded-xl bg-[#0d1117] border border-slate-800 p-3 min-h-[4rem]">
        {sql ? <TypedSql text={sql} cps={typingSpeed} active={typingActive} onDone={onTyped} /> : (
          <p className="text-[11px] text-slate-600 italic">{step === 'youFight' && side === 'you' ? 'waiting for your input below…' : '…'}</p>
        )}
      </div>
      {result && step === 'verdict' && (
        <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
          <span>{result.correct ? '✅ correct' : result.error ? `❌ ${result.error.slice(0, 40)}` : '❌ wrong result'}</span>
          <span>⏱ {result.execMs}ms exec</span>
          <span>{result.rows} rows</span>
        </div>
      )}
    </div>
  );
}
