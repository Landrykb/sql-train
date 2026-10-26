import { Suspense } from 'react';
import MatchCardView from '@/components/arena/MatchCardView';

export const metadata = {
  title: 'Match Card · Bleepx Arena',
  description: 'A champion walked out of the arena with this result. Think yours beats it?',
};

export default function ArenaCardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0E14' }}>
        <div className="w-10 h-10 rounded-full border-4 border-slate-700 animate-spin" style={{ borderTopColor: '#57ECF4' }} />
      </div>
    }>
      <MatchCardView />
    </Suspense>
  );
}
