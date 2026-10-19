'use client';

/**
 * Bleepx Arena — the duel.
 * Pick a champion + strategy + verse + tier, watch it fight VEX-7
 * (the house bot) through real challenges, or tag in and fight
 * one round yourself. SQL rounds execute for real; cloud/lab
 * rounds are quiz duels. Bleepx referees.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { initSQL, loadCSV, runQuery } from '@/lib/sqlClient/browser';
import { compareResults } from '@/lib/compare';
import { CHAMPIONS, STRATEGY_CARDS, RIVAL, type Champion, type StrategyCard } from '@/lib/arena/champions';
import { playBleep } from '@/lib/audio';

interface RoundDef {
  type: 'sql' | 'quiz';
  id: string;
  name: string;
  tier: string | number;
  instructions: string;
  skills: string[];
  // sql
  datasets?: { name: string; file: string }[];
  schema?: { name: string; columns: { name: string; type: string }[] }[];
  solutionQuery?: string;
  seedQuery?: string;
  // quiz
  options?: string[];
  answer?: string | string[];
  explanation?: string;
  hint?: string;
}

interface FighterResult {
  sql?: string;
  answer?: string;
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
type Verse = 'sql' | 'cloud' | 'lab';
type Tier = 'rookie' | 'pro' | 'boss';

const BG = '#1C2129';
const TEAL = '#57ECF4';
const MAX_ROUNDS_DISPLAY = 3;

const VERSES: { id: Verse; name: string; icon: string; blurb: string; domains?: { id: string; label: string }[] }[] = [
  {
    id: 'sql', name: 'SQL Arena', icon: '🗃️',
    blurb: 'Real queries, live execution. Fastest correct result wins.',
    domains: [
      { id: 'business', label: 'Business' },
      { id: 'finance', label: 'Finance' },
      { id: 'healthcare', label: 'Healthcare' },
      { id: 'marketing', label: 'Marketing' },
      { id: 'retail', label: 'Retail' },
      { id: 'sports', label: 'Sports' },
      { id: 'trials', label: 'Trials' },
    ],
  },
  { id: 'cloud', name: 'Cloud Arena', icon: '☁️', blurb: 'AWS / Azure / GCP quiz duels — fastest right answer.' },
  { id: 'lab', name: 'Lab Arena', icon: '🧪', blurb: 'Python & data-science quiz duels.' },
];

const TIERS: { id: Tier; name: string; blurb: string }[] = [
  { id: 'rookie', name: '🐣 Rookie', blurb: 'First fights. Learn the ropes.' },
  { id: 'pro', name: '🔥 Pro', blurb: 'Harder rounds, tighter clocks.' },
  { id: 'boss', name: '👑 Boss', blurb: 'Expert tier. No mercy.' },
];

/* Bleepx referee commentary — scripted lines per beat. */
const REF = {
  roundStart: (n: number) => [`ROUND ${n} — FIGHT!`, `Bleepx calls it: round ${n} begins.`],
  typing: ['Champions are thinking…', 'Queries loading… stand by.', 'Fingers on keyboards. Bots on metal.'],
  champHit: ['Clean hit from the challenger!', 'That one landed! 💥', 'Textbook execution — the crowd goes mild-to-wild.'],
  champMiss: ['Oof — that missed the mark.', 'A swing and a miss!', 'VEX-7 saw that coming a mile away.'],
  rivalHit: ['VEX-7 answers back!', 'The house bot does not blink.'],
  final: (won: boolean) => won ? 'AND STILL… the challenger takes it! 🏆' : 'The house keeps the belt… this time.',
};

/* Reveals text like it's being typed live. */
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

function Avatar({ color, emoji, sprite, size = 'md', hit }: { color: string; emoji: string; sprite?: string; size?: 'sm' | 'md' | 'lg'; hit?: boolean }) {
  const sz = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-9 h-9' : 'w-14 h-14';
  return (
    <div
      className={`${sz} rounded-full overflow-hidden flex items-center justify-center bg-[#0d1117] border-2 shrink-0 ${hit ? 'arena-hit' : ''}`}
      style={{ borderColor: color, boxShadow: `0 0 14px ${color}66` }}
    >
      {sprite
        ? <img src={sprite} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        : <span className={size === 'lg' ? 'text-3xl' : 'text-lg'}>{emoji}</span>}
      {sprite && <span className="hidden">{emoji}</span>}
    </div>
  );
}

export default function ArenaBattle() {
  const [phase, setPhase] = useState<Phase>('select');
  const [champion, setChampion] = useState<Champion>(CHAMPIONS[0]);
  const [strategy, setStrategy] = useState<StrategyCard>(STRATEGY_CARDS[0]);
  const [mode, setMode] = useState<'coach' | 'tagteam'>('coach');
  const [verse, setVerse] = useState<Verse>('sql');
  const [domain, setDomain] = useState('business');
  const [tier, setTier] = useState<Tier>('rookie');
  const [rounds, setRounds] = useState<RoundDef[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [step, setStep] = useState<FightStep>('intro');
  const [champSql, setChampSql] = useState('');
  const [rivalSql, setRivalSql] = useState('');
  const [champAnswer, setChampAnswer] = useState('');
  const [rivalAnswer, setRivalAnswer] = useState('');
  const [champTyped, setChampTyped] = useState(false);
  const [rivalTyped, setRivalTyped] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [verdict, setVerdict] = useState<string>('');
  const [playerSql, setPlayerSql] = useState('');
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [refLine, setRefLine] = useState('');
  const [banner, setBanner] = useState('');
  const [shake, setShake] = useState(false);
  const playerRound = 2; // last round in tag-team mode

  const isPlayerRound = mode === 'tagteam' && roundIdx === playerRound;
  const isQuiz = rounds[roundIdx]?.type === 'quiz';

  const loadMatch = useCallback(async () => {
    setPhase('loading');
    setStatus('');
    try {
      const r = await fetch(`/api/arena/match?verse=${verse}&domain=${domain}&tier=${tier}`);
      const data = await r.json();
      if (!r.ok || !data?.rounds?.length) {
        setStatus(data?.error ?? 'No rounds found — try another arena.');
        setPhase('select');
        return;
      }
      const loaded: RoundDef[] = data.rounds;
      const sqlRounds = loaded.filter((x) => x.type === 'sql');
      if (sqlRounds.length) {
        setStatus('Loading datasets…');
        await initSQL();
        const names = new Map<string, string>();
        for (const rd of sqlRounds) for (const d of rd.datasets ?? []) names.set(d.name, d.file);
        for (const [name, file] of names) {
          try { await loadCSV(name, file); } catch { /* dataset may not exist locally */ }
        }
      }
      setRounds(loaded);
      setResults([]);
      setRoundIdx(0);
      setStep('intro');
      setPhase('fight');
      setRefLine(`Bleepx: "Welcome to the ${VERSES.find(v => v.id === verse)?.name}! ${champion.name} vs ${RIVAL.name} — ${TIERS.find(t => t.id === tier)?.name.replace(/^[^ ]+ /, '')} bracket. Coaches ready?"`);
    } catch (err: any) {
      setStatus(err?.message ?? 'Failed to load match');
      setPhase('select');
    }
  }, [verse, domain, tier, champion]);

  const runAndScore = useCallback(async (sql: string, round: RoundDef): Promise<FighterResult> => {
    const t0 = performance.now();
    try {
      const res = await runQuery(sql);
      const execMs = Math.round(performance.now() - t0);
      const cols = res?.columns ?? [];
      const grid = (res?.data ?? []).map((row: unknown[]) =>
        Object.fromEntries(cols.map((c, i) => [c, row[i]]))
      ) as Record<string, string | number | null>[];
      const { correct } = await compareResults(grid, [], round.solutionQuery ?? '', sql, []);
      return { sql, correct, solveMs: 0, execMs, rows: grid.length };
    } catch (err: any) {
      return { sql, correct: false, solveMs: 0, execMs: Math.round(performance.now() - t0), rows: 0, error: err?.message };
    }
  }, []);

  const quizCorrect = (ans: string, round: RoundDef) => {
    const a = Array.isArray(round.answer) ? round.answer[0] : round.answer;
    return !!a && ans.trim().toLowerCase() === String(a).trim().toLowerCase();
  };

  // Drive one round.
  useEffect(() => {
    if (phase !== 'fight' || step !== 'intro') return;
    const round = rounds[roundIdx];
    if (!round) return;
    let cancelled = false;

    const go = async () => {
      setChampSql(''); setRivalSql('');
      setChampAnswer(''); setRivalAnswer(''); setPlayerAnswer('');
      setChampTyped(false); setRivalTyped(false);
      setVerdict('');
      setPlayerSql(round.seedQuery || '-- write your query here\nSELECT 1;');
      setBanner(`ROUND ${roundIdx + 1}`);
      setRefLine(`Bleepx: "${REF.roundStart(roundIdx + 1)[roundIdx % 2]}"`);
      setTimeout(() => !cancelled && setBanner(''), 1400);

      if (isPlayerRound) {
        setStep('youFight');
        setRefLine(isQuiz ? 'Bleepx: "The coach tags in! Pick your answer." 🏷️' : 'Bleepx: "The coach tags in! Write the winning query." 🏷️');
        return;
      }

      const t0 = performance.now();
      const rivalDelay = RIVAL.solveDelayMs[roundIdx % RIVAL.solveDelayMs.length];

      if (round.type === 'quiz') {
        const solvePromise = fetch('/api/arena/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz: { question: round.instructions, options: round.options, answer: round.answer }, championId: champion.id, strategyId: strategy.id }),
        })
          .then((r) => r.json())
          .then((d) => ({ answer: d?.answer ?? '', ms: Math.round(performance.now() - t0) }))
          .catch(() => ({ answer: '', ms: Math.round(performance.now() - t0) }));

        // rival picks: correct at quizAccuracy, else a random wrong option
        const a = Array.isArray(round.answer) ? round.answer[0] : round.answer;
        const rivalHit = Math.random() < RIVAL.quizAccuracy;
        const wrongPool = (round.options ?? []).filter((o) => String(o).trim().toLowerCase() !== String(a ?? '').trim().toLowerCase());
        const rivalPick = rivalHit && a ? String(a) : (wrongPool[Math.floor(Math.random() * wrongPool.length)] ?? String(a ?? ''));

        const [solve] = await Promise.all([solvePromise, new Promise((r) => setTimeout(r, Math.min(rivalDelay, 400)))]);
        if (cancelled) return;
        (window as any).__champSolveMs = solve.ms;
        (window as any).__rivalPick = rivalPick;
        setChampSql(`> lock answer…`);
        setRivalSql(`> lock answer…`);
        setStep('typing');
        setRefLine('Bleepx: "Both fighters are thinking… 👀"');
        // reveal picks after the typing beat — unguarded because the
        // effect cleanup cancels `cancelled` when step flips to 'typing'.
        setTimeout(() => { setChampAnswer(solve.answer); setChampTyped(true); }, 900);
        setTimeout(() => { setRivalAnswer(rivalPick); setRivalTyped(true); }, Math.min(rivalDelay, 1600));
        return;
      }

      // Champion solves via API while rival "types" the canonical answer.
      const solvePromise = fetch('/api/arena/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, caseId: round.id, championId: champion.id, strategyId: strategy.id }),
      })
        .then((r) => r.json())
        .then((d) => ({ sql: d?.sql ?? 'SELECT 1;', ms: Math.round(performance.now() - t0) }))
        .catch(() => ({ sql: 'SELECT 1;', ms: Math.round(performance.now() - t0) }));

      const [solve] = await Promise.all([solvePromise, new Promise((r) => setTimeout(r, Math.min(rivalDelay, 400)))]);
      if (cancelled) return;

      (window as any).__champSolveMs = solve.ms;
      setRivalSql(round.solutionQuery ?? '');
      setChampSql(solve.sql);
      setStep('typing');
      setRefLine(`Bleepx: "${REF.typing[roundIdx % REF.typing.length]}"`);
    };

    go();
    return () => { cancelled = true; };
  }, [phase, step, roundIdx, rounds, champion, strategy, isPlayerRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // When both sides are revealed, score.
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

      if (round.type === 'quiz') {
        const cAns = isPlayerRound ? playerAnswer : champAnswer;
        const champ: FighterResult = { answer: cAns, correct: quizCorrect(cAns, round), solveMs: champSolveMs, execMs: 0, rows: 0 };
        const rival: FighterResult = { answer: rivalAnswer, correct: quizCorrect(rivalAnswer, round), solveMs: rivalSolveMs, execMs: 0, rows: 0 };
        finishRound(champ, rival, round);
        return;
      }

      const [champRes, rivalRes] = await Promise.all([
        runAndScore(isPlayerRound ? playerSql : champSql, round),
        runAndScore(round.solutionQuery ?? '', round),
      ]);
      if (cancelled) return;
      finishRound({ ...champRes, solveMs: champSolveMs }, { ...rivalRes, solveMs: rivalSolveMs }, round);
    };
    const finishRound = (champ: FighterResult, rival: FighterResult, round: RoundDef) => {
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
        : `${RIVAL.name} takes the round — ${possLabel} answer missed.${champ.error ? ` (${champ.error})` : ''}`;

      setVerdict(v);
      setRefLine(`Bleepx: "${champ.correct && champWon ? REF.champHit[roundIdx % 3] : !champ.correct ? REF.champMiss[roundIdx % 3] : REF.rivalHit[roundIdx % 2]}"`);
      setResults((rs) => [...rs, { round, champ, rival, champWon, byPlayer: isPlayerRound }]);
      setStep('verdict');
      if (!champ.correct) { setShake(true); setTimeout(() => setShake(false), 500); }
      playBleep();
    };
    run();
    return () => { cancelled = true; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextRound = () => {
    playBleep();
    if (roundIdx + 1 >= rounds.length) {
      setRefLine(`Bleepx: "${REF.final(results.filter((r) => r.champWon).length > results.length / 2)}"`);
      setPhase('done');
    } else {
      setRoundIdx((i) => i + 1);
      setStep('intro');
    }
  };

  const playerFight = () => {
    (window as any).__champSolveMs = 0;
    setChampSql(playerSql);
    setRivalSql(rounds[roundIdx].solutionQuery ?? '');
    setStep('typing');
  };

  const playerQuizPick = (opt: string) => {
    if (step !== 'youFight') return;
    setPlayerAnswer(opt);
    (window as any).__champSolveMs = 0;
    (window as any).__rivalPick = (() => {
      const round = rounds[roundIdx];
      const a = Array.isArray(round.answer) ? round.answer[0] : round.answer;
      const rivalHit = Math.random() < RIVAL.quizAccuracy;
      const wrong = (round.options ?? []).filter((o) => String(o) !== String(a));
      return rivalHit ? String(a) : wrong[Math.floor(Math.random() * wrong.length)];
    })();
    setChampSql('> answer locked'); setRivalSql('> answer locked');
    setStep('typing');
    setTimeout(() => { setChampAnswer(opt); setChampTyped(true); }, 500);
    setTimeout(() => { setRivalAnswer((window as any).__rivalPick); setRivalTyped(true); }, 1100);
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
  const champHp = Math.max(0, 100 - results.filter((r) => !r.champWon).length * 34);
  const rivalHp = Math.max(0, 100 - wins * 34);

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

  const verseName = VERSES.find(v => v.id === verse)?.name ?? 'Arena';
  const shareText = `⚔️ BLEEPX ARENA — ${mode === 'tagteam' ? 'You + ' : ''}${champion.name} ${wins}-${totalRounds - wins} vs ${RIVAL.name}
${verseName} • ${tier} • ${correct}/${totalRounds} correct • avg ${(avgMs / 1000).toFixed(1)}s
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
        <style>{ARENA_CSS}</style>
        <div className="text-center mb-6">
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
            {/* verse picker */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Choose your arena</p>
              <div className="grid grid-cols-3 gap-2">
                {VERSES.map((v) => (
                  <button key={v.id}
                    onClick={() => { setVerse(v.id); playBleep(); }}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${verse === v.id ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70'}`}
                    style={{ borderColor: verse === v.id ? TEAL : '#2B333C' }}>
                    <div className="text-2xl mb-1">{v.icon}</div>
                    <p className="text-[11px] font-bold text-white leading-tight">{v.name}</p>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">{VERSES.find(v => v.id === verse)?.blurb}</p>
              {verse === 'sql' && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {VERSES[0].domains!.map((d) => (
                    <button key={d.id} onClick={() => { setDomain(d.id); playBleep(); }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${domain === d.id ? 'text-[#0d1117]' : 'text-slate-400'}`}
                      style={{ background: domain === d.id ? TEAL : 'transparent', borderColor: domain === d.id ? TEAL : '#334155' }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* tier picker */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map((t) => (
                  <button key={t.id}
                    onClick={() => { setTier(t.id); playBleep(); }}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${tier === t.id ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70'}`}
                    style={{ borderColor: tier === t.id ? TEAL : '#2B333C' }}>
                    <p className="text-[11px] font-bold text-white leading-tight">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* champion picker */}
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
                    <Avatar color={c.color} emoji={c.emoji} sprite={c.sprite} />
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

            {/* strategy */}
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

            {/* mode */}
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
        <style>{ARENA_CSS}</style>
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl" style={{ boxShadow: `0 0 40px ${TEAL}22` }}>
          <p className="text-center text-[11px] font-bold tracking-[0.3em] text-slate-400 mb-5">MATCH RESULT</p>
          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar color={champion.color} emoji={champion.emoji} sprite={champion.sprite} size="lg" />
              <p className="text-xs font-bold" style={{ color: champion.color }}>{champion.name.toUpperCase()}</p>
            </div>
            <p className="text-4xl font-black text-white">{wins}<span className="text-slate-600 mx-2">—</span>{totalRounds - wins}</p>
            <div className="flex flex-col items-center gap-2">
              <Avatar color={RIVAL.color} emoji={RIVAL.emoji} sprite={RIVAL.sprite} size="lg" hit={!matchWon} />
              <p className="text-xs font-bold" style={{ color: RIVAL.color }}>{RIVAL.name}</p>
            </div>
          </div>
          <p className="text-center text-lg font-black mb-2" style={{ color: matchWon ? '#4ADE80' : '#F87171' }}>
            {matchWon ? '🏆 MATCH WON' : '💀 DEFEATED'}
          </p>
          <p className="text-center text-[11px] text-slate-400 mb-5">{verseName} · {TIERS.find(t => t.id === tier)?.name}</p>
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
            onClick={() => { setPhase('select'); setResults([]); setRoundIdx(0); setXpAwarded(false); setStatus(''); }}
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
    <div className={`min-h-screen flex flex-col px-4 py-4 ${shake ? 'arena-shake' : ''}`} style={{ background: BG }}>
      <style>{ARENA_CSS}</style>
      {/* round banner */}
      {banner && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <p className="arena-banner text-5xl font-black text-white" style={{ textShadow: `0 0 30px ${TEAL}` }}>{banner}</p>
        </div>
      )}

      {/* header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold tracking-widest text-slate-400">ROUND {roundIdx + 1}/{rounds.length} · {verseName.toUpperCase()}</p>
        <div className="flex gap-1.5">
          {scorePips.map((w, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full border ${i === roundIdx ? 'animate-pulse' : ''}`}
              style={{ borderColor: '#475569', background: w === undefined ? 'transparent' : w ? '#4ADE80' : '#F87171' }}
            />
          ))}
        </div>
      </div>

      {/* referee feed */}
      <div className="flex items-center gap-2 mb-3 rounded-xl bg-slate-900/70 border border-slate-800 px-3 py-2">
        <Avatar color={TEAL} emoji="🦉" sprite="/arena/bleepx.png" size="sm" />
        <p className="text-[11px] text-slate-300 italic">{refLine || 'Bleepx: "Welcome to the arena!"'}</p>
      </div>

      {/* round title */}
      <div className="text-center mb-3">
        <h2 className="text-lg font-black text-white">{round.name}</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{round.instructions}</p>
      </div>

      {/* arena: two fighters */}
      <div className="flex-1 flex flex-col gap-3 max-w-lg mx-auto w-full">
        <FighterCard
          side="you"
          color={isPlayerRound ? TEAL : champion.color}
          emoji={isPlayerRound ? '🧑‍💻' : champion.emoji}
          sprite={isPlayerRound ? undefined : champion.sprite}
          name={isPlayerRound ? 'YOU' : champion.name.toUpperCase()}
          subtitle={isPlayerRound ? 'tagged in!' : `${champion.title} · ${strategy.name}`}
          step={step}
          sql={isQuiz ? '' : champSql}
          answer={isQuiz ? (isPlayerRound ? playerAnswer : champAnswer) : ''}
          options={isQuiz ? round.options : undefined}
          correctAnswer={isQuiz ? round.answer : undefined}
          typingSpeed={champion.typingSpeed}
          typingActive={step === 'typing' && !isQuiz}
          onTyped={() => setChampTyped(true)}
          result={results[roundIdx]?.champ}
          hp={champHp}
        />
        <div className="text-center text-2xl font-black text-slate-600 -my-1 arena-vs">VS</div>
        <FighterCard
          side="rival"
          color={RIVAL.color}
          emoji={RIVAL.emoji}
          sprite={RIVAL.sprite}
          name={RIVAL.name}
          subtitle={RIVAL.title}
          step={step}
          sql={isQuiz ? '' : rivalSql}
          answer={isQuiz ? rivalAnswer : ''}
          options={isQuiz ? round.options : undefined}
          correctAnswer={isQuiz ? round.answer : undefined}
          typingSpeed={110}
          typingActive={step === 'typing' && !isQuiz}
          onTyped={() => setRivalTyped(true)}
          result={results[roundIdx]?.rival}
          hp={rivalHp}
        />
      </div>

      {/* verdict + actions */}
      <div className="max-w-lg mx-auto w-full mt-4 space-y-3">
        {step === 'youFight' && !isQuiz && (
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
        {step === 'youFight' && isQuiz && (
          <div className="rounded-2xl border-2 p-3" style={{ borderColor: TEAL }}>
            <p className="text-xs font-bold mb-2" style={{ color: TEAL }}>🤝 You're tagged in — pick the answer:</p>
            <div className="space-y-2">
              {(round.options ?? []).map((opt, i) => (
                <button key={i} onClick={() => playerQuizPick(opt)}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-[#0d1117] border border-slate-700 text-xs text-slate-200 hover:border-cyan-400 transition-colors">
                  <span className="font-bold text-slate-400 mr-2">{String.fromCharCode(65 + i)}</span>{opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 'verdict' && (
          <>
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-center">
              <p className="text-sm font-bold text-white">{verdict}</p>
              {isQuiz && results[roundIdx]?.round.explanation && (
                <p className="text-[11px] text-slate-400 mt-1 text-left">{results[roundIdx].round.explanation}</p>
              )}
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
            {step === 'typing' && (isQuiz ? 'Fighters are locking in…' : 'Fighters are writing their queries…')}
            {step === 'executing' && (isQuiz ? 'Revealing answers…' : 'Executing — racing the clock…')}
          </p>
        )}
      </div>
    </div>
  );
}

const ARENA_CSS = `
@keyframes arena-banner { 0% { transform: scale(.4); opacity: 0 } 25% { transform: scale(1.15); opacity: 1 } 60% { transform: scale(1) } 100% { transform: scale(1.6); opacity: 0 } }
.arena-banner { animation: arena-banner 1.4s ease-out forwards }
@keyframes arena-shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-6px) } 40% { transform: translateX(6px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(4px) } }
.arena-shake { animation: arena-shake .5s }
@keyframes arena-hit { 0% { transform: scale(1) } 30% { transform: scale(1.15) rotate(-4deg) } 60% { transform: scale(.95) rotate(3deg) } 100% { transform: scale(1) } }
.arena-hit { animation: arena-hit .5s }
@keyframes arena-vs { 0%,100% { transform: scale(1); opacity:.6 } 50% { transform: scale(1.25); opacity:1 } }
.arena-vs { animation: arena-vs 1.6s ease-in-out infinite }
`;

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

function HpBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: pct > 50 ? color : pct > 25 ? '#F59E0B' : '#EF4444' }}
      />
    </div>
  );
}

function FighterCard({
  side, color, emoji, sprite, name, subtitle, step, sql, answer, options, correctAnswer, typingSpeed, typingActive, onTyped, result, hp,
}: {
  side: 'you' | 'rival';
  color: string;
  emoji: string;
  sprite?: string;
  name: string;
  subtitle: string;
  step: FightStep;
  sql: string;
  answer?: string;
  options?: string[];
  correctAnswer?: string | string[];
  typingSpeed: number;
  typingActive: boolean;
  onTyped: () => void;
  result?: FighterResult;
  hp?: number;
}) {
  const isQuizCard = !!options?.length;
  const correctText = Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer;
  return (
    <div className="rounded-2xl border-2 bg-slate-900/60 p-3 transition-all" style={{ borderColor: step === 'executing' ? color : '#2B333C' }}>
      <div className="flex items-center gap-3 mb-2">
        <Avatar color={color} emoji={emoji} sprite={sprite} size="sm" hit={result != null && !result.correct && step === 'verdict'} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white leading-tight">{name}</p>
          <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: step === 'executing' ? color : '#1e293b', color: step === 'executing' ? '#0d1117' : '#94a3b8' }}
        >
          {step === 'typing' ? (isQuizCard ? 'LOCKING…' : 'WRITING…') : step === 'executing' ? (isQuizCard ? 'REVEAL' : 'RUNNING') : step === 'verdict' ? (result?.correct ? 'HIT' : 'MISS') : 'READY'}
        </span>
      </div>
      {typeof hp === 'number' && <HpBar pct={hp} color={color} />}
      <div className="rounded-xl bg-[#0d1117] border border-slate-800 p-3 min-h-[4rem] mt-2">
        {isQuizCard ? (
          <div className="space-y-1.5">
            {options!.map((opt, i) => {
              const picked = answer === opt;
              const isCorrect = step === 'verdict' && String(opt).trim().toLowerCase() === String(correctText ?? '').trim().toLowerCase();
              const cls = isCorrect
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : picked && step === 'verdict'
                ? 'border-red-500/60 bg-red-500/10'
                : picked
                ? 'border-cyan-400/70 bg-cyan-400/10'
                : 'border-slate-800';
              return (
                <div key={i} className={`px-2.5 py-1.5 rounded-lg border text-[11px] text-slate-300 transition-all ${cls}`}>
                  <span className="font-bold text-slate-500 mr-1.5">{String.fromCharCode(65 + i)}</span>
                  {opt}
                  {picked && <span className="ml-1.5">{side === 'rival' ? '🤖' : '🎯'}</span>}
                  {isCorrect && step === 'verdict' && <span className="ml-1.5">✅</span>}
                </div>
              );
            })}
          </div>
        ) : sql ? (
          <TypedSql text={sql} cps={typingSpeed} active={typingActive} onDone={onTyped} />
        ) : (
          <p className="text-[11px] text-slate-600 italic">{step === 'youFight' && side === 'you' ? 'waiting for your input below…' : '…'}</p>
        )}
      </div>
      {result && step === 'verdict' && (
        <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
          <span>{result.correct ? '✅ correct' : result.error ? `❌ ${result.error.slice(0, 40)}` : '❌ wrong result'}</span>
          {result.execMs > 0 && <span>⏱ {result.execMs}ms exec</span>}
          {result.rows > 0 && <span>{result.rows} rows</span>}
        </div>
      )}
    </div>
  );
}
