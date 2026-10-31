'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Swords } from 'lucide-react';
import { decodeMatchCard } from '@/lib/arena/matchCard';
import { getChampion, RIVAL } from '@/lib/arena/champions';
import { EVO_STAGES } from '@/lib/arena/evolution';

const TEAL = '#57ECF4';
const BG = '#0B0E14';

export default function MatchCardView() {
  const params = useSearchParams();
  const data = useMemo(() => decodeMatchCard(params.get('d') ?? ''), [params]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data) document.title = `${getChampion(data.c).name} ${data.w}—${data.n - data.w} vs ${RIVAL.name} · Bleepx Arena`;
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: BG }}>
        <Swords size={34} className="text-slate-200" />
        <p className="text-slate-400 text-sm">This match card is empty or broken.</p>
        <Link href="/arena" className="px-6 py-3 rounded-2xl font-black text-sm" style={{ background: TEAL, color: '#0d1117' }}>
          ENTER THE ARENA
        </Link>
      </div>
    );
  }

  const champion = getChampion(data.c);
  const stage = EVO_STAGES[Math.min(Math.max(0, data.st), EVO_STAGES.length - 1)];
  const matchWon = data.w > data.n - data.w;
  const url = typeof window !== 'undefined' ? window.location.href : '';

  const share = async () => {
    const text = `${champion.name} ${data.w}—${data.n - data.w} vs ${RIVAL.name} · ${data.v} · ${matchWon ? 'MATCH WON' : 'defeated'}${data.b ? ` · powered by ${data.b}` : ''} — think your champion beats mine?`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
    } catch { /* fall through */ }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const bars: { label: string; left: string; right: string; pct: number }[] = [
    { label: 'CORRECT', left: `${data.k}/${data.n}`, right: '', pct: data.n ? (data.k / data.n) * 100 : 0 },
    { label: 'AVG SOLVE', left: `${(data.ms / 1000).toFixed(1)}s`, right: '', pct: Math.min(100, (3000 / Math.max(1, data.ms)) * 50) },
    { label: 'ROUNDS WON', left: `${data.w}/${data.n}`, right: `${data.n - data.w}/${data.n}`, pct: data.n ? (data.w / data.n) * 100 : 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: BG }}>
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(60% 45% at 50% 38%, ${matchWon ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.10)'}, transparent 70%), radial-gradient(80% 60% at 50% 100%, rgba(87,236,244,.07), transparent 70%)` }} />

      <div className="relative z-10 w-full max-w-sm">
        <p className="text-center text-[10px] font-bold tracking-[0.4em] text-slate-500 mb-4">BLEEPX ARENA · MATCH CARD</p>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 backdrop-blur p-6"
          style={{ boxShadow: `0 0 60px ${matchWon ? 'rgba(74,222,128,.18)' : 'rgba(87,236,244,.12)'}` }}>
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <img src={champion.sprite} alt={champion.name} className="w-20 h-20 rounded-full object-cover"
                  style={{ boxShadow: `0 0 24px ${stage.aura}88`, border: `2px solid ${stage.aura}` }} />
                
              </div>
              <p className="text-xs font-black" style={{ color: champion.color }}>{champion.name.toUpperCase()}</p>
              {data.b && <p className="text-[9px] text-slate-400 mt-0.5">powered by {data.b}</p>}
              <p className="text-[9px] text-slate-500">{stage.name}{data.m === 'tagteam' ? ' + you' : ''}</p>
            </div>
            <p className="text-5xl font-black text-white">{data.w}<span className="text-slate-600 mx-1">—</span>{data.n - data.w}</p>
            <div className="flex flex-col items-center gap-2">
              <img src={RIVAL.sprite} alt={RIVAL.name} className="w-20 h-20 rounded-full object-cover"
                style={{ boxShadow: `0 0 24px ${RIVAL.color}55`, border: `2px solid ${RIVAL.color}66`, filter: matchWon ? 'grayscale(.6)' : 'none' }} />
              <p className="text-xs font-black" style={{ color: RIVAL.color }}>{RIVAL.name}</p>
              <p className="text-[9px] text-slate-500">House bot</p>
            </div>
          </div>

          <p className="text-center text-xl font-black mb-1" style={{ color: matchWon ? '#4ADE80' : '#F87171' }}>
            {matchWon ? 'MATCH WON' : 'DEFEATED'}
          </p>
          {!!data.e && <p className="text-center text-[11px] font-bold mb-1" style={{ color: stage.aura }}>⚡ evolved this match</p>}
          <p className="text-center text-[11px] text-slate-400 mb-5">{data.v} · {data.t}</p>

          <div className="space-y-3 mb-5">
            {bars.map((b) => (
              <div key={b.label}>
                <p className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">{b.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold w-12 text-left" style={{ color: TEAL }}>{b.left}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: TEAL }} />
                  </div>
                  <span className="text-xs font-bold w-12 text-right text-amber-300">{b.right}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={share}
            className="w-full py-3 rounded-2xl font-bold text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors">
            {copied ? 'LINK COPIED!' : '🔗 SHARE THIS CARD'}
          </button>
        </div>

        <Link href="/arena"
          className="mt-4 block w-full py-4 rounded-2xl font-black text-center text-[#0d1117] transition-transform active:scale-95"
          style={{ background: TEAL, boxShadow: `0 0 40px ${TEAL}55` }}>
          THINK YOUR CHAMPION BEATS THIS? ENTER THE ARENA
        </Link>
        <p className="text-center text-[10px] text-slate-600 mt-4">better bots. brighter wins.</p>
      </div>
    </div>
  );
}
