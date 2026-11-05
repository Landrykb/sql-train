import { Metadata } from 'next';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import SquadHub from '@/components/arena/SquadHub';
import { Events } from '@/lib/analytics';
import TrackView from '@/components/TrackView';

export const metadata: Metadata = {
  title: 'Squad Battle — team up with your agent | Bleepx Arena',
  description: 'Team up with your agent. Fight another team. You and your AI against another person and theirs — same tasks, best score wins.',
};

export default function SquadBattlePage() {
  return (
    <div className="min-h-screen" style={{ background: '#1C2129' }}>
      <TrackView event={Events.ARENA_VIEWED} />
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <BleepxLogo />
        <Link href="/arena" className="text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors">
          ← back to the Arena
        </Link>
      </header>
      <main className="flex flex-col items-center px-4 py-10">
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-4xl font-black tracking-tight text-white">
            SQUAD <span className="text-teal-300">BATTLE</span>
          </h1>
          <p className="text-sm mt-3 text-slate-300 font-bold">Team up with your agent. Fight another team.</p>
          <p className="text-sm mt-1 text-slate-400">
            You and your AI against another person and theirs — same tasks, best score wins.
            Create a battle, send the link, play whenever each of you has time.
          </p>
        </div>
        <SquadHub />
      </main>
    </div>
  );
}
