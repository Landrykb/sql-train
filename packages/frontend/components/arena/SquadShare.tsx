'use client';

/**
 * Squad Battle share panel — dead-easy link sharing.
 * Big one-tap Copy link (with a copied confirmation), a Share button
 * using the Web Share API where the browser offers it (mobile share
 * sheet), and direct shortcuts for Telegram, WhatsApp and X.
 * No account needed on either side; two taps from battle creation.
 */

import React, { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { battlePath, battleUrl, squadShareText } from '@/lib/arena/squad';

function TelegramGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.9 4.6c.2-1-.6-1.7-1.5-1.3L2.7 9.6c-1 .4-1 1.9.1 2.2l4.4 1.4 1.7 5.3c.3.9 1.4 1.1 2 .4l2.4-2.3 4.7 3.5c.8.6 2 .1 2.2-.8l1.7-14.7ZM8.4 12.7l9.5-6c.2-.1.4.2.2.4l-8 7.2-.3 3.4-1.4-4.9Z" />
    </svg>
  );
}

function WhatsAppGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1.9 2 1.2 2.3 1.3.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2.1 1c.3.2.5.3.6.4 0 .1 0 .7-.2 1.2Z" />
    </svg>
  );
}

function XGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.7 3H21l-7.3 8.3L22.2 21h-6.7l-5.2-6.3L4.4 21H1l7.8-8.9L1.8 3h6.9l4.7 5.7L17.7 3Zm-1.2 16h1.9L7 4.9H5L16.5 19Z" />
    </svg>
  );
}

export default function SquadShare({ code, creatorName, accent }: { code: string; creatorName?: string; accent: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [url, setUrl] = useState(battlePath(code));
  const text = squadShareText(creatorName);

  React.useEffect(() => {
    setUrl(battleUrl(code));
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — the link is visible to copy by hand */ }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Bleepx Arena — Squad Battle', text, url });
    } catch { /* user closed the share sheet */ }
  };

  const shortcuts = [
    { name: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, glyph: <TelegramGlyph />, color: '#229ED9' },
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, glyph: <WhatsAppGlyph />, color: '#25D366' },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, glyph: <XGlyph />, color: '#E7E9EA' },
  ];

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Send this link to your rival</p>
      <p className="text-[11px] text-slate-500 mb-3">
        They open it, pick their agent, and play their run — no account, no waiting for you to be online.
      </p>
      <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 mb-3">
        <span className="flex-1 min-w-0 truncate text-xs text-slate-300 font-mono">{url}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex-1 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 inline-flex items-center justify-center gap-2"
          style={{ background: accent, color: '#1A0B2E' }}
        >
          {copied ? <><Check size={16} /> LINK COPIED</> : <><Copy size={16} /> COPY LINK</>}
        </button>
        {canShare && (
          <button
            onClick={share}
            className="px-4 py-3 rounded-xl font-black text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition-transform active:scale-95 inline-flex items-center gap-2"
          >
            <Share2 size={16} /> SHARE
          </button>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        {shortcuts.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener"
            className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800/70 hover:bg-slate-700 border border-slate-700 transition-transform active:scale-95 inline-flex items-center justify-center gap-1.5"
            style={{ color: s.color }}
          >
            {s.glyph} {s.name}
          </a>
        ))}
      </div>
    </div>
  );
}
