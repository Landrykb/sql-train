import Link from 'next/link';
import { VERSE_ACCENT, ARENA_BG } from '@/lib/arena/theme';

// The one dominant call on every verse landing — Hick's law: a single
// glowing action the eye lands on first. Verse-aware: the accent and the
// target arena match the page the user is standing on.
const COPY = {
  sql: { name: 'SQL Arena', blurb: 'Real queries, live execution. Fastest correct result wins.' },
  lab: { name: 'Lab Arena', blurb: 'Quiz duels + real Python code duels in Pyodide.' },
  cloud: { name: 'Cloud Arena', blurb: 'Quiz duels + real build missions in the AWS sandbox.' },
} as const;

export default function ArenaCTA({ verse }: { verse: 'sql' | 'lab' | 'cloud' }) {
  const accent = VERSE_ACCENT[verse];
  const copy = COPY[verse];
  return (
    <Link
      href={`/arena?verse=${verse}`}
      className="group relative block overflow-hidden rounded-2xl border-2 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
      style={{ borderColor: `${accent.hex}66`, background: `linear-gradient(135deg, ${ARENA_BG} 0%, #1C2129 100%)`, boxShadow: `0 0 40px -18px ${accent.hex}` }}
    >
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ background: `radial-gradient(circle at 85% 20%, ${accent.hex}, transparent 60%)` }} />
      <div className="relative flex items-center gap-4">
        <div className="text-4xl sm:text-5xl" aria-hidden>⚔️</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent.hex }}>The Arena</p>
          <h3 className="text-lg sm:text-2xl font-black text-white leading-tight mt-0.5">
            Enter the {copy.name}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Your champion fights. You call the shots. {copy.blurb}
          </p>
        </div>
        <div
          className="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-sm sm:text-base transition-transform group-hover:scale-105"
          style={{ background: accent.hex, color: accent.onHex }}
        >
          FIGHT →
        </div>
      </div>
    </Link>
  );
}
