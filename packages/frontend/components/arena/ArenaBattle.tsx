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
import { ARENA_XP, EVO_STAGES, awardChampionXp, getChampionProgress, getEvolvedStats, getSelectedChampionId, setSelectedChampionId, syncTrainingXp, type ChampionProgress } from '@/lib/arena/evolution';
import { playBleep } from '@/lib/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { loadPyodide, runPythonCode } from '@/lib/pyodideRuntime';
import { cloudMissionById, actionsToLines, freshSandbox, type CloudAction } from '@/lib/arena/codeDuels';
import { matchCardUrl } from '@/lib/arena/matchCard';
import { useArenaRunner } from '@/components/arena/ArenaRunner';

interface RoundDef {
  type: 'sql' | 'quiz' | 'python' | 'cloud';
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
  // python duel
  setup?: string;
  solution?: string;
  buggy?: string;
  check?: string;
  starter?: string;
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
type FightStep = 'intro' | 'reading' | 'typing' | 'youFight' | 'executing' | 'verdict';
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
  { id: 'cloud', name: 'Cloud Arena', icon: '☁️', blurb: 'Quiz duels + a real build mission in the AWS sandbox.' },
  { id: 'lab', name: 'Lab Arena', icon: '🧪', blurb: 'Quiz duels + a real Python code duel in Pyodide.' },
];

const TIERS: { id: Tier; name: string; blurb: string }[] = [
  { id: 'rookie', name: '🐣 Rookie', blurb: 'First fights. Learn the ropes.' },
  { id: 'pro', name: '🔥 Pro', blurb: 'Harder rounds, tighter clocks.' },
  { id: 'boss', name: '👑 Boss', blurb: 'Expert tier. No mercy.' },
];

/* Bleepx referee commentary — scripted lines per beat. */
const REF = {
  roundStart: (n: number) => [`ROUND ${n} — FIGHT!`, `Bleepx calls it: round ${n} begins.`],
  reading: (kind: string) => kind === 'quiz'
    ? 'Bleepx: "Question on the board — the crowd reads it first."'
    : kind === 'python'
    ? 'Bleepx: "Final round is real code — Pyodide is warming up. Study the task."'
    : kind === 'cloud'
    ? 'Bleepx: "Build mission on the board — whoever ships the right infra first wins."'
    : 'Bleepx: "Read the task — both bots get it at the same time you do."',
  typing: ['Champions are thinking…', 'Queries loading… stand by.', 'Fingers on keyboards. Bots on metal.'],
  champHit: ['Clean hit from the challenger!', 'That one landed! 💥', 'Textbook execution — the crowd goes mild-to-wild.'],
  champMiss: ['Oof — that missed the mark.', 'A swing and a miss!', 'VEX-7 saw that coming a mile away.'],
  rivalHit: ['VEX-7 answers back!', 'The house bot does not blink.'],
  final: (won: boolean) => won ? 'AND STILL… the challenger takes it! 🏆' : 'The house keeps the belt… this time.',
};

/* Reveals text like it's being typed live — with personality.
 * burst:   big chunks, impatient speed bursts.
 * steady:  even keystrokes, occasional "thinking" pause.
 * erratic: jittery random chunks + stalls — chaos incarnate. */
function TypedSql({ text, cps, active, onDone, style = 'steady' }: { text: string; cps: number; active: boolean; onDone?: () => void; style?: 'burst' | 'steady' | 'erratic' }) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    setShown(0);
    doneRef.current = false;
    if (!text) { doneRef.current = true; onDone?.(); return; }
    let timeout: any;
    let pos = 0;
    const advance = () => {
      if (pos >= text.length) {
        if (!doneRef.current) { doneRef.current = true; onDone?.(); }
        return;
      }
      const base = Math.max(1, Math.floor(cps / 50));
      let step = base, wait = Math.max(8, Math.floor(1000 / cps));
      if (style === 'burst') {
        step = base * (2 + Math.floor(Math.random() * 4));
        wait = Math.random() < 0.15 ? wait * 6 : wait; // rare breath
      } else if (style === 'erratic') {
        step = Math.random() < 0.2 ? base : base * Math.floor(1 + Math.random() * 6);
        wait = Math.random() < 0.22 ? wait * (3 + Math.random() * 8) : wait; // stalls
      } else {
        wait = Math.random() < 0.12 ? wait * 8 : wait; // thinks mid-query
      }
      pos = Math.min(text.length, pos + step);
      setShown(pos);
      timeout = setTimeout(advance, wait);
    };
    timeout = setTimeout(advance, 60);
    return () => clearTimeout(timeout);
  }, [text, cps, active, style]); // eslint-disable-line react-hooks/exhaustive-deps
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

/* Big animated sprite for the ring: idle bounce, type-jitter while writing,
 * lunge on hit, wobble+drop on miss, KO slump when health is gone. */
function RingFighter({ sprite, emoji, color, side, step, result, name, aura }: {
  sprite?: string; emoji: string; color: string; side: 'left' | 'right';
  step: FightStep; result?: FighterResult; name: string; aura?: string;
}) {
  const dir = side === 'left' ? 1 : -1;
  const ko = result != null && step === 'verdict' && !result.correct;
  const hit = result != null && step === 'verdict' && result.correct;
  const typing = step === 'typing' || step === 'intro';
  return (
    <motion.div
      className="relative"
      animate={
        ko ? { y: 10, rotate: dir * -18, scale: 0.9, opacity: 0.6 }
        : hit ? { x: [0, dir * 26, 0], y: [0, -6, 0], rotate: [0, dir * 8, 0] }
        : typing ? { y: [0, -3, 0], rotate: [0, dir * 2, 0] }
        : { y: [0, -4, 0] }
      }
      transition={
        ko ? { duration: 0.5 }
        : hit ? { duration: 0.45, times: [0, 0.4, 1] }
        : { duration: typing ? 0.5 : 1.8, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <div
        className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-3 bg-[#0d1117] flex items-center justify-center"
        style={{ borderColor: color, borderWidth: 3, boxShadow: `0 0 22px ${color}88, inset 0 0 12px ${color}33${aura ? `, 0 0 42px ${aura}55` : ''}` }}
      >
        {sprite
          ? <img src={sprite} alt={name} className="w-full h-full object-cover" />
          : <span className="text-4xl">{emoji}</span>}
      </div>
      {typing && (
        <motion.div
          className="absolute -bottom-1 left-1/2 flex gap-1"
          style={{ x: '-50%' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {[0,1,2].map((i) => (
            <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: color }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

/* Floating damage number over a fighter on verdict. */
function DamageNumber({ show, amount, color }: { show: boolean; amount: string; color: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute -top-3 left-1/2 font-black text-lg pointer-events-none z-10"
          style={{ x: '-50%', color, textShadow: '0 0 10px rgba(0,0,0,.8)' }}
          initial={{ y: 12, opacity: 0, scale: 0.6 }}
          animate={{ y: -22, opacity: 1, scale: 1.15 }}
          exit={{ y: -34, opacity: 0 }}
          transition={{ duration: 0.9 }}
        >
          {amount}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Clash spark burst in the middle while both sides execute. */
function ClashSparks({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div className="relative w-14 h-14" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 1.6 }}>
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 w-1 h-4 rounded-full bg-amber-300"
              style={{ rotate: i * 45 }}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -26, opacity: 0 }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
          <span className="absolute inset-0 flex items-center justify-center text-2xl">⚡</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ArenaBattle() {
  const [phase, setPhase] = useState<Phase>('select');
  const [champion, setChampion] = useState<Champion>(() => {
    const id = getSelectedChampionId();
    return CHAMPIONS.find((c) => c.id === id) ?? CHAMPIONS[0];
  });
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
  const [playerActions, setPlayerActions] = useState<CloudAction[]>([]);
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [gauntletMatches, setGauntletMatches] = useState(5);
  const runner = useArenaRunner();
  const [xpAwarded, setXpAwarded] = useState(false);
  const [refLine, setRefLine] = useState('');
  const [banner, setBanner] = useState('');
  const [shake, setShake] = useState(false);
  const [progMap, setProgMap] = useState<Record<string, ChampionProgress>>({});
  const [evoBanner, setEvoBanner] = useState('');
  const [cinematic, setCinematic] = useState(false);
  const evolvedThisMatch = useRef<string | null>(null);
  const pendingRef = useRef<Promise<any> | null>(null);
  const playerRound = 2; // last round in tag-team mode

  const isPlayerRound = mode === 'tagteam' && roundIdx === playerRound;
  const isQuiz = rounds[roundIdx]?.type === 'quiz';

  const prog = progMap[champion.id] ?? getChampionProgress(champion.id);
  const evolved = getEvolvedStats(champion, prog.stage.level);

  const refreshProgress = useCallback(() => {
    const m: Record<string, ChampionProgress> = {};
    for (const c of CHAMPIONS) m[c.id] = getChampionProgress(c.id);
    setProgMap(m);
  }, []);

  // Verse training feeds every champion's XP before you even step in.
  useEffect(() => {
    for (const c of CHAMPIONS) syncTrainingXp(c.id);
    refreshProgress();
  }, [refreshProgress]);

  // Clear the launch message once the gauntlet is no longer running
  // (STOP, dismiss, or done) so it doesn't linger on the select screen.
  const gauntletActive = runner?.state.status === 'running';
  useEffect(() => {
    if (!gauntletActive) setStatus((s) => (s.includes('fighting the gauntlet') ? '' : s));
  }, [gauntletActive]);

  const grantXp = useCallback((amount: number) => {
    const { progress, evolved: evo } = awardChampionXp(champion.id, amount);
    setProgMap((m) => ({ ...m, [champion.id]: progress }));
    if (evo) {
      evolvedThisMatch.current = `${progress.stage.emoji} ${progress.stage.name}`;
      setEvoBanner(`${progress.stage.emoji} ${champion.name.toUpperCase()} EVOLVED — ${progress.stage.name.toUpperCase()}`);
      setRefLine(`Bleepx: "${champion.name} EVOLVED to ${progress.stage.name}! ${progress.stage.blurb}"`);
      setTimeout(() => setEvoBanner(''), 2200);
    }
  }, [champion]);

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
      setCinematic(true);
      setTimeout(() => setCinematic(false), 2100);
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

  // Run a Python duel entry in Pyodide: setup + bot code + check asserts.
  const runAndScorePython = useCallback(async (code: string, round: RoundDef): Promise<FighterResult> => {
    const t0 = performance.now();
    try {
      const py = await loadPyodide();
      const full = `${round.setup ?? ''}\n${code}\n${round.check ?? ''}`;
      const res = await runPythonCode(py, { code: full, timeoutMs: 20000 });
      const execMs = Math.round(performance.now() - t0);
      const failed = (res.stderr ?? '').trim().length > 0;
      return {
        sql: code,
        correct: !failed,
        solveMs: 0,
        execMs,
        rows: (res.stdout ?? '').split('\n').filter(Boolean).length,
        error: failed ? (res.stderr ?? '').trim().split('\n').pop() : undefined,
      };
    } catch (err: any) {
      return { sql: code, correct: false, solveMs: 0, execMs: Math.round(performance.now() - t0), rows: 0, error: err?.message };
    }
  }, []);

  // Run a cloud build mission: apply the action list to a fresh sandbox,
  // then validate the resulting state. execMs simulates provisioning time
  // per action so efficient plays race ahead.
  const runAndScoreCloud = useCallback(async (acts: CloudAction[], mission: ReturnType<typeof cloudMissionById>): Promise<FighterResult> => {
    const t0 = performance.now();
    try {
      if (!mission) return { correct: false, solveMs: 0, execMs: 0, rows: 0, error: 'mission not found' };
      let s = freshSandbox();
      for (const a of acts) s = a.run(s);
      const chk = mission.check(s);
      return {
        correct: chk.ok,
        solveMs: 0,
        execMs: acts.length * 140 + Math.round((performance.now() - t0)),
        rows: acts.length,
        error: chk.ok ? undefined : chk.detail,
      };
    } catch (err: any) {
      return { correct: false, solveMs: 0, execMs: Math.round(performance.now() - t0), rows: acts.length, error: err?.message };
    }
  }, []);

  const quizCorrect = (ans: string, round: RoundDef) => {
    const a = Array.isArray(round.answer) ? round.answer[0] : round.answer;
    return !!a && ans.trim().toLowerCase() === String(a).trim().toLowerCase();
  };

  // Drive one round: reset, fire both solves in the background, then
  // hold on the reading card so the crowd reads the task before the bots move.
  useEffect(() => {
    if (phase !== 'fight' || step !== 'intro') return;
    const round = rounds[roundIdx];
    if (!round) return;
    let cancelled = false;

    const go = () => {
      setChampSql(''); setRivalSql('');
      setChampAnswer(''); setRivalAnswer(''); setPlayerAnswer('');
      setChampTyped(false); setRivalTyped(false);
      setVerdict('');
      setPlayerSql(round.type === 'python' ? (round.starter ?? '# your code here\n') : (round.seedQuery || '-- write your query here\nSELECT 1;'));
      setPlayerActions([]);
      setBanner(`ROUND ${roundIdx + 1}`);
      setRefLine(`Bleepx: "${REF.roundStart(roundIdx + 1)[roundIdx % 2]}" ${champion.name}: "${champion.quips.start}"`);
      setTimeout(() => !cancelled && setBanner(''), 1400);

      if (isPlayerRound) {
        pendingRef.current = null;
        setStep('reading');
        setRefLine(REF.reading(round.type));
        return;
      }

      const t0 = performance.now();
      const rivalDelay = RIVAL.solveDelayMs[roundIdx % RIVAL.solveDelayMs.length];

      if (round.type === 'python' || round.type === 'cloud') {
        // Real-code rounds: scripted plays — canonical solution vs personality bug.
        pendingRef.current = new Promise((r) => setTimeout(r, Math.min(rivalDelay, 600))).then(() => {
          const champBug = Math.random() < evolved.bugRate;
          const rivalBug = Math.random() < RIVAL.bugRate;
          (window as any).__champBug = champBug;
          (window as any).__rivalBug = rivalBug;
          if (round.type === 'python') {
            return {
              kind: 'python',
              ms: Math.round(performance.now() - t0),
              champBug,
              rivalBug,
              champSql: champBug ? (round.buggy ?? round.solution ?? '') : (round.solution ?? ''),
              rivalSql: rivalBug ? (round.buggy ?? round.solution ?? '') : (round.solution ?? ''),
            };
          }
          const m = cloudMissionById(round.id);
          return {
            kind: 'cloud',
            ms: Math.round(performance.now() - t0),
            champBug,
            rivalBug,
            champSql: actionsToLines(champBug ? (m?.buggy ?? []) : (m?.solution ?? [])),
            rivalSql: actionsToLines(rivalBug ? (m?.buggy ?? []) : (m?.solution ?? [])),
          };
        });
      } else if (round.type === 'quiz') {
        const solvePromise = fetch('/api/arena/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz: { question: round.instructions, options: round.options, answer: round.answer }, championId: champion.id, strategyId: strategy.id, accuracy: evolved.quizAccuracy }),
        })
          .then((r) => r.json())
          .then((d) => ({ answer: d?.answer ?? '', ms: Math.round(performance.now() - t0) }))
          .catch(() => ({ answer: '', ms: Math.round(performance.now() - t0) }));

        // rival picks: correct at quizAccuracy, else a random wrong option
        const a = Array.isArray(round.answer) ? round.answer[0] : round.answer;
        const rivalHit = Math.random() < RIVAL.quizAccuracy;
        const wrongPool = (round.options ?? []).filter((o) => String(o).trim().toLowerCase() !== String(a ?? '').trim().toLowerCase());
        const rivalPick = rivalHit && a ? String(a) : (wrongPool[Math.floor(Math.random() * wrongPool.length)] ?? String(a ?? ''));

        pendingRef.current = Promise.all([solvePromise, new Promise((r) => setTimeout(r, Math.min(rivalDelay, 400)))])
          .then(([solve]) => ({ kind: 'quiz', answer: solve.answer, ms: solve.ms, rivalPick }));
      } else {
        // Champion solves via API while rival "types" the canonical answer.
        const solvePromise = fetch('/api/arena/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, caseId: round.id, championId: champion.id, strategyId: strategy.id }),
        })
          .then((r) => r.json())
          .then((d) => ({ sql: d?.sql ?? 'SELECT 1;', ms: Math.round(performance.now() - t0), usedLLM: !!d?.usedLLM }))
          .catch(() => ({ sql: 'SELECT 1;', ms: Math.round(performance.now() - t0), usedLLM: false }));

        pendingRef.current = Promise.all([solvePromise, new Promise((r) => setTimeout(r, Math.min(rivalDelay, 400)))])
          .then(([solve]) => {
            // Scripted-mode drama: without a live LLM the champion plays the
            // canonical solve — inject personality bugs so rounds can flip.
            const scripted = !solve.usedLLM;
            const champBug = scripted && Math.random() < evolved.bugRate;
            const rivalBug = Math.random() < RIVAL.bugRate;
            const tbl = round.schema?.[0]?.name ?? 'data';
            return {
              kind: 'sql',
              ms: solve.ms,
              champBug,
              rivalBug,
              champSql: champBug ? `SELECT * FROM ${tbl} WHERE 1 == 'oops';` : solve.sql,
              rivalSql: rivalBug ? `SELECT * FROM ${tbl}_corrupted;` : (round.solutionQuery ?? ''),
            };
          });
      }
      setStep('reading');
      setRefLine(REF.reading(round.type));
    };

    go();
    return () => { cancelled = true; };
  }, [phase, step, roundIdx, rounds, champion, strategy, isPlayerRound, prog.stage.level]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the staged solves and start the fight — called by the reading
  // countdown and by the "FIGHT" skip button. Consumes pendingRef once.
  const beginFight = useCallback(async () => {
    const round = rounds[roundIdx];
    if (!round) return;
    if (isPlayerRound) {
      setStep('youFight');
      setRefLine(
        round.type === 'quiz' ? 'Bleepx: "The coach tags in! Pick your answer." 🏷️'
        : round.type === 'python' ? 'Bleepx: "The coach tags in! Write the winning Python." 🏷️'
        : round.type === 'cloud' ? 'Bleepx: "The coach tags in! Build the infra yourself." 🏷️'
        : 'Bleepx: "The coach tags in! Write the winning query." 🏷️');
      return;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    const data = await pending;
    if (!data) return;
    if (data.kind === 'quiz') {
      (window as any).__champSolveMs = data.ms;
      setChampSql('> lock answer…');
      setRivalSql('> lock answer…');
      setStep('typing');
      setRefLine('Bleepx: "Both fighters are thinking… 👀"');
      setTimeout(() => { setChampAnswer(data.answer); setChampTyped(true); }, 900);
      setTimeout(() => { setRivalAnswer(data.rivalPick); setRivalTyped(true); }, Math.min(RIVAL.solveDelayMs[roundIdx % RIVAL.solveDelayMs.length], 1600));
    } else {
      (window as any).__champSolveMs = data.ms;
      (window as any).__champBug = data.champBug;
      (window as any).__rivalBug = data.rivalBug;
      setRivalSql(data.rivalSql);
      setChampSql(data.champSql);
      setStep('typing');
      setRefLine(`Bleepx: "${REF.typing[roundIdx % REF.typing.length]}"`);
    }
  }, [rounds, roundIdx, isPlayerRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reading beat: question shown first, fight starts after a beat that
  // scales with instruction length (tap FIGHT to skip).
  useEffect(() => {
    if (phase !== 'fight' || step !== 'reading') return;
    // Warm the Python runtime while the user reads the task.
    if (rounds[roundIdx]?.type === 'python') void loadPyodide().catch(() => {});
    const len = rounds[roundIdx]?.instructions.length ?? 0;
    const dur = Math.min(6500, 2400 + len * 28);
    const t = setTimeout(() => { void beginFight(); }, dur);
    return () => clearTimeout(t);
  }, [phase, step, roundIdx, beginFight]); // eslint-disable-line react-hooks/exhaustive-deps

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

      if (round.type === 'python') {
        const [champRes, rivalRes] = await Promise.all([
          runAndScorePython(isPlayerRound ? playerSql : champSql, round),
          runAndScorePython(rivalSql, round),
        ]);
        if (cancelled) return;
        finishRound({ ...champRes, solveMs: champSolveMs }, { ...rivalRes, solveMs: rivalSolveMs }, round);
        return;
      }

      if (round.type === 'cloud') {
        const m = cloudMissionById(round.id);
        const champActs = isPlayerRound
          ? playerActions
          : ((window as any).__champBug ? m?.buggy : m?.solution) ?? [];
        const rivalActs = ((window as any).__rivalBug ? m?.buggy : m?.solution) ?? [];
        const [champRes, rivalRes] = await Promise.all([
          runAndScoreCloud(champActs, m),
          runAndScoreCloud(rivalActs, m),
        ]);
        if (cancelled) return;
        finishRound({ ...champRes, solveMs: champSolveMs }, { ...rivalRes, solveMs: rivalSolveMs }, round);
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
      const champTotal = champ.solveMs + champ.execMs;
      const rivalTotal = rival.solveMs + rival.execMs;
      const champBug = !!(window as any).__champBug;
      const rivalBug = !!(window as any).__rivalBug;
      const diff = Math.abs(champTotal - rivalTotal);
      const v = champ.correct && champWon
        ? `${label} ${winsVerb} — clean hit, ${diff}ms faster${rivalBug ? ` while ${RIVAL.name}'s query glitched` : ''}!`
        : champ.correct
        ? `${label} ${wasVerb} right but ${RIVAL.name} edged it by ${diff}ms.`
        : champBug
        ? `${label}'s code threw a bug mid-fight — ${RIVAL.name} punishes it!`
        : `${RIVAL.name} takes the round — ${possLabel} answer missed.${champ.error ? ` (${champ.error})` : ''}`;

      setVerdict(v);
      const quip = champ.correct && champWon ? `${champion.name}: "${champion.quips.hit}"`
        : !champ.correct ? `${champion.name}: "${champion.quips.miss}"`
        : `${RIVAL.name}: "${RIVAL.quips.hit}"`;
      setRefLine(`Bleepx: "${champ.correct && champWon ? REF.champHit[roundIdx % 3] : !champ.correct ? REF.champMiss[roundIdx % 3] : REF.rivalHit[roundIdx % 2]}" ${quip}`);
      setResults((rs) => [...rs, { round, champ, rival, champWon, byPlayer: isPlayerRound }]);
      grantXp(champWon ? (isPlayerRound ? ARENA_XP.playerRoundWon : ARENA_XP.roundWon) : ARENA_XP.roundLost);
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
    const round = rounds[roundIdx];
    (window as any).__champSolveMs = 0;
    (window as any).__champBug = false;
    if (round.type === 'cloud') {
      const m = cloudMissionById(round.id);
      const rivalBug = Math.random() < RIVAL.bugRate;
      (window as any).__rivalBug = rivalBug;
      setChampSql(actionsToLines(playerActions));
      setRivalSql(actionsToLines(rivalBug ? (m?.buggy ?? []) : (m?.solution ?? [])));
    } else if (round.type === 'python') {
      const rivalBug = Math.random() < RIVAL.bugRate;
      (window as any).__rivalBug = rivalBug;
      setChampSql(playerSql);
      setRivalSql(rivalBug ? (round.buggy ?? '') : (round.solution ?? ''));
    } else {
      setChampSql(playerSql);
      setRivalSql(round.solutionQuery ?? '');
    }
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
    if (matchWon) grantXp(ARENA_XP.matchWon);
  }, [phase, xpAwarded, xp, matchWon]); // eslint-disable-line react-hooks/exhaustive-deps

  const verseName = VERSES.find(v => v.id === verse)?.name ?? 'Arena';
  const cardUrl = matchCardUrl({
    c: champion.id,
    st: prog.stage.level,
    v: verseName,
    t: TIERS.find(t => t.id === tier)?.name ?? String(tier),
    m: mode,
    w: wins,
    n: totalRounds,
    k: correct,
    ms: avgMs,
    xp,
    e: evolvedThisMatch.current ? 1 : undefined,
  });
  const shareText = `⚔️ ${mode === 'tagteam' ? 'You + ' : ''}${champion.name} ${wins}—${totalRounds - wins} vs ${RIVAL.name} · ${verseName} · ${matchWon ? 'MATCH WON' : 'defeated'} — think your champion beats mine?`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, url: cardUrl });
        return;
      }
    } catch { /* fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(`${shareText} ${cardUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  /* ─── SELECT ─── */
  if (phase === 'select' || phase === 'loading') {
    return (
      <div className="relative min-h-screen flex flex-col items-center px-4 py-10 overflow-hidden" style={{ background: BG }}>
        <style>{ARENA_CSS}</style>
        <div className="arena-ambient" aria-hidden />
        <div className="relative z-10 text-center mb-6">
          <motion.div
            className="text-5xl mb-3"
            animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            ⚔️
          </motion.div>
          <h1
            className="text-4xl font-black tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(90deg, #fff 0%, ${TEAL} 50%, #fff 100%)` }}
          >
            BLEEPX ARENA
          </h1>
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
          <div className="relative z-10 w-full max-w-md space-y-6">
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
                {CHAMPIONS.map((c) => {
                  const p = progMap[c.id] ?? { xp: 0, stage: EVO_STAGES[0], nextStage: EVO_STAGES[1], progressPct: 0 };
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setChampion(c); setSelectedChampionId(c.id); playBleep(); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                        champion.id === c.id ? 'bg-slate-800/80 scale-[1.02]' : 'bg-slate-800/30 opacity-70 hover:opacity-100'
                      }`}
                      style={{ borderColor: champion.id === c.id ? c.color : '#2B333C' }}
                    >
                      <Avatar color={p.stage.level >= 2 ? p.stage.aura : c.color} emoji={c.emoji} sprite={c.sprite} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm">
                          {c.name} <span className="font-normal text-slate-400">· {c.title}</span>
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle" style={{ background: `${p.stage.aura}22`, color: p.stage.aura }}>
                            {p.stage.emoji} {p.stage.name}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 truncate">{c.blurb}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.progressPct}%`, background: p.stage.aura }} />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap">
                            {p.nextStage ? `${p.xp}/${p.nextStage.xpNeeded} XP` : `${p.xp} XP · MAX`}
                          </span>
                        </div>
                      </div>
                      {champion.id === c.id && <span className="text-lg">✓</span>}
                    </button>
                  );
                })}
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
              className="w-full py-4 rounded-2xl font-black text-lg tracking-wide text-[#0d1117] transition-transform active:scale-95 arena-glowpulse"
              style={{ background: TEAL }}
            >
              ENTER THE ARENA
            </button>
            <p className="text-center text-[11px] text-slate-500">
              {mode === 'tagteam' ? 'You fight round 3 — your champion warms up on 1–2.' : `${champion.name} fights all ${MAX_ROUNDS_DISPLAY} rounds under ${strategy.name}.`}
            </p>

            {/* live gauntlet — what the widget taps through to */}
            {runner?.state.status === 'running' && (
              <div className={`rounded-2xl border p-4 ${runner.state.intervention ? 'border-red-400/60 bg-red-500/5' : 'border-teal-400/30 bg-teal-400/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: runner.state.intervention ? '#F87171' : TEAL }}>
                    {runner.state.intervention ? '⚡ YOUR CALL' : `⚔️ GAUNTLET LIVE · M${runner.state.fight.matchIdx + 1}${runner.state.endless ? ' ♾️' : `/${runner.state.totalMatches}`}`}
                  </p>
                  <p className="text-[10px] text-slate-500">{runner.state.verse} · {runner.state.tier}</p>
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <img src={champion.sprite} alt="" className={`w-10 h-10 rounded-full ${runner.state.intervention ? '' : 'arena-mini-fight'}`} style={{ boxShadow: `0 0 12px ${champion.color}88` }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${runner.state.fight.champHp}%`, background: champion.color }} />
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${runner.state.fight.rivalHp}%`, background: RIVAL.color }} />
                    </div>
                  </div>
                  <img src={RIVAL.sprite} alt={runner.state.rivalName} className={`w-10 h-10 rounded-full ${runner.state.intervention ? '' : 'arena-mini-fight-r'}`} style={{ boxShadow: `0 0 12px ${RIVAL.color}66` }} />
                </div>
                <p className="text-[11px] text-slate-400 mb-1">{runner.state.fight.lastEvent}</p>
                {runner.state.intervention && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[11px] text-red-200 leading-snug">{runner.state.intervention.prompt}</p>
                    {runner.state.intervention.choices.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => runner.answer(c)}
                        className="w-full flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                      >
                        <span>{c.emoji}</span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold text-white leading-tight">{c.label}</span>
                          <span className="block text-[10px] text-slate-500 leading-tight">{c.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* auto-gauntlet — the idle mode */}
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">🤖 Auto-Gauntlet</p>
                <div className="flex gap-1">
                  {[3, 5, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGauntletMatches(n)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${gauntletMatches === n ? 'border-amber-300 text-amber-200 bg-amber-400/15' : 'border-slate-700 text-slate-500'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                {champion.name} fights {gauntletMatches} matches on its own while you keep playing the app. Watch it live in the corner widget — and jump in when it calls for you.
              </p>
              <button
                onClick={() => {
                  runner?.start({ championId: champion.id, verse: verseName, tier, matches: gauntletMatches });
                  setStatus(`${champion.name} is fighting the gauntlet — track it bottom-left, or keep browsing.`);
                }}
                disabled={runner?.state.status === 'running'}
                className="w-full py-3 rounded-2xl font-black text-sm transition-transform active:scale-95 disabled:opacity-40"
                style={{ background: '#FBBF24', color: '#0d1117' }}
              >
                {runner?.state.status === 'running' ? 'GAUNTLET IN PROGRESS…' : `SEND ${champion.name.toUpperCase()} TO FIGHT ×${gauntletMatches}`}
              </button>
            </div>
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
          <div className="flex items-center justify-between rounded-xl bg-slate-800/70 px-4 py-3 mb-3">
            <p className="text-sm font-bold" style={{ color: TEAL }}>+{xp} XP</p>
            <p className="text-[11px] text-slate-400">added to your Bleepx points</p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-800/70 px-4 py-3 mb-5">
            <p className="text-sm font-bold" style={{ color: prog.stage.aura }}>{prog.stage.emoji} {prog.stage.name}</p>
            <p className="text-[11px] text-slate-400">
              {evolvedThisMatch.current
                ? `⚡ evolved this match → ${evolvedThisMatch.current}!`
                : prog.nextStage
                ? `${champion.name} · ${prog.xp}/${prog.nextStage.xpNeeded} XP to ${prog.nextStage.name}`
                : `${champion.name} · ${prog.xp} XP · max stage`}
            </p>
          </div>
          <button
            onClick={share}
            className="w-full py-3.5 rounded-2xl font-black text-[#0d1117] mb-3 transition-transform active:scale-95"
            style={{ background: TEAL }}
          >
            {copied ? 'LINK COPIED!' : 'SHARE MATCH CARD'}]
          </button>
          <button
            onClick={() => { setPhase('select'); setResults([]); setRoundIdx(0); setXpAwarded(false); setStatus(''); evolvedThisMatch.current = null; }}
            className="w-full py-3 rounded-2xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            RUN IT BACK
          </button>
        </div>
        <a href={cardUrl} target="_blank" rel="noopener" className="text-[11px] mt-4 hover:underline" style={{ color: TEAL }}>preview your match card ↗</a>
        <p className="text-[11px] text-slate-600 mt-2">better bots. brighter wins.</p>
      </div>
    );
  }

  /* ─── FIGHT ─── */
  const round = rounds[roundIdx];
  if (!round) return null;
  const scorePips = rounds.map((_, i) => results[i]?.champWon);

  const readSecs = Math.min(6.5, 2.4 + round.instructions.length * 0.028);

  return (
    <div className={`fixed inset-0 z-40 flex flex-col px-3 py-2 overflow-hidden ${shake ? 'arena-shake' : ''}`} style={{ background: BG }}>
      <style>{ARENA_CSS}</style>
      {/* ambient arena backdrop — the environment shift */}
      <div className="arena-ambient" aria-hidden />

      {/* cinematic entry — the world changes */}
      <AnimatePresence>
        {cinematic && <ArenaIntro champion={champion} stage={prog.stage} verseName={verseName} />}
      </AnimatePresence>

      {/* evolution moment */}
      {evoBanner && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <p className="arena-banner text-3xl font-black" style={{ color: prog.stage.aura, textShadow: `0 0 30px ${prog.stage.aura}` }}>{evoBanner}</p>
        </div>
      )}
      {/* round banner */}
      {banner && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <p className="arena-banner text-5xl font-black text-white" style={{ textShadow: `0 0 30px ${TEAL}` }}>{banner}</p>
        </div>
      )}

      {/* compact top bar — round pips + referee in one strip */}
      <div className="relative z-10 flex items-center gap-2 mb-1">
        <div className="flex gap-1.5 shrink-0">
          {scorePips.map((w, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full border ${i === roundIdx ? 'animate-pulse' : ''}`}
              style={{ borderColor: '#475569', background: w === undefined ? 'transparent' : w ? '#4ADE80' : '#F87171' }}
            />
          ))}
        </div>
        <p className="text-[10px] font-bold tracking-widest text-slate-500 shrink-0">R{roundIdx + 1}/{rounds.length}</p>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 rounded-lg bg-slate-900/70 border border-slate-800/80 px-2 py-1">
          <img src="/arena/bleepx.png" alt="" className="w-5 h-5 rounded-full shrink-0" />
          <p className="text-[10px] text-slate-300 italic truncate">{refLine || 'Bleepx: "Welcome to the arena!"'}</p>
        </div>
        <button
          onClick={() => setPhase('select')}
          title="Leave match"
          className="shrink-0 w-6 h-6 rounded-md border border-slate-700/80 text-slate-500 text-[11px] font-bold leading-none hover:text-slate-300 hover:border-slate-500 transition-colors"
        >
          ✕
        </button>
      </div>

      {step === 'reading' ? (
        <ReadingCard round={round} roundIdx={roundIdx} total={rounds.length} verseName={verseName} secs={readSecs} onFight={beginFight} />
      ) : (
      <>
      {/* round title — compact, instructions clamped (full text was on the reading card) */}
      <div className="relative z-10 text-center mb-1">
        <h2 className="text-sm font-black text-white truncate">{round.name}</h2>
        <p className="text-[10px] text-slate-500 line-clamp-1 max-w-md mx-auto">{round.instructions}</p>
      </div>

      {/* THE RING — compact animated duel strip */}
      <div className="relative z-10 shrink-0 rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/30 to-[#151a21]/60 px-4 pt-1.5 pb-0.5 mb-1.5">
        <div className="flex items-start justify-between max-w-xs mx-auto">
          <div className="relative flex flex-col items-center">
            <DamageNumber show={step === 'verdict' && results[roundIdx] != null && !results[roundIdx].champWon} amount="-34" color="#F87171" />
            <RingFighter
              sprite={isPlayerRound ? undefined : champion.sprite}
              emoji={isPlayerRound ? '🧑‍💻' : champion.emoji}
              color={isPlayerRound ? TEAL : champion.color}
              aura={isPlayerRound ? undefined : prog.stage.aura}
              side="left"
              step={step}
              result={results[roundIdx]?.champ}
              name={isPlayerRound ? 'YOU' : champion.name}
            />
            <p className="text-[9px] font-bold mt-0.5" style={{ color: isPlayerRound ? TEAL : champion.color }}>
              {isPlayerRound ? 'YOU' : champion.name.toUpperCase()}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center pt-4">
            <ClashSparks active={step === 'executing'} />
            {step !== 'executing' && <span className="text-xl font-black text-slate-600 arena-vs">VS</span>}
          </div>
          <div className="relative flex flex-col items-center">
            <DamageNumber show={step === 'verdict' && results[roundIdx] != null && results[roundIdx].champWon} amount="-34" color="#F87171" />
            <RingFighter
              sprite={RIVAL.sprite}
              emoji={RIVAL.emoji}
              color={RIVAL.color}
              side="right"
              step={step}
              result={results[roundIdx]?.rival}
              name={RIVAL.name}
            />
            <p className="text-[9px] font-bold mt-0.5" style={{ color: RIVAL.color }}>{RIVAL.name}</p>
          </div>
        </div>
        {/* arena floor */}
        <div className="h-px mt-0.5 mx-2 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${TEAL}55, transparent)` }} />
      </div>

      {/* side-by-side code panels — no scrolling, both visible at once */}
      <div className="relative z-10 grid grid-cols-2 gap-2 flex-1 min-h-0 max-w-2xl mx-auto w-full">
        <FighterCard
          side="you"
          color={isPlayerRound ? TEAL : champion.color}
          emoji={isPlayerRound ? '🧑‍💻' : champion.emoji}
          sprite={isPlayerRound ? undefined : champion.sprite}
          name={isPlayerRound ? 'YOU' : champion.name.toUpperCase()}
          subtitle={isPlayerRound ? 'tagged in!' : `${prog.stage.emoji} ${prog.stage.name} · ${strategy.name}`}
          step={step}
          sql={isQuiz ? '' : champSql}
          answer={isQuiz ? (isPlayerRound ? playerAnswer : champAnswer) : ''}
          options={isQuiz ? round.options : undefined}
          correctAnswer={isQuiz ? round.answer : undefined}
          typingSpeed={evolved.typingSpeed}
          typeStyle={evolved.typeStyle}
          typingActive={step === 'typing' && !isQuiz}
          onTyped={() => setChampTyped(true)}
          result={results[roundIdx]?.champ}
          hp={champHp}
        />
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
          typeStyle={RIVAL.typeStyle}
          typingActive={step === 'typing' && !isQuiz}
          onTyped={() => setRivalTyped(true)}
          result={results[roundIdx]?.rival}
          hp={rivalHp}
        />
      </div>

      </>
      )}

      {/* verdict + actions — pinned to the bottom of the viewport */}
      <div className="relative z-10 max-w-lg mx-auto w-full mt-2 space-y-2 shrink-0">
        {step === 'youFight' && !isQuiz && rounds[roundIdx]?.type === 'cloud' && (
          <div className="rounded-2xl border-2 p-3" style={{ borderColor: TEAL }}>
            <p className="text-xs font-bold mb-2" style={{ color: TEAL }}>🤝 You're tagged in — run the mission:</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(cloudMissionById(rounds[roundIdx].id)?.palette ?? []).map((a, i) => (
                <button
                  key={i}
                  onClick={() => { setPlayerActions((p) => [...p, a]); playBleep(); }}
                  className="px-2 py-1 rounded-lg bg-[#0d1117] border border-slate-700 text-[10px] font-mono text-slate-200 hover:border-cyan-400 transition-colors"
                >
                  + {a.label}
                </button>
              ))}
            </div>
            <div className="bg-[#0d1117] rounded-lg border border-slate-700 p-2 min-h-[44px] font-mono text-[10px] text-slate-300 whitespace-pre-wrap">
              {playerActions.length ? actionsToLines(playerActions) : '# tap actions to build your run…'}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setPlayerActions((p) => p.slice(0, -1))}
                className="px-3 py-2 rounded-xl border border-slate-600 text-slate-300 text-xs font-bold"
              >
                UNDO
              </button>
              <button
                onClick={playerFight}
                disabled={!playerActions.length}
                className="flex-1 py-3 rounded-xl font-black text-[#0d1117] transition-transform active:scale-95 disabled:opacity-40"
                style={{ background: TEAL }}
              >
                RUN MISSION
              </button>
            </div>
          </div>
        )}
        {step === 'youFight' && !isQuiz && rounds[roundIdx]?.type !== 'cloud' && (
          <div className="rounded-2xl border-2 p-3" style={{ borderColor: TEAL }}>
            <p className="text-xs font-bold mb-2" style={{ color: TEAL }}>
              🤝 You're tagged in — write the {rounds[roundIdx]?.type === 'python' ? 'Python' : 'query'}:
            </p>
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
          <p className="text-center text-[11px] text-slate-500 animate-pulse">
            {step === 'intro' && 'Bleepx is reading the round…'}
            {step === 'typing' && (isQuiz ? 'Fighters are locking in…' : 'Fighters are writing their queries…')}
            {step === 'executing' && (isQuiz ? 'Revealing answers…' : rounds[roundIdx]?.type === 'python' ? 'Running in Pyodide — real code, real clock…' : rounds[roundIdx]?.type === 'cloud' ? 'Provisioning in the sandbox…' : 'Executing — racing the clock…')}
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
/* ambient environment — slow drifting glow + spotlight */
.arena-ambient { position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(60% 45% at 50% 0%, rgba(87,236,244,.07), transparent 70%),
    radial-gradient(45% 40% at 15% 85%, rgba(167,139,250,.06), transparent 70%),
    radial-gradient(45% 40% at 85% 85%, rgba(255,122,26,.05), transparent 70%);
}
.arena-ambient::after { content:''; position:absolute; inset:0;
  background: radial-gradient(80% 60% at 50% 55%, rgba(87,236,244,.05), transparent 75%);
  animation: arena-breathe 5s ease-in-out infinite; }
@keyframes arena-breathe { 0%,100% { opacity:.4 } 50% { opacity:1 } }
@keyframes arena-readbar { from { width:100% } to { width:0% } }
.arena-readbar { animation: arena-readbar linear forwards }
@keyframes arena-glowpulse { 0%,100% { box-shadow: 0 0 18px rgba(87,236,244,.35) } 50% { box-shadow: 0 0 34px rgba(87,236,244,.7) } }
.arena-glowpulse { animation: arena-glowpulse 2.2s ease-in-out infinite }
`;

/* Cinematic match entry — the environment change. Sprites fly in, names
 * clash, then the whole overlay burns away into the fight. */
function ArenaIntro({ champion, stage, verseName }: { champion: Champion; stage: { emoji: string; name: string; aura: string }; verseName: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(80% 80% at 50% 50%, #151a24 0%, #0b0f15 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.15, filter: 'blur(6px)' }}
      transition={{ duration: 0.4, exit: { duration: 0.45 } }}
    >
      <motion.p className="text-[10px] font-bold tracking-[0.4em] text-slate-500 mb-6"
        initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        {verseName.toUpperCase()}
      </motion.p>
      <div className="flex items-center gap-8 sm:gap-14">
        <motion.div className="flex flex-col items-center"
          initial={{ x: -160, opacity: 0, rotate: -10 }} animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.25 }}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-[#0d1117]"
            style={{ border: `4px solid ${champion.color}`, boxShadow: `0 0 40px ${champion.color}88, 0 0 80px ${stage.aura}44` }}>
            {champion.sprite ? <img src={champion.sprite} alt={champion.name} className="w-full h-full object-cover" /> : <span className="text-5xl">{champion.emoji}</span>}
          </div>
          <p className="mt-3 font-black text-white text-lg tracking-wide">{champion.name.toUpperCase()}</p>
          <p className="text-[11px] font-bold" style={{ color: stage.aura }}>{stage.emoji} {stage.name}</p>
        </motion.div>
        <motion.span className="text-4xl sm:text-5xl font-black"
          style={{ color: TEAL, textShadow: `0 0 30px ${TEAL}` }}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.6, 1], opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}>
          VS
        </motion.span>
        <motion.div className="flex flex-col items-center"
          initial={{ x: 160, opacity: 0, rotate: 10 }} animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.35 }}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-[#0d1117]"
            style={{ border: `4px solid ${RIVAL.color}`, boxShadow: `0 0 40px ${RIVAL.color}88` }}>
            {RIVAL.sprite ? <img src={RIVAL.sprite} alt={RIVAL.name} className="w-full h-full object-cover" /> : <span className="text-5xl">{RIVAL.emoji}</span>}
          </div>
          <p className="mt-3 font-black text-white text-lg tracking-wide">{RIVAL.name}</p>
          <p className="text-[11px] font-bold text-slate-400">🏠 House Champion</p>
        </motion.div>
      </div>
      <motion.p className="mt-8 text-sm font-bold text-slate-400 tracking-widest"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        3 ROUNDS · NO MERCY
      </motion.p>
    </motion.div>
  );
}

/* Reading card — the question takes the whole stage before the bots move. */
function ReadingCard({ round, roundIdx, total, verseName, secs, onFight }: {
  round: RoundDef; roundIdx: number; total: number; verseName: string; secs: number; onFight: () => void;
}) {
  return (
    <motion.div
      className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-2"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
    >
      <p className="text-[10px] font-bold tracking-[0.35em] text-slate-500">
        ROUND {roundIdx + 1} OF {total} · {round.type === 'quiz' ? 'QUIZ DUEL' : round.type === 'python' ? 'PYTHON CODE DUEL' : round.type === 'cloud' ? 'BUILD MISSION' : 'SQL DUEL'}
      </p>
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur px-5 py-5 text-center"
        style={{ boxShadow: '0 0 50px rgba(87,236,244,.08)' }}>
        <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: TEAL }}>{verseName.toUpperCase()}</p>
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{round.name}</h2>
        <p className="text-sm text-slate-300 mt-3 leading-relaxed">{round.instructions}</p>
        {round.type === 'quiz' && (round.options?.length ?? 0) > 0 && (
          <div className="mt-4 space-y-1.5 text-left">
            {round.options!.map((opt, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-700/70 bg-[#0d1117]/60 px-2.5 py-1.5">
                <span className="shrink-0 w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-black"
                  style={{ background: '#1e293b', color: TEAL }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <p className="text-[11px] text-slate-200 leading-snug break-words min-w-0">{opt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* countdown bar */}
      <div className="w-full max-w-xs h-1 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full arena-readbar" style={{ background: TEAL, animationDuration: `${secs}s` }} />
      </div>
      <button
        onClick={onFight}
        className="px-8 py-3 rounded-2xl font-black text-sm text-[#0d1117] transition-transform active:scale-95 arena-glowpulse"
        style={{ background: TEAL }}
      >
        FIGHT ▸
      </button>
    </motion.div>
  );
}

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
  side, color, emoji, sprite, name, subtitle, step, sql, answer, options, correctAnswer, typingSpeed, typeStyle, typingActive, onTyped, result, hp,
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
  typeStyle?: 'burst' | 'steady' | 'erratic';
  typingActive: boolean;
  onTyped: () => void;
  result?: FighterResult;
  hp?: number;
}) {
  const isQuizCard = !!options?.length;
  const correctText = Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer;
  return (
    <div className="rounded-2xl border-2 bg-slate-900/60 p-2.5 transition-all h-full min-h-0 flex flex-col" style={{ borderColor: step === 'executing' ? color : '#2B333C' }}>
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        <Avatar color={color} emoji={emoji} sprite={sprite} size="sm" hit={result != null && !result.correct && step === 'verdict'} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-white leading-tight truncate">{name}</p>
          <p className="text-[9px] text-slate-400 truncate">{subtitle}</p>
        </div>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: step === 'executing' ? color : '#1e293b', color: step === 'executing' ? '#0d1117' : '#94a3b8' }}
        >
          {step === 'typing' ? (isQuizCard ? 'LOCKING…' : 'WRITING…') : step === 'executing' ? (isQuizCard ? 'REVEAL' : 'RUNNING') : step === 'verdict' ? (result?.correct ? 'HIT' : 'MISS') : 'READY'}
        </span>
      </div>
      {typeof hp === 'number' && <div className="shrink-0"><HpBar pct={hp} color={color} /></div>}
      <div className="rounded-xl bg-[#0d1117] border border-slate-800 p-2.5 mt-1.5 flex-1 min-h-0 overflow-y-auto">
        {isQuizCard ? (
          <div className="space-y-1">
            {options!.map((opt, i) => {
              const picked = answer === opt;
              const isCorrect = step === 'verdict' && String(opt).trim().toLowerCase() === String(correctText ?? '').trim().toLowerCase();
              const rowCls = isCorrect
                ? 'border-emerald-500/70 bg-emerald-500/15'
                : picked && step === 'verdict'
                ? 'border-red-500/70 bg-red-500/15'
                : picked
                ? 'border-cyan-400/70 bg-cyan-400/15'
                : 'border-slate-800 bg-slate-900/40';
              const chipCls = isCorrect
                ? 'bg-emerald-500 text-[#0d1117]'
                : picked && step === 'verdict'
                ? 'bg-red-500 text-white'
                : picked
                ? 'bg-cyan-400 text-[#0d1117]'
                : 'bg-slate-800 text-slate-400';
              const textCls = isCorrect ? 'text-emerald-200' : picked && step === 'verdict' ? 'text-red-200' : picked ? 'text-cyan-100' : 'text-slate-400';
              return (
                <div key={i} className={`flex items-start gap-1.5 rounded-lg border px-1.5 py-1 transition-all ${rowCls} ${picked ? 'scale-[1.01]' : ''}`}>
                  <span className={`shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-black ${chipCls}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <p className={`text-[10px] leading-snug break-words min-w-0 ${textCls}`}>
                    {opt}
                    {isCorrect && <span className="ml-1 font-bold">✓</span>}
                    {picked && !isCorrect && <span className="ml-1 font-bold">◂</span>}
                  </p>
                </div>
              );
            })}
            {!answer && (
              <p className="text-[10px] text-slate-600 italic pt-0.5">{step === 'typing' || step === 'executing' ? 'locking in…' : '…'}</p>
            )}
          </div>
        ) : sql ? (
          <TypedSql text={sql} cps={typingSpeed} active={typingActive} onDone={onTyped} style={typeStyle} />
        ) : (
          <p className="text-[11px] text-slate-600 italic">{step === 'youFight' && side === 'you' ? 'waiting for your input below…' : '…'}</p>
        )}
      </div>
      {result && step === 'verdict' && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-slate-400 shrink-0">
          <span>{result.correct ? '✅ correct' : result.error ? `❌ ${result.error.slice(0, 40)}` : '❌ wrong result'}</span>
          {result.execMs > 0 && <span>⏱ {result.execMs}ms exec</span>}
          {result.rows > 0 && <span>{result.rows} rows</span>}
        </div>
      )}
    </div>
  );
}
