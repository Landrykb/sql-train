'use client';

/**
 * Squad Battle — one battle's page.
 *
 * Whoever opens the link lands here. If this browser holds a side
 * token for the battle, you are that side: play your run whenever
 * you're ready. If the second seat is empty and you have no token,
 * you get the join form. Everyone else spectates. Each side plays
 * the same fixed duel set on its own time; when both runs are in,
 * the server has already worked out the winner.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Play, Swords, Trophy } from 'lucide-react';
import ArenaBattle from './ArenaBattle';
import SquadShare from './SquadShare';
import { NameField, BrainPicker } from './SquadPickers';
import {
  getBattle, joinBattle, submitSideResult, getStoredSide, battlePath,
  verseName, categoryLabel, tierName,
  type SquadBattle, type SquadSide, type SquadSideResult,
} from '@/lib/arena/squad';
import { VERSE_ACCENT } from '@/lib/arena/theme';
import { setSelectedChampionId } from '@/lib/arena/evolution';
import { track, Events } from '@/lib/analytics';

type LoadState = 'loading' | 'ready' | 'not_found' | 'unavailable';

function SideCard({
  title, name, brainLabel, result, accent, children,
}: {
  title: string; name: string; brainLabel: string; result: SquadSideResult | null; accent: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <p className="font-black text-white mt-0.5">
        {name} <span className="font-bold text-sm" style={{ color: accent }}>+ {brainLabel}</span>
      </p>
      {result ? (
        <div className="mt-2">
          <p className="text-2xl font-black text-white">
            {result.wins}<span className="text-slate-600 mx-1.5">—</span>{result.totalRounds - result.wins}
            <span className="ml-2 text-xs font-bold text-slate-400">
              {result.correct}/{result.totalRounds} correct · avg {(result.avgMs / 1000).toFixed(1)}s
            </span>
          </p>
          <ul className="mt-2 space-y-1">
            {result.rounds.map((r, i) => (
              <li key={i} className="text-[11px] text-slate-400 flex justify-between gap-2">
                <span className="truncate">{r.name} <span className="text-slate-600">({r.byPlayer ? 'you' : 'your agent'})</span></span>
                <span className={r.won ? 'text-emerald-300 font-bold' : 'text-slate-500'}>{r.won ? 'won' : r.correct ? 'right, slower' : 'missed'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-500 mt-2">Has not played yet.</p>
      )}
      {children}
    </div>
  );
}

export default function SquadBattleView({ code }: { code: string }) {
  const [load, setLoad] = useState<LoadState>('loading');
  const [battle, setBattle] = useState<SquadBattle | null>(null);
  const [playing, setPlaying] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [joinName, setJoinName] = useState('');
  const [joinBrain, setJoinBrain] = useState('dash');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');

  const mySide: SquadSide | null = battle ? (getStoredSide(code)?.side ?? null) : null;

  const refresh = useCallback(async () => {
    const res = await getBattle(code);
    if ('error' in res) {
      if (res.error === 'not_found') setLoad('not_found');
      else if (res.error === 'unavailable') setLoad('unavailable');
      else setLoad('not_found'); // unreachable in practice — safest public face
      return;
    }
    setBattle(res.battle);
    setLoad('ready');
  }, [code]);

  useEffect(() => { void refresh(); }, [refresh]);

  const join = async () => {
    if (joinBusy) return;
    if (!joinName.trim()) { setJoinError('Add your name first.'); return; }
    setJoinBusy(true);
    setJoinError('');
    const res = await joinBattle(code, { name: joinName.trim(), brainId: joinBrain });
    setJoinBusy(false);
    if ('error' in res) {
      setJoinError(
        res.error === 'full' ? 'Too late — another squad just took this battle. Find one in Open challenges.'
        : res.error === 'unavailable' ? 'Squad battles are not switched on yet. Try again soon.'
        : 'That did not go through. Check your connection and try again.');
      if (res.error === 'full') void refresh();
      return;
    }
    track(Events.ARENA_SQUAD_JOINED, { verse: res.battle.verse, tier: res.battle.tier });
    setBattle(res.battle);
  };

  const handleComplete = useCallback(async (result: SquadSideResult) => {
    const stored = getStoredSide(code);
    if (!stored) { setSubmitState('error'); return; }
    setSubmitState('sending');
    const res = await submitSideResult(code, stored.token, result);
    if ('error' in res) { setSubmitState('error'); return; }
    track(Events.ARENA_SQUAD_RESULT, { verse: res.battle.verse, tier: res.battle.tier, complete: res.battle.status === 'complete' });
    setBattle(res.battle);
    setSubmitState('sent');
  }, [code]);

  if (load === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 mt-16">
        <Loader2 className="animate-spin text-slate-400" size={28} />
        <p className="text-slate-400 text-sm">Loading your battle…</p>
      </div>
    );
  }

  if (load === 'not_found' || !battle) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800/40 p-6 text-center">
        <p className="font-black text-white text-lg">Battle not found</p>
        <p className="text-xs text-slate-400 mt-2">
          This link does not match a squad battle. Check the link, or start your own and send a fresh challenge.
        </p>
        <Link href="/arena/squad" className="inline-block mt-4 px-5 py-2.5 rounded-xl font-black text-sm bg-slate-800 border border-slate-600 text-slate-100 active:scale-95 transition-transform">
          CREATE A BATTLE
        </Link>
      </div>
    );
  }

  if (load === 'unavailable') {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800/40 p-6 text-center">
        <p className="font-black text-white text-lg">Squad battles are not switched on yet</p>
        <p className="text-xs text-slate-400 mt-2">The arena keeper still has one setup step to run. The solo Arena works as usual.</p>
        <Link href="/arena" className="inline-block mt-4 px-5 py-2.5 rounded-xl font-black text-sm bg-slate-800 border border-slate-600 text-slate-100 active:scale-95 transition-transform">
          BACK TO THE ARENA
        </Link>
      </div>
    );
  }

  const accent = VERSE_ACCENT[battle.verse].hex;
  const onAccent = VERSE_ACCENT[battle.verse].onHex;
  const mine = mySide === 'creator' ? battle.creator : mySide === 'joiner' ? battle.joiner : null;
  const theirs = mySide === 'creator' ? battle.joiner : mySide === 'joiner' ? battle.creator : null;
  const complete = battle.status === 'complete';
  const winnerSide: SquadSide | 'draw' | null = battle.winner;
  const iWon = !!mySide && winnerSide === mySide;

  if (playing && mySide && mine) {
    const opponentName = theirs?.name ?? 'Your challenger';
    const opponentBrain = theirs?.brainLabel ?? 'their agent';
    return (
      <ArenaBattle
        squad={{
          verse: battle.verse,
          domain: battle.domain,
          tier: battle.tier,
          seed: battle.code,
          selfName: mine.name,
          opponentName,
          opponentBrainLabel: opponentBrain,
          battleHref: battlePath(battle.code),
          submitState,
          onComplete: handleComplete,
        }}
      />
    );
  }

  const startRun = () => {
    if (mine && mine.brainId !== 'byok') setSelectedChampionId(mine.brainId);
    setSubmitState('idle');
    setPlaying(true);
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <p className="text-[11px] font-bold tracking-[0.25em] text-slate-500">
          {verseName(battle.verse).toUpperCase()} · {categoryLabel(battle.verse, battle.domain).toUpperCase()} · {tierName(battle.tier).toUpperCase()}
        </p>
        <h2 className="text-2xl font-black text-white mt-1 flex items-center justify-center gap-2">
          <Swords size={22} style={{ color: accent }} /> Squad Battle
        </h2>
        <p className="text-xs text-slate-400 mt-1">Same tasks for both squads. Each side plays on its own time. Best score wins.</p>
      </div>

      {complete && (
        <div className="rounded-2xl border p-4 text-center" style={{ borderColor: accent, background: '#57ECF40d' }}>
          <p className="font-black text-lg text-white flex items-center justify-center gap-2">
            <Trophy size={18} style={{ color: accent }} />
            {winnerSide === 'draw'
              ? 'It is a draw'
              : `${winnerSide === 'creator' ? battle.creator.name : battle.joiner?.name}’s squad wins`}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {mySide ? (winnerSide === 'draw' ? 'Dead even — run it back with a new battle.' : iWon ? 'Your squad took it. Send the link again and defend the title.' : 'Their squad took this one. New battle, new chance.') : 'Both runs are in — this is the final score.'}
          </p>
        </div>
      )}

      <SideCard
        title={mySide === 'creator' ? 'Your squad' : 'Squad one'}
        name={battle.creator.name}
        brainLabel={battle.creator.result?.brainLabel ?? battle.creator.brainLabel}
        result={battle.creator.result}
        accent={accent}
      />
      {battle.joiner ? (
        <SideCard
          title={mySide === 'joiner' ? 'Your squad' : 'Squad two'}
          name={battle.joiner.name}
          brainLabel={battle.joiner.result?.brainLabel ?? battle.joiner.brainLabel}
          result={battle.joiner.result}
          accent={accent}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Squad two</p>
          <p className="text-sm text-slate-400 mt-1">Waiting for a challenger to take this battle.</p>
        </div>
      )}

      {mySide && mine && !complete && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
          {mine.result ? (
            <>
              <p className="text-sm font-bold text-white">Your run is in.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {theirs?.result
                  ? 'Both runs are in — the winner is decided above.'
                  : theirs
                    ? `Now it is ${theirs.name}’s turn. This page updates when their run lands — send them a nudge with the link.`
                    : 'Share the link below — your score waits for a challenger.'}
              </p>
              <button
                onClick={startRun}
                className="mt-3 w-full py-3 rounded-xl font-black text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 transition-transform active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <Play size={15} /> PLAY A NEW RUN
              </button>
              <p className="text-[10px] text-slate-500 mt-2">A new run replaces your score — only until the battle is complete.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-white">Your turn, {mine.name}.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                You and {mine.brainLabel} play the same {tierName(battle.tier)} tasks
                {theirs ? ` ${theirs.name} is playing against.` : ' your challenger will face.'}
                {' '}Your agent fights the first rounds — you fight the last one yourself.
              </p>
              <button
                onClick={startRun}
                className="mt-3 w-full py-3.5 rounded-xl font-black text-sm transition-transform active:scale-95 inline-flex items-center justify-center gap-2"
                style={{ background: accent, color: onAccent }}
              >
                <Play size={16} /> PLAY YOUR RUN
              </button>
            </>
          )}
        </div>
      )}

      {!mySide && !battle.joiner && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
          <div>
            <p className="font-black text-white">Take this battle</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {battle.creator.name} and {battle.creator.brainLabel} have laid down the challenge. Pick your agent and play your run — no account needed.
            </p>
          </div>
          <NameField value={joinName} onChange={setJoinName} label="Your name" />
          <BrainPicker value={joinBrain} onChange={setJoinBrain} />
          {joinError && <p className="text-xs text-red-300">{joinError}</p>}
          <button
            onClick={join}
            disabled={joinBusy}
            className="w-full py-3.5 rounded-xl font-black text-sm transition-transform active:scale-95 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{ background: accent, color: onAccent }}
          >
            {joinBusy ? <><Loader2 className="animate-spin" size={16} /> JOINING…</> : <><Swords size={16} /> JOIN THE BATTLE</>}
          </button>
        </div>
      )}

      {!mySide && battle.joiner && !complete && (
        <p className="text-center text-xs text-slate-500">This battle is under way. When both runs are in, the final score appears here.</p>
      )}

      <SquadShare code={battle.code} creatorName={battle.creator.name} accent={accent} />

      <p className="text-center">
        <Link href="/arena/squad" className="text-[11px] font-bold text-slate-400 hover:text-slate-200 underline underline-offset-2">
          Start your own squad battle
        </Link>
      </p>
    </div>
  );
}
