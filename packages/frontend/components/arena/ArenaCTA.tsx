import Link from 'next/link';
import { Swords } from 'lucide-react';

// One dominant call on every verse landing. Styled like the verse's other
// section banners (gradient + soft border), accent matched to the verse so
// it reads as part of the same product — no neon glow.
const COPY = {
  sql: {
    name: 'SQL Arena',
    blurb: 'Real queries, live execution. Fastest correct result wins.',
    card: 'from-indigo-900 via-violet-900 to-purple-900 border-violet-500/30 hover:shadow-violet-500/20',
    hoverText: 'group-hover:text-violet-300',
    icon: 'text-violet-300',
    button: 'bg-violet-500 hover:bg-violet-400',
  },
  lab: {
    name: 'Lab Arena',
    blurb: 'Quiz duels + real Python code duels in Pyodide.',
    card: 'from-emerald-900 via-teal-900 to-cyan-900 border-teal-500/30 hover:shadow-teal-500/20',
    hoverText: 'group-hover:text-teal-300',
    icon: 'text-teal-300',
    button: 'bg-teal-500 hover:bg-teal-400',
  },
  cloud: {
    name: 'Cloud Arena',
    blurb: 'Quiz duels + real build missions in the AWS sandbox.',
    card: 'from-sky-900 via-blue-900 to-indigo-900 border-sky-500/30 hover:shadow-sky-500/20',
    hoverText: 'group-hover:text-sky-300',
    icon: 'text-sky-300',
    button: 'bg-sky-500 hover:bg-sky-400',
  },
} as const;

export default function ArenaCTA({ verse }: { verse: 'sql' | 'lab' | 'cloud' }) {
  const copy = COPY[verse];
  return (
    <Link
      href={`/arena?verse=${verse}`}
      className={`group block bg-gradient-to-br ${copy.card} border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}
    >
      <div className="p-5 flex items-center gap-4">
        <div className={`${copy.icon} flex-shrink-0`}><Swords size={32} /></div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-extrabold text-white text-lg ${copy.hoverText} transition-colors break-words min-w-0`}>
            Enter the {copy.name}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">Your champion fights. You call the shots. {copy.blurb}</p>
        </div>
        <span className={`shrink-0 px-4 sm:px-6 py-2.5 rounded-full ${copy.button} text-white font-bold text-sm transition-colors inline-flex items-center gap-1.5`}>
          <Swords size={14} /> FIGHT
        </span>
      </div>
    </Link>
  );
}
