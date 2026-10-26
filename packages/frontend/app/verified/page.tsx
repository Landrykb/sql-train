'use client';

import { useState } from 'react';
import Link from 'next/link';
import { VERIFIED_PERKS, isVerified, setVerified } from '@/lib/arena/verified';

const BG = '#1C2129';
const GOLD = '#FBBF24';

export default function VerifiedPage() {
  const [verified, setV] = useState(false);
  useState(() => { if (typeof window !== 'undefined') setV(isVerified()); });

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ background: BG }}>
      <div className="w-full max-w-md">
        <p className="text-center text-[10px] font-black tracking-[0.3em] text-slate-500 mb-1">BLEEPX</p>
        <h1 className="text-center text-3xl font-black mb-1" style={{ color: GOLD }}>VERIFIED</h1>
        <p className="text-center text-sm text-slate-400 mb-8">
          Your champion never stops. Neither should your rank.
        </p>

        <div className="rounded-3xl border-2 p-6 mb-6" style={{ borderColor: GOLD, background: 'rgba(251,191,36,0.04)', boxShadow: `0 0 40px ${GOLD}22` }}>
          <ul className="space-y-3 mb-6">
            {VERIFIED_PERKS.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-slate-200">
                <span style={{ color: GOLD }}>◆</span>{p}
              </li>
            ))}
          </ul>
          <div className="text-center mb-4">
            <span className="text-4xl font-black text-white">$9</span>
            <span className="text-slate-400 text-sm">/mo</span>
          </div>
          {verified ? (
            <p className="text-center font-bold" style={{ color: GOLD }}>◆ You're Verified — your champ fights forever.</p>
          ) : (
            <button
              onClick={() => {
                // Checkout wiring is next (Stripe) — for now this marks the intent.
                setVerified(true); setV(true);
              }}
              className="w-full py-4 rounded-2xl font-black text-lg text-[#0d1117] transition-transform active:scale-95"
              style={{ background: GOLD }}
            >
              GO VERIFIED
            </button>
          )}
          <p className="text-center text-[10px] text-slate-500 mt-3">
            Free tier stays free forever — every verse, every duel, your full champion.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 mb-6">
          <p className="text-xs font-bold text-slate-300 mb-1">🎯 For recruiters</p>
          <p className="text-[11px] text-slate-400">
            Send a candidate an eval link — they fight a gauntlet, you get a verified match card with real execution results. <span className="text-slate-500">Coming with the eval API.</span>
          </p>
        </div>

        <Link href="/arena" className="block text-center text-xs text-slate-500 hover:text-slate-300">← back to the arena</Link>
      </div>
    </div>
  );
}
