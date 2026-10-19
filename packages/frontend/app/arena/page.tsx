import { Metadata } from 'next';
import Link from 'next/link';
import ArenaBattle from '@/components/arena/ArenaBattle';
import BleepxLogo from '@/components/BleepxLogo';

export const metadata: Metadata = {
  title: 'Bleepx Arena — coach your champion',
  description: 'Pick a champion, set its strategy, and watch it fight the house bot through real data challenges. Or tag in and fight a round yourself.',
};

export default function ArenaPage() {
  return (
    <div className="min-h-screen" style={{ background: '#1C2129' }}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <BleepxLogo />
        <Link href="/" className="text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors">
          ← back to training
        </Link>
      </header>
      <ArenaBattle />
    </div>
  );
}
