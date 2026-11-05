'use client';

/**
 * Squad Battle form pieces, shared by the create form and the join
 * form: the agent (brain) picker and the battle-terms picker.
 * Styling follows the Arena select screen (slate panels, verse accent).
 */

import React, { useEffect, useState } from 'react';
import { Bot, KeyRound } from 'lucide-react';
import {
  SQUAD_VERSES, SQUAD_TIERS,
  brainOptions, type BrainOption, type SquadVerse, type SquadTier,
} from '@/lib/arena/squad';
import { VERSE_ACCENT } from '@/lib/arena/theme';

export function NameField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 24))}
        placeholder="e.g. Maya"
        autoComplete="off"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 px-3 py-2.5 outline-none focus:border-slate-500"
      />
    </div>
  );
}

export function BrainPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [options, setOptions] = useState<BrainOption[]>([]);
  useEffect(() => { setOptions(brainOptions()); }, []);
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your agent</p>
      <div className="space-y-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
              value === o.id ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70 hover:opacity-100'
            }`}
            style={{ borderColor: value === o.id ? '#57ECF4' : '#2B333C' }}
          >
            {o.id === 'byok' ? <KeyRound size={18} className="text-emerald-300 shrink-0" /> : <Bot size={18} className="text-slate-300 shrink-0" />}
            <span className="min-w-0">
              <span className="block font-bold text-white text-sm truncate">{o.label}</span>
              <span className="block text-[11px] text-slate-400 truncate">{o.hint}</span>
            </span>
            {value === o.id && <span className="ml-auto text-teal-300 font-black">✓</span>}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-2">
        House champions fight with their own style. Connect your own model on the Arena screen and it appears here too.
      </p>
    </div>
  );
}

export function TermsPicker({
  verse, domain, tier, onChange,
}: {
  verse: SquadVerse; domain: string; tier: SquadTier;
  onChange: (v: { verse: SquadVerse; domain: string; tier: SquadTier }) => void;
}) {
  const accent = VERSE_ACCENT[verse].hex;
  const verseDef = SQUAD_VERSES.find((v) => v.id === verse)!;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Choose the arena</p>
        <div className="grid grid-cols-3 gap-2">
          {SQUAD_VERSES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange({ verse: v.id, domain: v.defaultCategory, tier })}
              className={`p-2.5 rounded-xl border-2 text-center transition-all active:scale-95 ${verse === v.id ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70'}`}
              style={{ borderColor: verse === v.id ? VERSE_ACCENT[v.id].hex : '#2B333C' }}
            >
              <span className="text-[11px] font-bold text-white leading-tight">{v.name}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {verseDef.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ verse, domain: c.id, tier })}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${domain === c.id ? '' : 'text-slate-400'}`}
              style={{
                background: domain === c.id ? accent : 'transparent',
                borderColor: domain === c.id ? accent : '#334155',
                color: domain === c.id ? VERSE_ACCENT[verse].onHex : undefined,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Difficulty</p>
        <div className="grid grid-cols-3 gap-2">
          {SQUAD_TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ verse, domain, tier: t.id })}
              className={`p-2.5 rounded-xl border-2 text-center transition-all active:scale-95 ${tier === t.id ? 'bg-slate-800' : 'bg-slate-800/30 opacity-70'}`}
              style={{ borderColor: tier === t.id ? accent : '#2B333C' }}
            >
              <span className="text-[11px] font-bold text-white leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Both squads play these exact tasks. Best score wins.</p>
      </div>
    </div>
  );
}
