'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { VERIFIED_PERKS, isVerified, setVerified } from '@/lib/arena/verified';

const BG = '#1C2129';
const GOLD = '#FBBF24';

export default function VerifiedPage() {
  const [verified, setV] = useState(() => (typeof window !== 'undefined' ? isVerified() : false));

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ background: BG }}>
      <div className="w-full max-w-md">
        <p className="text-center text-[10px] font-black tracking-[0.3em] text-slate-500 mb-1">BLEEPX</p>
        <h1 className="text-center text-3xl font-black mb-1 flex items-center justify-center gap-2" style={{ color: GOLD }}>VERIFIED</h1>
        <p className="text-center text-sm text-slate-400 mb-8">
          Your champion never stops. Neither should your rank.
        </p>

        <div className="rounded-3xl border-2 p-6 mb-6" style={{ borderColor: GOLD, background: 'rgba(251,191,36,0.04)' }}>
          <div className="text-center mb-4">
            <span className="text-[10px] font-black tracking-[0.2em] px-2.5 py-1 rounded-full" style={{ background: `${GOLD}22`, color: GOLD }}>FREE PREVIEW — PRICING NOT LIVE YET</span>
          </div>
          <ul className="space-y-3 mb-6">
            {VERIFIED_PERKS.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-slate-200">
                <Check size={15} className="shrink-0 mt-0.5" style={{ color: GOLD }} />{p}
              </li>
            ))}
          </ul>
          {verified ? (
            <p className="text-center font-bold flex items-center justify-center gap-2" style={{ color: GOLD }}>
              <Check size={16} /> You're Verified — your champ fights forever.
            </p>
          ) : (
            <button
              onClick={() => {
                // Checkout wiring is next (Stripe) — until then this is a free preview.
                setVerified(true); setV(true);
              }}
              className="w-full py-4 rounded-2xl font-black text-lg text-[#0d1117] transition-transform active:scale-95"
              style={{ background: GOLD }}
            >
              ENABLE VERIFIED PREVIEW
            </button>
          )}
          <p className="text-center text-[10px] text-slate-500 mt-3">
            Free tier stays free forever — every verse, every duel, your full champion. Verified is free while in preview; real pricing will be announced on the home page and in our Terms before any charge.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 mb-6">
          <p className="text-xs font-bold text-slate-300 mb-1">For recruiters</p>
          <p className="text-[11px] text-slate-400">
            Send a candidate an eval link — they fight a gauntlet, you get a verified match card with real execution results. <span className="text-slate-500">Coming with the eval API.</span>
          </p>
        </div>

        <Link href="/arena" className="block text-center text-xs text-slate-500 hover:text-slate-300">← back to the arena</Link>
      </div>
    </div>
  );
}
