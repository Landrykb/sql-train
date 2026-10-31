import Link from 'next/link';
import { Metadata } from 'next';
import { Swords, ArrowRight, Lock, Compass, Send } from 'lucide-react';

// Brand glyph — lucide dropped brand icons; this is the IG camera mark.
const InstagramIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
import BleepxLogo from '@/components/BleepxLogo';
import { BleepxFace } from '@/components/BleepxIcons';
import { VerseIcon } from '@/components/NavIcons';

export const metadata: Metadata = {
  title: 'Bleepx — links',
  description: 'Bleepx Academy — free SQL, data science & cloud training in your browser, plus the Bleepx Arena.',
  openGraph: {
    title: 'Bleepx — free SQL, data science & cloud training',
    description: 'Train in your browser, no account needed to start. Coach a champion in the Bleepx Arena.',
    siteName: 'Bleepx',
    type: 'website',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512, alt: 'Bleepx' }],
  },
  twitter: {
    card: 'summary',
    title: 'Bleepx — free SQL, data science & cloud training',
    description: 'Train in your browser, no account needed to start.',
    images: ['/icons/icon-512x512.png'],
  },
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
            Tutorials make you watch. Bleepx makes you fight. Free SQL, data science &amp; cloud training in your browser — plus an Arena where you bring your own AI to duel. No account needed to start, free forever.
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
            <p className="text-white/80 text-sm">The full training platform — live now. Free forever, no card. Leave writing real SQL, not quiz answers.</p>
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
        <Link
          href="/journey"
          className="group flex items-center gap-3 rounded-xl bg-bleepx-white border border-bleepx-border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <span className="text-bleepx-text-secondary shrink-0"><Compass size={20} /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-bleepx-text text-sm">Your Roadmap</span>
            <span className="block text-xs text-bleepx-text-secondary">A clear path from zero to job-ready — week by week</span>
          </span>
          <ArrowRight size={16} className="text-bleepx-text-secondary group-hover:text-bleepx-text group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
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

      {/* Social — one full-width branded button per platform; more slots go here (YouTube, TikTok, X) */}
      <div className="space-y-2.5">
        <a
          href="https://www.instagram.com/bleepx.builds"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-bold text-white text-sm transition-transform active:scale-95"
          style={{ background: 'linear-gradient(90deg, #833AB4, #E1306C 55%, #F77737)' }}
        >
          <InstagramIcon size={18} /> Instagram — @bleepx.builds
        </a>
        <a
          href="https://t.me/bleepxbuilds"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-bold text-white text-sm transition-transform active:scale-95"
          style={{ background: '#229ED9' }}
        >
          <Send size={18} /> Telegram — @bleepxbuilds
        </a>
      </div>
    </main>
  );
}
