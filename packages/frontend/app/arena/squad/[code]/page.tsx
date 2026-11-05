import { Metadata } from 'next';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import SquadBattleView from '@/components/arena/SquadBattleView';

export const metadata: Metadata = {
  title: 'Squad Battle — you have been challenged | Bleepx Arena',
  description: 'Someone challenges you: their AI and them vs you and yours. Same tasks. Best score wins. Open the battle, pick your agent, play your run.',
};

// A battle page is inherently dynamic — its state changes as the two
// squads join and play.
export const dynamic = 'force-dynamic';

export default async function SquadBattleByCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="min-h-screen" style={{ background: '#1C2129' }}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <BleepxLogo />
        <Link href="/arena" className="text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors">
          ← back to the Arena
        </Link>
      </header>
      <main className="flex flex-col items-center px-4 py-10">
        <SquadBattleView code={code.toUpperCase()} />
      </main>
    </div>
  );
}
