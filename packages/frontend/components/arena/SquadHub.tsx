'use client';

/**
 * Squad Battle hub — create a battle, share the link, and browse
 * Open challenges (public battles waiting for a second squad).
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Swords, Users } from 'lucide-react';
import {
  createBattle, getOpenChallenges, battlePath,
  verseName, categoryLabel, tierName,
  type OpenChallenge, type SquadBattle, type SquadTier, type SquadVerse,
} from '@/lib/arena/squad';
import { VERSE_ACCENT } from '@/lib/arena/theme';
import { NameField, BrainPicker, TermsPicker } from './SquadPickers';
import SquadShare from './SquadShare';
import { track, Events } from '@/lib/analytics';

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function SquadHub() {
  const [name, setName] = useState('');
  const [brainId, setBrainId] = useState('dash');
  const [terms, setTerms] = useState<{ verse: SquadVerse; domain: string; tier: SquadTier }>({
    verse: 'sql', domain: 'business', tier: 'rookie',
  });
  const [listed, setListed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<SquadBattle | null>(null);
  const [open, setOpen] = useState<OpenChallenge[] | null>(null);

  const accent = VERSE_ACCENT[terms.verse].hex;

  const loadOpen = useCallback(async () => {
    setOpen(await getOpenChallenges());
  }, []);

  useEffect(() => { void loadOpen(); }, [loadOpen]);

  const create = async () => {
    if (busy) return;
    if (!name.trim()) { setError('Add your name first — your rival should know who beat them.'); return; }
    setBusy(true);
    setError('');
    const res = await createBattle({
      name: name.trim(), brainId, verse: terms.verse, domain: terms.domain, tier: terms.tier, listed,
    });
    setBusy(false);
    if ('error' in res) {
      setError(res.error === 'unavailable'
        ? 'Squad battles are not switched on yet — the arena keeper still has to run one setup step. Solo Arena works as usual.'
        : 'That did not go through. Check your connection and try again.');
      return;
    }
    track(Events.ARENA_SQUAD_CREATED, { verse: terms.verse, tier: terms.tier, listed });
    setCreated(res.battle);
    void loadOpen();
  };

  if (created) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 text-center">
          <p className="text-lg font-black text-white">Battle created</p>
          <p className="text-xs text-slate-400 mt-1">
            {created.creator.name} + {created.creator.brainLabel} vs the first squad brave enough to open the link.
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {verseName(created.verse)} · {categoryLabel(created.verse, created.domain)} · {tierName(created.tier)}
            {created.listed ? ' · posted in Open challenges' : ''}
          </p>
        </div>
        <SquadShare code={created.code} creatorName={created.creator.name} accent={accent} />
        <Link
          href={battlePath(created.code)}
          className="block w-full py-3.5 rounded-2xl font-black text-center transition-transform active:scale-95"
          style={{ background: accent, color: VERSE_ACCENT[terms.verse].onHex }}
        >
          GO TO YOUR BATTLE
        </Link>
        <button
          onClick={() => { setCreated(null); setName(''); }}
          className="w-full py-2.5 rounded-2xl font-bold text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Create another battle
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
        <NameField value={name} onChange={setName} label="Your name" />
        <BrainPicker value={brainId} onChange={setBrainId} />
        <TermsPicker verse={terms.verse} domain={terms.domain} tier={terms.tier} onChange={setTerms} />
        <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={listed}
            onChange={(e) => setListed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-teal-300"
          />
          <span>
            <span className="block text-sm font-bold text-white">Post publicly</span>
            <span className="block text-[11px] text-slate-400">
              Show this battle in Open challenges below, so anyone can take you on — not just people with your link.
            </span>
          </span>
        </label>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <button
          onClick={create}
          disabled={busy}
          className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-transform active:scale-95 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          style={{ background: accent, color: VERSE_ACCENT[terms.verse].onHex }}
        >
          {busy ? <><Loader2 className="animate-spin" size={18} /> CREATING…</> : <><Swords size={18} /> CREATE BATTLE</>}
        </button>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Users size={13} /> Open challenges
        </p>
        {open === null ? (
          <p className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="animate-spin" size={13} /> Looking for waiting battles…</p>
        ) : open.length === 0 ? (
          <p className="text-xs text-slate-500 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            No open challenges right now. Post yours publicly and it will wait here until someone takes it.
          </p>
        ) : (
          <div className="space-y-2">
            {open.map((c) => (
              <div key={c.code} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {c.creatorName} <span className="font-normal text-slate-400">+ {c.creatorBrainLabel}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {verseName(c.verse)} · {categoryLabel(c.verse, c.domain)} · {tierName(c.tier)} · {timeAgo(c.createdAt)}
                  </p>
                </div>
                <Link
                  href={battlePath(c.code)}
                  className="shrink-0 px-4 py-2 rounded-xl font-black text-xs transition-transform active:scale-95"
                  style={{ background: VERSE_ACCENT[c.verse].hex, color: VERSE_ACCENT[c.verse].onHex }}
                >
                  JOIN
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
