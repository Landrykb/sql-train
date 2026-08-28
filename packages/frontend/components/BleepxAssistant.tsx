'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProgress } from '@/lib/useProgress';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { playBleep } from '@/lib/audio';
import { lintInput, BleepxHint } from '@/lib/bleepxLinter';
import * as voice from '@/lib/bleepxVoice';
import {
  BleepxFace,
  BleepxHead,
  BleepxGhost,
  BleepxWave,
  BleepxThink,
  BleepxCode,
  BleepxLock,
  BleepxTrophy,
  BleepxSpark,
  BleepxSignal,
  BleepxEye,
  BleepxGit,
  BleepxGitHub,
} from '@/components/BleepxIcons';


type AssistantContext = 'home' | 'sql' | 'lab' | 'cloud' | 'journey' | 'general';

type Mood = 'idle' | 'wave' | 'think' | 'code' | 'chat' | 'error' | 'success' | 'signal' | 'flying' | 'watch' | 'spark' | 'git' | 'github' | 'face' | 'stealth';
type Mode = 'light' | 'dark' | 'stealth' | 'mix' | 'neon' | 'ghost' | 'solar' | 'green' | 'red';
const MODES: Record<Mode, { label: string; dark: boolean; mood: Mood; filter: string; badge: string; sphere: { brace: string; glow: string } }> = {
  light: { label: 'LIGHT MODE', dark: false, mood: 'wave', filter: '', badge: 'bg-sky-100 text-sky-700 border-sky-300', sphere: { brace: '#22d3ee', glow: 'rgba(34,211,238,0.8)' } },
  dark: { label: 'DARK MODE', dark: true, mood: 'code', filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.5))', badge: 'bg-cyan-950 text-cyan-300 border-cyan-600', sphere: { brace: '#22d3ee', glow: 'rgba(34,211,238,0.8)' } },
  stealth: { label: 'STEALTH MODE', dark: true, mood: 'stealth', filter: 'grayscale(0.5) brightness(0.7) drop-shadow(0 0 6px rgba(34,211,238,0.25))', badge: 'bg-gray-800 text-gray-300 border-gray-600', sphere: { brace: '#9ca3af', glow: 'rgba(156,163,175,0.5)' } },
  mix: { label: 'MIX MODE', dark: true, mood: 'chat', filter: 'contrast(1.1) drop-shadow(0 0 10px rgba(232,121,249,0.8))', badge: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-600', sphere: { brace: '#e879f9', glow: 'rgba(232,121,249,0.8)' } },
  neon: { label: 'NEON MODE', dark: true, mood: 'wave', filter: 'saturate(1.6) brightness(1.2) contrast(1.1) drop-shadow(0 0 16px rgba(6,182,212,0.9))', badge: 'bg-cyan-950 text-cyan-300 border-cyan-500', sphere: { brace: '#22d3ee', glow: 'rgba(6,182,212,0.9)' } },
  ghost: { label: 'GHOST MODE', dark: false, mood: 'wave', filter: 'brightness(1.3) opacity(0.55) drop-shadow(0 0 8px rgba(255,255,255,0.4))', badge: 'bg-slate-100 text-slate-500 border-slate-300', sphere: { brace: '#f8fafc', glow: 'rgba(255,255,255,0.5)' } },
  solar: { label: 'SOLAR MODE', dark: false, mood: 'success', filter: 'hue-rotate(-120deg) saturate(1.5) brightness(1.2) contrast(1.1) drop-shadow(0 0 14px rgba(250,204,21,0.8))', badge: 'bg-yellow-100 text-yellow-700 border-yellow-400', sphere: { brace: '#facc15', glow: 'rgba(250,204,21,0.8)' } },
  green: { label: 'GREEN MODE', dark: false, mood: 'success', filter: 'hue-rotate(-60deg) saturate(1.5) contrast(1.1) drop-shadow(0 0 14px rgba(74,222,128,0.8))', badge: 'bg-green-100 text-green-700 border-green-400', sphere: { brace: '#4ade80', glow: 'rgba(74,222,128,0.8)' } },
  red: { label: 'RED MODE', dark: true, mood: 'error', filter: 'hue-rotate(180deg) saturate(1.4) contrast(1.1) drop-shadow(0 0 14px rgba(248,113,113,0.8))', badge: 'bg-red-950 text-red-300 border-red-600', sphere: { brace: '#f87171', glow: 'rgba(248,113,113,0.8)' } },
};

const DEFAULT_HINTS: Record<string, { text: string; cta: string; href: string }> = {
  '/': { text: 'Start with SQL basics, then Python, then pick a cloud or ML goal.', cta: 'Start My Journey', href: '/journey' },
  '/cases': { text: 'Each case teaches one SQL skill. Finish the business basics before the hidden cases.', cta: 'Open Business Case', href: '/cases/business' },
  '/lab': { text: 'BleepxLab turns SQL skills into Python and data science. Try churn or carbon credits.', cta: 'Try Churn Lab', href: '/lab/churn/churn_explore' },
  '/cloud': { text: 'Cloud is hands-on. Start with the BleepxBank sandbox scenario.', cta: 'Open Sandbox', href: '/cloud/sandbox' },
  '/cloud/sandbox': { text: 'Mission: block the public S3 bucket, then create a Lambda and a DynamoDB table.', cta: 'Run Security Scan', href: '/cloud/sandbox' },
  '/cloud/pipelines': { text: 'Pick a project preset, run SQL, transform with Python, then upload to S3.', cta: 'Choose a preset', href: '/cloud/pipelines' },
  '/cloud/certifications': { text: 'Check off each SAA-C03 domain step as you complete it in the sandbox.', cta: 'Back to Sandbox', href: '/cloud/sandbox' },
  '/journey': { text: 'Pick your goals and time. Bleepx will build the path and remember it.', cta: 'Generate Plan', href: '#' },
};

const findJourneyGoal = (): string | null => {
  try {
    const raw = localStorage.getItem('bleepx-journey');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.plan?.suggested?.length) return parsed.plan.suggested[0];
  } catch { /* ignore */ }
  return null;
};

type ChatRole = 'user' | 'assistant';
interface ChatMessage { role: ChatRole; text: string; }

const QUICK_REPLIES = ['What is S3?', 'SQL JOIN help', 'EC2 vs Lambda', 'Cost-optimized storage'];

const TOPIC_HINTS: Record<string, string> = {
  'what is s3?': 'S3 is object storage. Use it for static files, data lakes, backups, and content distribution via CloudFront.',
  'sql join help': 'SQL joins combine rows. INNER JOIN keeps matches, LEFT keeps all from the left, FULL keeps all rows, and CROSS gives the Cartesian product.',
  'ec2 vs lambda': 'EC2 gives full control and long-running compute; Lambda is serverless, event-driven, and billed per request.',
  'cost-optimized storage': 'For archives use S3 Glacier or Glacier Deep Archive. For logs, transition to Infrequent Access after a few days.',
};

const NAG_MESSAGES = [
  'Still here. Still watching.',
  'I noticed you stopped typing. Everything okay?',
  'Bored? Ask me something fun.',
  'I have SO many SQL tips and no one to share them with.',
  'Tap me. You know you want to.',
  'I am not going anywhere.',
];
const randomNag = () => NAG_MESSAGES[Math.floor(Math.random() * NAG_MESSAGES.length)];

export default function BleepxAssistant({ context }: { context?: AssistantContext }) {
  const pathname = usePathname();
  const { completed, points } = useProgress();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [dock, setDock] = useState<{ right: number; bottom: number }>({ right: 16, bottom: 16 });
  const [dockedHint, setDockedHint] = useState<BleepxHint | null>(null);
  const [dragging, setDragging] = useState(false);
  const lintTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHintText = useRef<string | null>(null);
  const flyingTimer = useRef<NodeJS.Timeout | null>(null);
  const prevDock = useRef({ right: 16, bottom: 16 });
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const targetDock = useRef({ right: 16, bottom: 16 });
  const lastAutoSwitch = useRef(0);
  const didAutoAsk = useRef(false);
  const rafId = useRef<number | null>(null);
  const downAt = useRef(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [manualMode, setManualMode] = useState<'auto' | Mode>('auto');
  const [teaser, setTeaser] = useState<{ text: string; command: string } | null>(null);
  const [teaserHover, setTeaserHover] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [nickName, setNickName] = useState<string | null>(() => { try { return localStorage.getItem('bleepx_nickname'); } catch { return null; } });
  const [awaitingNickname, setAwaitingNickname] = useState(false);
  const [showModeChips, setShowModeChips] = useState(false);
  const displayName = nickName ?? (signedIn ? 'friend' : 'human');

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    const update = (session: any) => {
      const user = session?.user as any;
      setSignedIn(!!user);
      const meta = user?.user_metadata ?? {};
      const fullName = (meta.full_name as string | undefined) || (meta.name as string | undefined) || (user?.email?.split('@')[0] ?? null);
      setUserName(fullName ?? null);
    };
    const sync = async () => {
      const { data } = await sb.auth.getSession();
      update(data?.session ?? null);
    };
    sync();
    const { data } = sb.auth.onAuthStateChange((_event: any, session: any) => update(session));
    return () => data?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (signedIn && !nickName && !open && !didAutoAsk.current) {
      didAutoAsk.current = true;
      setOpen(true);
      setMood('wave');
      playBleep();
      startChat();
    }
  }, [signedIn, nickName, open]);

  const activeMode = useMemo(() => {
    if (manualMode !== 'auto') return manualMode;
    if (mood === 'stealth') return 'stealth';
    return isDark ? 'dark' : 'light';
  }, [manualMode, mood, isDark]);
  const activeModeRef = useRef(activeMode);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  const hint = useMemo(() => {
    const exact = DEFAULT_HINTS[pathname];
    if (exact) return exact;
    if (pathname?.startsWith('/cases/')) return { text: 'Read the case, run a query, and hit the Bleepx hint if you are stuck.', cta: 'Back to Cases', href: '/cases' };
    if (pathname?.startsWith('/lab/')) return { text: 'Load the dataset, run each section, then complete the solution code. Need help? Ask Bleepx.', cta: 'Back to Labs', href: '/lab' };
    if (pathname?.startsWith('/cloud/')) return { text: 'Cloud questions are scenario-based. Think security, resilience, performance, cost.', cta: 'Open Sandbox', href: '/cloud/sandbox' };
    return { text: 'Bleepx is here to guide you from SQL to Cloud. Pick your path in the Journey page.', cta: 'My Journey', href: '/journey' };
  }, [pathname]);

  useEffect(() => {
    if (pathname?.startsWith('/lab/')) setMood('code');
    else setMood('idle');
  }, [pathname]);

  useEffect(() => {
    const updateDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    updateDark();
    const observer = new MutationObserver(updateDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open || activeModeRef.current === 'stealth') return;
    const initial = setTimeout(() => {
      const t = { text: randomNag(), command: '' };
      setTeaser(t);
      playBleep();
      setTimeout(() => setTeaser((prev) => (prev === t ? null : prev)), 8000);
    }, 8000);
    return () => clearTimeout(initial);
  }, [open]);

  useEffect(() => {
    if (open || activeModeRef.current === 'stealth') return;
    const id = setInterval(() => {
      const t = { text: randomNag(), command: '' };
      setTeaser(t);
      playBleep();
      setTimeout(() => setTeaser((prev) => (prev === t ? null : prev)), 8000);
    }, 45000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (open || dockedHint || dragging || manualMode !== 'auto') return;
    const id = setTimeout(() => setMood('stealth'), 8000);
    return () => clearTimeout(id);
  }, [open, dockedHint, dragging, manualMode]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, open]);

  const goal = findJourneyGoal();
  const completedCount = completed.size;

  const startChat = () => {
    const needsName = signedIn && !nickName;
    const onboarded = (() => { try { return !!localStorage.getItem('bleepx_modes_onboarded'); } catch { return false; } })();
    const msgs: ChatMessage[] = [
      { role: 'assistant', text: needsName ? voice.nameAsk() : voice.greeting(displayName, goal, hint.text) },
      { role: 'assistant', text: voice.intro() },
    ];
    const shouldOnboard = !onboarded && !needsName;
    if (shouldOnboard) {
      try { localStorage.setItem('bleepx_modes_onboarded', '1'); } catch {}
      msgs.push({ role: 'assistant', text: 'I can switch my look to match the vibe. Pick a mode from the chips below, or type it any time.' });
    }
    setMessages(msgs);
    if (needsName) setAwaitingNickname(true);
    setShowModeChips(shouldOnboard);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', text: needsName ? voice.namePrompt() : voice.prompt(displayName) }]);
      playBleep();
    }, 900);
  };

  const setSiteDark = (dark: boolean) => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const modeReplies: Record<string, Mode> = {};
  const addMode = (cmd: string, mode: Mode) => {
    modeReplies[cmd] = mode;
    if (!cmd.includes(' ')) modeReplies[`${cmd} mode`] = mode;
    else modeReplies[cmd.split(' ')[0]] = mode;
  };
  addMode('light', 'light');
  addMode('dark', 'dark');
  addMode('stealth', 'stealth');
  addMode('mix', 'mix');
  addMode('neon', 'neon');
  addMode('ghost', 'ghost');
  addMode('solar', 'solar');
  addMode('green', 'green');
  addMode('red', 'red');

  const applyMode = (lower: string) => {
    const mode = modeReplies[lower];
    if (!mode) return false;
    const m = MODES[mode];
    setManualMode(mode);
    setSiteDark(m.dark);
    setMood(m.mood);
    playBleep();
    setMessages((prev) => [...prev, { role: 'assistant', text: voice.modeSwitched(mode, displayName) }]);
    setTimeout(() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle'), 900);
    return true;
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: text.trim() }]);
    const lower = text.toLowerCase().trim();
    if (applyMode(lower)) return;
    if (awaitingNickname) {
      const name = text.trim().split(/[\s,!?]+/)[0].replace(/[^a-zA-Z0-9_\-']/g, '');
      if (name) {
        setNickName(name);
        try { localStorage.setItem('bleepx_nickname', name); } catch {}
        setAwaitingNickname(false);
        setMessages((prev) => [...prev, { role: 'assistant', text: voice.nameConfirm(name) }]);
        setMood('wave');
        setTimeout(() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle'), 900);
        return;
      }
    }
    setMood('think');
    setMessages((prev) => [...prev, { role: 'assistant', text: voice.thinking(displayName) }]);
    setTimeout(() => {
      const isKnown = TOPIC_HINTS[lower] !== undefined;
      const reply = TOPIC_HINTS[lower] ?? voice.general(text, context ?? 'general');
      let nextMood: Mood = 'chat';
      if (isKnown) nextMood = 'success';
      else if (lower.includes('github')) nextMood = 'github';
      else if (lower.includes('git')) nextMood = 'git';
      else if (lower.includes('hello') || lower.includes('hi ')) nextMood = 'face';
      const final = isKnown ? reply : voice.signOff(reply, displayName);
      setMessages((prev) => [...prev, { role: 'assistant', text: final }]);
      setMood(nextMood);
      playBleep();
      setTimeout(() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle'), 1400);
    }, 700);
  };

  const handleQuick = (q: string) => send(q);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        playBleep();
        setMood('wave');
        setTimeout(() => setMood('chat'), 400);
        setTimeout(() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle'), 1600);
        if (messages.length === 0) startChat();
      }
      return next;
    });
  };

  const moodClass =
    mood === 'flying' ? 'bleepx-fly' :
    mood === 'idle' ? 'bleepx-orbit' :
    mood === 'wave' ? 'bleepx-wave' :
    mood === 'think' ? 'bleepx-think' :
    mood === 'code' ? 'bleepx-code' :
    mood === 'chat' ? 'bleepx-chat' :
    mood === 'error' ? 'bleepx-error' :
    mood === 'success' ? 'bleepx-success' :
    mood === 'signal' ? 'bleepx-signal' :
    mood === 'watch' ? 'bleepx-watch' :
    mood === 'spark' ? 'bleepx-spark' :
    mood === 'git' || mood === 'github' ? 'bleepx-git' :
    mood === 'face' ? 'bleepx-face' :
    mood === 'stealth' ? 'bleepx-stealth' :
    'bleepx-orbit';

  const spriteFilter = (() => {
    switch (mood) {
      case 'error':
        return 'drop-shadow(0 0 8px rgba(244,63,94,0.7)) grayscale(0.3)';
      case 'success':
        return 'drop-shadow(0 0 8px rgba(34,197,94,0.7)) contrast(1.2)';
      case 'code':
        return 'drop-shadow(0 0 8px rgba(14,165,233,0.7))';
      case 'signal':
      case 'watch':
        return 'drop-shadow(0 0 8px rgba(45,212,191,0.7))';
      case 'spark':
        return 'drop-shadow(0 0 8px rgba(250,204,21,0.7))';
      case 'git':
      case 'github':
        return 'drop-shadow(0 0 8px rgba(250,112,0,0.7))';
      case 'wave':
      case 'chat':
        return 'drop-shadow(0 0 6px rgba(87,236,244,0.7))';
      default:
        return 'drop-shadow(0 0 6px rgba(87,236,244,0.4))';
    }
  })();

  const BallSprite = ({ size = 44 }: { size?: number }) => {
    const ballSize = Math.max(24, size - 8);
    const motionClass = activeMode === 'stealth' ? 'bleepx-stealth' : activeMode === 'neon' || activeMode === 'green' || activeMode === 'red' ? 'bleepx-fly' : moodClass;
    const { brace, glow } = MODES[activeMode].sphere;
    const sharedStyle: React.CSSProperties = {
      width: ballSize,
      height: ballSize,
      transformStyle: 'preserve-3d',
    };
    return (
      <div
        className={`relative rounded-full overflow-hidden flex items-center justify-center ${motionClass}`}
        style={{
          ...sharedStyle,
          background: 'radial-gradient(circle at 26% 24%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 10%, transparent 28%), radial-gradient(circle at 30% 30%, #3a4454 0%, #1f2937 20%, #111827 45%, #000000 100%)',
          boxShadow: `inset -6px -6px 14px rgba(0,0,0,0.9), inset 6px 6px 14px rgba(255,255,255,0.12), 0 0 14px ${glow}, inset 0 0 20px rgba(0,0,0,0.6)`,
          filter: `drop-shadow(0 0 6px ${glow})`,
          opacity: activeMode === 'stealth' ? 0.75 : activeMode === 'ghost' ? 0.55 : 1,
        }}
      >
        <span
          className="font-mono font-bold select-none"
          style={{ color: brace, fontSize: Math.max(10, ballSize * 0.45), textShadow: `0 0 10px ${glow}` }}
        >
          {'{ }'}
        </span>
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 24% 20%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 10%, transparent 30%), radial-gradient(circle at 82% 82%, rgba(0,0,0,0.55) 0%, transparent 35%), radial-gradient(circle at 50% 50%, rgba(34,211,238,0.08) 0%, transparent 70%)',
          }}
        />
      </div>
    );
  };

  const PngSprite = ({ size = 44, rotate = 0, children }: { size?: number; rotate?: number; children?: React.ReactNode }) => {
    const iconSrc = activeMode === 'light' ? '/bleepx-icon.png' : '/bleepx-logo.png';
    const modeFilter = activeMode === 'light' ? spriteFilter : MODES[activeMode].filter;
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size, perspective: '800px', transformStyle: 'preserve-3d' }}
      >
        <div
          className={`relative flex items-center justify-center ${moodClass}`}
          style={{ width: size, height: size }}
        >
          <img
            src={iconSrc}
            alt="Bleepx"
            width={size}
            height={size}
            className="object-contain"
            style={{ filter: modeFilter, transform: `rotate(${rotate}deg)`, transformStyle: 'preserve-3d' }}
          />
          {children}
        </div>
      </div>
    );
  };

  const Sprite = ({ size = 44 }: { size?: number }) => {
    const shared = `drop-shadow-lg ${moodClass}`;
    switch (mood) {
      case 'flying':
        return <BallSprite size={size} />;
      case 'idle':
      case 'wave':
      case 'chat':
      case 'face':
        return <PngSprite size={size} />;
      case 'think':
        return <BleepxThink size={size} className={shared} />;
      case 'code':
        return <BleepxCode size={size} className={shared} />;
      case 'error':
        return <BleepxLock size={size} className={shared} />;
      case 'success':
        return <BleepxTrophy size={size} className={shared} />;
      case 'signal':
        return (
          <PngSprite size={size}>
            <BleepxSignal size={20} className="absolute -top-1 -right-1" />
          </PngSprite>
        );
      case 'watch':
        return (
          <PngSprite size={size}>
            <BleepxEye size={16} className="absolute -top-1 -right-1" />
          </PngSprite>
        );
      case 'spark':
        return (
          <PngSprite size={size}>
            <BleepxSpark size={20} className="absolute -top-1 -right-1" />
          </PngSprite>
        );
      case 'git':
        return <BleepxGit size={size} className={shared} />;
      case 'github':
        return <BleepxGitHub size={size} className={shared} />;
      case 'stealth':
        return <BallSprite size={size} />;
      default:
        return <PngSprite size={size} />;
    }
  };

  const isEditable = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.closest('#bleepx-assistant') || el.dataset.bleepxIgnore) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
  };

  const applyHint = useCallback((hint: BleepxHint | null, value?: string) => {
    if (!hint) {
      setDockedHint(null);
      setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle');
      return;
    }
    const text = hint.message + (hint.fix ? `\n\nFix: ${hint.fix}` : '') + (hint.snippet ? `\n\nExample:\n\`${hint.snippet}\`` : '');
    let autoSwitched = false;
    let autoMode: Mode | null = null;
    if (manualMode === 'auto' && Date.now() - lastAutoSwitch.current > 120000 && Math.random() < 0.06) {
      autoMode = hint.severity === 'error' ? 'red' : hint.severity === 'warning' ? 'solar' : 'green';
      autoSwitched = true;
      lastAutoSwitch.current = Date.now();
      const m = MODES[autoMode];
      setManualMode(autoMode);
      setSiteDark(m.dark);
      playBleep();
      setMessages((prev) => [...prev, { role: 'assistant', text: voice.autoSwitched(autoMode as string, displayName) }]);
    }
    if (lastHintText.current !== text) {
      playBleep();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: voice.reaction(hint, value, activeMode, displayName) },
        { role: 'assistant', text },
        { role: 'assistant', text: voice.nag(hint, activeMode, displayName) },
      ]);
      lastHintText.current = text;
    }
    setDockedHint(hint);
    let nextMood: Mood = hint.severity === 'error' ? 'error' : hint.severity === 'warning' ? 'think' : 'signal';
    if (autoSwitched && autoMode) nextMood = MODES[autoMode].mood;
    else if (activeMode === 'red') nextMood = 'error';
    else if (activeMode === 'green') nextMood = 'success';
    else if (activeMode === 'neon') nextMood = 'signal';
    else if (activeMode === 'solar') nextMood = 'success';
    else if (activeMode === 'ghost') nextMood = 'wave';
    else if (activeMode === 'mix') nextMood = 'chat';
    else if (activeMode === 'stealth') nextMood = 'stealth';
    setMood(nextMood);
    setOpen(true);
  }, [pathname, activeMode, displayName, manualMode]);

  const lintFocused = useCallback((target: EventTarget | null) => {
    if (isDragging.current) return;
    if (target instanceof HTMLElement && target.closest('#bleepx-assistant')) return;
    if (!isEditable(target)) {
      setDockedHint(null);
      setDock({ right: 16, bottom: 16 });
      setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle');
      return;
    }
    const el = target as HTMLElement;
    const value = (el as HTMLInputElement).value ?? (el as HTMLTextAreaElement).value ?? el.textContent ?? '';

    if (flyingTimer.current) clearTimeout(flyingTimer.current);

    const hint = lintInput(value, el, pathname ?? undefined);
    if (window.innerWidth < 640) {
      applyHint(hint, value);
      return;
    }

    const rect = el.getBoundingClientRect();
    const top = Math.max(8, Math.min(window.innerHeight - 80, rect.top + rect.height / 2 - 32));
    const left = Math.max(8, Math.min(window.innerWidth - 80, rect.right + 16));
    const nextDock = { right: window.innerWidth - left - 64, bottom: window.innerHeight - top - 64 };

    setMood('flying');
    setDock(nextDock);
    prevDock.current = nextDock;

    flyingTimer.current = setTimeout(() => {
      applyHint(hint, value);
      flyingTimer.current = null;
    }, 80);
  }, [applyHint, pathname]);

  const scheduleLint = useCallback((target: EventTarget | null) => {
    if (lintTimer.current) clearTimeout(lintTimer.current);
    if (flyingTimer.current) clearTimeout(flyingTimer.current);
    lintTimer.current = setTimeout(() => lintFocused(target), 80);
  }, [lintFocused]);

  useEffect(() => {
    const onFocus = (e: FocusEvent) => lintFocused(e.target);
    const onInput = (e: Event) => scheduleLint(e.target);
    const onScrollResize = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest('#bleepx-assistant')) return;
      if (isEditable(active)) lintFocused(active);
    };

    document.addEventListener('focusin', onFocus);
    document.addEventListener('input', onInput);
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);

    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('input', onInput);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      if (lintTimer.current) clearTimeout(lintTimer.current);
    };
  }, [lintFocused, scheduleLint]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.hypot(dx, dy) > 10) didDrag.current = true;
      const right = Math.max(0, Math.min(window.innerWidth - 64, window.innerWidth - e.clientX - 32));
      const bottom = Math.max(0, Math.min(window.innerHeight - 64, window.innerHeight - e.clientY - 32));
      targetDock.current = { right, bottom };
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          setDock(targetDock.current);
          prevDock.current = targetDock.current;
          rafId.current = null;
        });
      }
    };
    const onUp = (e: PointerEvent) => {
      isDragging.current = false;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      const wasClick = !didDrag.current && downAt.current > 0 && Date.now() - downAt.current < 300;
      const hitButton = buttonRef.current?.contains(e.target as Node) ?? false;
      const wasDrag = didDrag.current;
      didDrag.current = false;
      downAt.current = 0;
      setDragging(false);
      if (wasClick && hitButton) {
        toggle();
      } else if (wasDrag) {
        setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle');
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, pathname]);

  return (
    <div
      id="bleepx-assistant"
      className="fixed z-50 flex flex-col items-end gap-2 transition-all duration-500"
      style={{ right: dock.right, bottom: dock.bottom, transition: dragging ? 'none' : undefined }}
    >
      {!open && dockedHint && (
        <div className="relative mb-2 p-3 rounded-2xl bg-white dark:bg-gray-900 border-2 border-rose-300 dark:border-rose-700 shadow-2xl text-sm w-64 sm:w-72">
          <div className="absolute -bottom-3 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-rose-300 dark:border-t-rose-700" />
          <div className="flex items-center gap-2 mb-2">
            <BleepxFace size={20} />
            <div className="font-bold text-bleepx-text text-xs uppercase tracking-wide">Bleepx spotted an issue</div>
            {dockedHint.severity === 'tip' ? <BleepxEye size={18} className="ml-auto" /> : dockedHint.severity === 'warning' ? <BleepxThink size={18} className="ml-auto" /> : <BleepxLock size={18} className="ml-auto" />}
          </div>
          <div className="text-bleepx-text-secondary leading-relaxed">{dockedHint.message}</div>
          {dockedHint.fix && (
            <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">Fix: {dockedHint.fix}</div>
          )}
        </div>
      )}
      {!open && teaser && !dockedHint && (
        <div
          className={`relative mb-2 p-3 rounded-2xl bg-white dark:bg-gray-900 border-2 border-cyan-300 dark:border-cyan-600 shadow-2xl text-sm w-64 sm:w-72 cursor-pointer ${teaserHover ? '' : 'animate-bounce'}`}
          onClick={() => { setOpen(true); setTeaser(null); }}
          onMouseEnter={() => setTeaserHover(true)}
          onMouseLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTeaserHover(false); }}
        >
          <div className="absolute -bottom-3 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-cyan-300 dark:border-t-cyan-600" />
          <div className="flex items-center gap-2 mb-1">
            <BleepxSpark size={20} className="text-cyan-500" />
            <div className="font-bold text-cyan-600 dark:text-cyan-300 text-xs uppercase tracking-wide">Psst...</div>
            <button onClick={(e) => { e.stopPropagation(); setTeaser(null); }} className="ml-auto text-[10px] text-gray-400 hover:text-gray-600">×</button>
          </div>
          <div className="text-bleepx-text-secondary leading-relaxed">{teaser.text}</div>
          {teaser.command && (
            <button onClick={(e) => { e.stopPropagation(); setOpen(true); setTeaser(null); send(teaser.command); }} className="mt-2 text-[10px] px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-bold hover:bg-cyan-200">Try it</button>
          )}
        </div>
      )}
      {open && (
        <div className="relative w-72 sm:w-96 rounded-2xl bg-white dark:bg-gray-900 border-2 border-sky-300 dark:border-sky-700 shadow-2xl text-sm transform transition-all duration-300 origin-bottom-right overflow-hidden">
          {/* speech bubble tail */}
          <div className="absolute -bottom-3 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-sky-300 dark:border-t-sky-700" />
          <div className="p-4 border-b border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/10">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 relative">
                <Sprite size={40} />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-bleepx-text flex items-center gap-2">
                  Bleepx
                  <span className={`px-1.5 py-0.5 rounded text-[9px] border ${MODES[activeMode].badge}`}>{MODES[activeMode].label}</span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{completedCount} steps done · {points} pts</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-xs text-bleepx-text-secondary hover:text-bleepx-text">Close</button>
            </div>
          </div>
          <div className="h-72 flex flex-col relative">
            <img src="/bleepx-logo.png" alt="" className="absolute right-4 top-20 w-20 h-20 opacity-5 pointer-events-none" />
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-sky-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text rounded-bl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {showModeChips && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-bleepx-text rounded-bl-none">
                    <div className="text-xs font-bold mb-2">Pick a mode:</div>
                    <div className="flex flex-wrap gap-2">
                      {(['light','dark','stealth','mix','neon','ghost','solar','green','red'] as Mode[]).map((m) => (
                        <button key={m} onClick={() => { setShowModeChips(false); applyMode(m); }} className="text-[10px] px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-bold hover:bg-cyan-200">
                          {MODES[m].label.replace(' MODE','')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {mood === 'think' && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-none">
                    <BleepxThink size={24} className="animate-pulse" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2 mb-2">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} onClick={() => handleQuick(q)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors">{q}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  data-bleepx-ignore
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
                  placeholder="Ask Bleepx..."
                  className="flex-1 px-3 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button onClick={() => send(input)} className="px-3 py-2 rounded-full bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Send</button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Link href={hint.href} onClick={() => setOpen(false)} className="text-[10px] px-3 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition-colors">{hint.cta}</Link>
                <button onClick={startChat} className="text-[10px] text-bleepx-text-secondary hover:text-bleepx-text underline">Clear chat</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        ref={buttonRef}
        onPointerDown={(e) => {
          isDragging.current = true;
          didDrag.current = false;
          downAt.current = Date.now();
          dragStartPos.current = { x: e.clientX, y: e.clientY };
          setDragging(true);
          setMood('flying');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        onMouseEnter={() => setMood('wave')}
        onMouseLeave={() => setMood(dockedHint ? (dockedHint.severity === 'error' ? 'error' : dockedHint.severity === 'warning' ? 'think' : 'signal') : (pathname?.startsWith('/lab/') ? 'code' : 'idle'))}
        className={`group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-2xl hover:shadow-sky-500/30 transition-all duration-300 flex items-center justify-center hover:-translate-y-1 hover:scale-110 border border-white/20 dark:border-gray-700/30 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        aria-label="Open Bleepx assistant"
      >
        <div className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          <Sprite />
        </div>
        {!open && dockedHint && (
          <span className="absolute -top-1 -right-1">
            <BleepxSpark size={16} />
          </span>
        )}
      </button>
    </div>
  );
}
