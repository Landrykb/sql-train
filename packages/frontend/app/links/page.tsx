import Link from 'next/link';
import { Metadata } from 'next';
import { Swords, ArrowRight, Lock } from 'lucide-react';
import BleepxLogo from '@/components/BleepxLogo';
import { BleepxFace } from '@/components/BleepxIcons';
import { VerseIcon } from '@/components/NavIcons';
import { SchoolIcon } from '@/components/AppIcons';

export const metadata: Metadata = {
  title: 'Bleepx — links',
  description: 'Bleepx Academy — free SQL, data science & cloud training in your browser, plus the Bleepx Arena.',
};

const QUICK_LINKS = [
  { href: '/cases', label: 'Start Training', desc: 'SQL challenges across 8 domains', verse: 'query' as const },
  { href: '/arena', label: 'The Arena', desc: 'Coach your champion through real duels', verse: 'query' as const, icon: true },
  { href: '/lab', label: 'BleepxLab', desc: 'Data science projects in Python & R', verse: 'lab' as const },
  { href: '/cloud', label: 'BleepxCloud', desc: 'AWS · Azure · GCP missions & quizzes', verse: 'cloud' as const },
];

const COMING_SOON = [
  { title: 'Bleepx Verified', desc: 'Champion perks — free while in preview.', href: '/verified' },
  { title: 'Recruiter Evals', desc: 'Send a gauntlet, get a verified match card.', href: null },
  { title: 'More projects', desc: 'Automation, trading builds, agent scorecards.', href: null },
];

export default function LinksPage() {
  return (
    <main className="max-w-md mx-auto w-full px-4 py-10 space-y-8 bg-bleepx-bg min-h-screen">
      {/* Brand */}
      <div className="text-center space-y-3">
        <div className="flex justify-center"><BleepxFace size={56} /></div>
        <div>
          <h1 className="text-3xl font-extrabold text-bleepx-text">Bleepx</h1>
          <p className="text-sm text-bleepx-text-secondary mt-1">
            Free SQL, data science &amp; cloud training — runs entirely in your browser. No account needed to start.
          </p>
        </div>
      </div>

      {/* Live product */}
      <Link
        href="/"
        className="group block rounded-2xl bg-gradient-to-br from-bleepx-blue via-indigo-600 to-bleepx-pink p-5 text-white shadow-lg hover:-translate-y-0.5 transition-transform"
      >
        <div className="flex items-center gap-3">
          <BleepxLogo />
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-lg">Bleepx Academy</h2>
            <p className="text-white/80 text-sm">The full training platform — live now, free.</p>
          </div>
          <ArrowRight size={20} className="shrink-0 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Quick links */}
      <div className="space-y-2.5">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center gap-3 rounded-xl bg-bleepx-white border border-bleepx-border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="text-bleepx-text-secondary shrink-0">
              {l.icon ? <Swords size={20} /> : <VerseIcon verse={l.verse} size={20} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-bleepx-text text-sm">{l.label}</span>
              <span className="block text-xs text-bleepx-text-secondary">{l.desc}</span>
            </span>
            <ArrowRight size={16} className="text-bleepx-text-secondary group-hover:text-bleepx-text group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>

      {/* Coming soon */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-bleepx-text-secondary mb-3">Coming soon</h3>
        <div className="space-y-2.5">
          {COMING_SOON.map((c) => {
            const inner = (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-bleepx-border bg-bleepx-white/50 p-4">
                <span className="text-bleepx-text-secondary shrink-0"><Lock size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-bleepx-text text-sm">{c.title}</span>
                  <span className="block text-xs text-bleepx-text-secondary">{c.desc}</span>
                </span>
                {!c.href && <span className="text-[10px] font-bold uppercase tracking-wider text-bleepx-text-secondary shrink-0">Soon</span>}
              </div>
            );
            return c.href ? <Link key={c.title} href={c.href}>{inner}</Link> : <div key={c.title}>{inner}</div>;
          })}
        </div>
        <p className="text-[11px] text-bleepx-text-secondary mt-3 text-center">
          A waitlist opens here when there&apos;s something real to join — nothing is charged before that.
        </p>
      </div>

      {/* Social */}
      <div className="flex justify-center gap-3">
        <a href="https://www.linkedin.com/in/landrykb" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full border border-bleepx-border text-sm font-semibold text-bleepx-text hover:bg-bleepx-white transition-colors">LinkedIn</a>
        <a href="https://github.com/Landrykb" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full border border-bleepx-border text-sm font-semibold text-bleepx-text hover:bg-bleepx-white transition-colors">GitHub</a>
        <Link href="/journey" className="px-4 py-2 rounded-full border border-bleepx-border text-sm font-semibold text-bleepx-text hover:bg-bleepx-white transition-colors inline-flex items-center gap-1.5"><SchoolIcon size={14} /> My Journey</Link>
      </div>
    </main>
  );
}
