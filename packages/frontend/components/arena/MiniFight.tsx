'use client';

/**
 * MiniFight — the gauntlet in miniature. A floating widget that shows the
 * live auto-battle while you use the rest of the app. Pulses when your
 * champion needs a tactical call.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useArenaRunner } from '@/components/arena/ArenaRunner';
import { RIVAL } from '@/lib/arena/champions';
import { isVerified } from '@/lib/arena/verified';

const TEAL = '#57ECF4';

export default function MiniFight() {
  const runner = useArenaRunner();
  const [secs, setSecs] = useState(0);

  const intervention = runner?.state.intervention ?? null;
  useEffect(() => {
    if (!intervention) { setSecs(0); return; }
    const t = setInterval(() => setSecs(Math.max(0, Math.ceil((intervention.deadline - Date.now()) / 1000))), 200);
    return () => clearInterval(t);
  }, [intervention]);

  if (!runner || runner.state.status === 'idle') return null;
  const { state, champion } = runner;
  const running = state.status === 'running';
  const wins = state.results.filter((r) => r.won).length;
  const [showPrefs, setShowPrefs] = useState(false);
  const prefs = runner.prefs;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.9 }}
        className="fixed bottom-4 left-4 z-30 w-56 select-none"
      >
        <div
          className={`rounded-2xl border-2 bg-[#0d1117]/95 backdrop-blur shadow-2xl overflow-hidden ${intervention ? 'arena-urgent' : ''}`}
          style={{ borderColor: intervention ? '#F87171' : running ? '#2B333C' : TEAL }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-800">
            <p className="text-[9px] font-black tracking-widest text-slate-400">
              {running ? `AUTO-GAUNTLET · M${state.fight.matchIdx + 1}${state.endless ? ' ♾️' : `/${state.totalMatches}`}` : 'GAUNTLET DONE'}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowPrefs((v) => !v)} title="champ limits" className={`text-[11px] font-bold leading-none px-1 ${showPrefs ? 'text-amber-300' : 'text-slate-600 hover:text-slate-300'}`}>⚙</button>
              <button onClick={runner.dismiss} className="text-slate-600 hover:text-slate-300 text-[11px] font-bold leading-none px-1">✕</button>
            </div>
          </div>

          {/* tap through to the live fight */}
          <Link href="/arena" className="block hover:bg-white/[0.02] transition-colors">
            {/* mini fighters */}
            <div className="flex items-center gap-2 px-2.5 py-2">
              <div className={`shrink-0 ${running && !intervention ? 'arena-mini-fight' : ''}`}>
                <img src={champion.sprite} alt="" className="w-9 h-9 rounded-full" style={{ boxShadow: `0 0 10px ${champion.color}88` }} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${state.fight.champHp}%`, background: champion.color }} />
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${state.fight.rivalHp}%`, background: RIVAL.color }} />
                </div>
              </div>
              <div className={`shrink-0 ${running && !intervention ? 'arena-mini-fight-r' : ''}`}>
                <img src={RIVAL.sprite} alt={state.rivalName} className="w-9 h-9 rounded-full" style={{ boxShadow: `0 0 10px ${RIVAL.color}66` }} />
              </div>
            </div>

            {/* status line */}
            <p className="px-2.5 pb-1.5 text-[10px] text-slate-400 truncate">{state.fight.lastEvent}</p>
          </Link>

          {/* champ limits */}
          <AnimatePresence>
            {showPrefs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-800 bg-slate-900/60"
              >
                <div className="px-2.5 py-2 space-y-1.5 text-[10px]">
                  <p className="text-[9px] font-black tracking-widest text-slate-500 mb-1">CHAMP LIMITS</p>
                  {([
                    { key: 'notify', label: '🔔 Ping me when I\'m away', on: prefs.notify, set: () => runner.setPrefs({ notify: !prefs.notify }) },
                    { key: 'assist', label: '🧠 Decide solo while I\'m away', on: prefs.assist === 'focused', set: () => runner.setPrefs({ assist: prefs.assist === 'always' ? 'focused' : 'always' }) },
                    { key: 'rematch', label: `♾️ Keep fighting ${isVerified() ? '(auto-rematch)' : '🔒'}`, on: prefs.autoRematch, set: () => {
                      if (!prefs.autoRematch && !isVerified()) { window.location.href = '/verified'; return; }
                      runner.setPrefs({ autoRematch: !prefs.autoRematch });
                    } },
                  ] as const).map((t) => (
                    <button key={t.key} onClick={t.set} className="w-full flex items-center justify-between gap-2 text-left">
                      <span className={t.on ? 'text-slate-200' : 'text-slate-500'}>{t.label}</span>
                      <span className={`shrink-0 w-7 h-4 rounded-full transition-colors relative ${t.on ? 'bg-teal-500' : 'bg-slate-700'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${t.on ? 'left-3.5' : 'left-0.5'}`} />
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* intervention */}
          <AnimatePresence>
            {intervention && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-red-500/40 bg-red-500/10"
              >
                <div className="px-2.5 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black text-red-300 tracking-widest">⚡ YOUR CALL — {secs}s</p>
                    <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-red-400 transition-all duration-200" style={{ width: `${(secs / 12) * 100}%` }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug mb-2">{intervention.prompt}</p>
                  <div className="space-y-1">
                    {intervention.choices.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => runner.answer(c)}
                        className="w-full flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                      >
                        <span className="text-sm leading-none mt-0.5">{c.emoji}</span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-bold text-white leading-tight">{c.label}</span>
                          <span className="block text-[9px] text-slate-500 leading-tight">{c.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* footer */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-slate-800 text-[9px]">
            <span className="text-slate-500">{wins}W · {state.results.length - wins}L · +{state.xpEarned}XP</span>
            {running ? (
              <button onClick={runner.stop} className="text-slate-500 hover:text-red-300 font-bold">STOP</button>
            ) : (
              <Link href="/arena" className="font-black" style={{ color: TEAL }}>REPORT →</Link>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
