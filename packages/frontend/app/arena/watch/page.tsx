'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { decodeReplay, generateReplay, MatchReplay } from '@/lib/arena/replay';
import { CHAMPIONS, RIVAL } from '@/lib/arena/champions';
import { dailyDuelSpec, RIVAL_POOL } from '@/lib/arena/daily';

const BG = '#0d1117';
const TEAL = '#2DD4BF';

function SpectateInner() {
  const params = useSearchParams();
  const [tick, setTick] = useState(0);

  const replay: MatchReplay | null = useMemo(() => {
    const d = params.get('d');
    if (d) {
      const decoded = decodeReplay(d);
      if (decoded) return decoded;
    }
    // ?seed=N — deterministic demo replay (daily duel, shareable without a real match)
    const seedParam = params.get('seed');
    const seed = seedParam ? parseInt(seedParam, 10) : dailyDuelSpec().seed;
    const spec = dailyDuelSpec();
    const champ = CHAMPIONS[Math.abs(seed) % CHAMPIONS.length];
    const rivalName = params.get('rival') || spec.rival;
    return generateReplay(seed, champ, rivalName, RIVAL.sprite, RIVAL.color, spec.verse, spec.tier);
  }, [params]);

  useEffect(() => {
    if (!replay || tick >= replay.events.length + 1) return;
    const t = setTimeout(() => setTick((v) => v + 1), 1400);
    return () => clearTimeout(t);
  }, [replay, tick]);

  if (!replay) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: BG }}>
        <p className="text-slate-400 mb-4">This fight link is empty or expired.</p>
        <Link href="/arena" className="px-4 py-2 rounded-xl font-bold text-[#0d1117]" style={{ background: TEAL }}>ENTER THE ARENA</Link>
      </div>
    );
  }

  const shown = replay.events.slice(0, tick);
  const cur = shown[shown.length - 1];
  const done = tick >= replay.events.length + 1;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ background: BG }}>
      <div className="w-full max-w-md">
        <p className="text-center text-[10px] font-black tracking-[0.3em] text-slate-500 mb-1">LIVE REPLAY · {replay.verse.toUpperCase()}</p>
        <h1 className="text-center text-2xl font-black text-white mb-6">
          {replay.champ} <span className="text-slate-500">vs</span> {replay.rival}
        </h1>

        {/* fighters */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center">
            <img src={replay.champSprite} alt="" className={`w-16 h-16 rounded-full ${!done ? 'arena-mini-fight' : ''}`} style={{ boxShadow: `0 0 20px ${replay.champColor}88` }} />
            <p className="mt-1 text-xs font-bold text-white">{replay.champ}</p>
          </div>
          <p className="text-xl font-black text-slate-600">VS</p>
          <div className="text-center">
            <img src={replay.rivalSprite} alt="" className={`w-16 h-16 rounded-full ${!done ? 'arena-mini-fight-r' : ''}`} style={{ boxShadow: `0 0 20px ${replay.rivalColor}66` }} />
            <p className="mt-1 text-xs font-bold text-white">{replay.rival}</p>
          </div>
        </div>

        {/* hp */}
        <div className="space-y-2 mb-6">
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full transition-all duration-700" style={{ width: `${cur?.champHp ?? 100}%`, background: replay.champColor }} />
          </div>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full transition-all duration-700" style={{ width: `${cur?.rivalHp ?? 100}%`, background: replay.rivalColor }} />
          </div>
        </div>

        {/* ticker */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 min-h-[7rem] mb-6">
          {shown.length === 0 && <p className="text-slate-500 text-sm">Bleepx raises the mic…</p>}
          {shown.map((e) => (
            <p key={e.round} className={`text-sm mb-1 ${e.kind === 'hit' ? 'text-teal-300' : 'text-red-300'}`}>
              R{e.round + 1} · {e.line}
            </p>
          ))}
          {done && (
            <p className="text-sm font-black text-white mt-2">
              {replay.result.champWins}–{replay.result.rivalWins} — {replay.result.won ? `${replay.champ} TAKES IT` : `${replay.rival} TAKES IT`}
            </p>
          )}
        </div>

        <Link
          href="/arena"
          className="block w-full py-3 rounded-2xl text-center font-black text-sm text-[#0d1117] arena-glowpulse"
          style={{ background: TEAL }}
        >
          FIELD YOUR OWN CHAMPION
        </Link>
        <p className="text-center text-[10px] text-slate-600 mt-3">Every champ fights real challenges. Yours could be next.</p>
      </div>
    </div>
  );
}

export default function SpectatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: BG }} />}>
      <SpectateInner />
    </Suspense>
  );
}
