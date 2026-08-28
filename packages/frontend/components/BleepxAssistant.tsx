'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProgress } from '@/lib/useProgress';
import { playBleep } from '@/lib/audio';
import { lintInput, BleepxHint } from '@/lib/bleepxLinter';
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

type Mood = 'idle' | 'wave' | 'think' | 'code' | 'chat' | 'error' | 'success' | 'signal' | 'flying' | 'watch' | 'spark' | 'git' | 'github' | 'face';

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

function generateBleepxResponse(input: string, context: AssistantContext = 'general'): string {
  const lower = input.toLowerCase();
  if (lower.includes('s3') && lower.includes('glacier')) return 'S3 Glacier and Glacier Deep Archive are for rarely accessed long-term data. Restores take minutes to hours.';
  if (lower.includes('s3')) return 'S3 stores objects in buckets. Choose storage classes based on access patterns: STANDARD for hot data, IA for infrequent, Glacier for archives.';
  if (lower.includes('ec2') && (lower.includes('ebs') || lower.includes('disk'))) return 'EC2 instances use EBS for block storage or instance store for temporary storage. EBS is persistent and AZ-bound.';
  if (lower.includes('ec2')) return 'EC2 provides virtual servers. Pick instance families by workload: compute (C), memory (R), general (M), or burstable (T).';
  if (lower.includes('lambda')) return 'AWS Lambda runs code in response to events. It scales automatically and you only pay for invocation time.';
  if (lower.includes('rds')) return 'RDS manages relational databases like MySQL, Postgres, and MariaDB. Use Multi-AZ for high availability and read replicas for scale.';
  if (lower.includes('dynamodb') || lower.includes('dax')) return 'DynamoDB is a managed NoSQL key-value store. DAX is an in-memory cache for microsecond reads.';
  if (lower.includes('vpc') || lower.includes('subnet')) return 'A VPC is your isolated network. Subnets are AZ-specific and route tables control traffic flow.';
  if (lower.includes('iam') || lower.includes('role') || lower.includes('policy')) return 'IAM controls access. Prefer roles with temporary credentials, least privilege, and managed policies for common patterns.';
  if (lower.includes('cloudfront')) return 'CloudFront is a CDN that caches content at edge locations to reduce latency and origin load.';
  if (lower.includes('route 53') || lower.includes('route53')) return 'Route 53 is a DNS and domain registrar. Use it for routing policies, health checks, and failover.';
  if (lower.includes('sns') || lower.includes('sqs')) return 'SNS is pub-sub messaging; SQS is a managed queue. Fan-out patterns use SNS to push to multiple SQS queues.';
  if (lower.includes('join')) return 'A SQL JOIN merges tables. INNER returns matches, LEFT returns all left rows, RIGHT returns all right rows, FULL returns all rows from both.';
  if (lower.includes('group by')) return 'GROUP BY aggregates rows. Use it with aggregate functions like COUNT, SUM, AVG, MAX, and MIN.';
  if (lower.includes('window') || lower.includes('over')) return 'Window functions like ROW_NUMBER, RANK, and LEAD/LAG operate over a set of rows without collapsing them.';
  if (lower.includes('cte') || lower.includes('with ')) return 'A CTE (WITH clause) defines a temporary result set for cleaner, reusable queries.';
  if (lower.includes('python') || lower.includes('pandas')) return 'Pandas is the standard Python data manipulation library. Use DataFrames for tables, groupby for aggregation, and merge for joins.';
  if (lower.includes('cost') || lower.includes('pricing')) return 'For cost savings, use Reserved Instances or Savings Plans for steady workloads, Spot for fault-tolerant batch, and right-size storage classes.';
  if (lower.includes('secure') || lower.includes('security')) return 'Security pillars: least privilege IAM, encryption at rest and in transit, private subnets, CloudTrail logging, and regular security scans.';
  if (lower.includes('resilien') || lower.includes('high availability')) return 'Build resilience with Multi-AZ, auto scaling, health checks, read replicas, and automated backups.';
  if (lower.includes('machine learning') || lower.includes('ml')) return 'SageMaker builds, trains, and deploys ML models. Use S3 for data, ECR for containers, and Lambda for light inference endpoints.';
  if (context === 'sql') return 'I can help with SELECT, JOINs, aggregates, window functions, and CTEs. What SQL topic are you working on?';
  if (context === 'cloud') return 'Ask me about S3, EC2, Lambda, RDS, DynamoDB, VPC, IAM, CloudFront, or SAA scenarios.';
  if (context === 'lab') return 'Lab work usually involves SQL, Python/pandas, and machine learning. Paste a code snippet or ask a concept.';
  return "I'm Bleepx, your data and cloud assistant. Ask me about SQL, AWS, Python, or ML and I'll do my best to help.";
}

export default function BleepxAssistant({ context }: { context?: AssistantContext }) {
  const pathname = usePathname();
  const { completed, points } = useProgress();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [dock, setDock] = useState<{ right: number; bottom: number }>({ right: 16, bottom: 16 });
  const [dockedHint, setDockedHint] = useState<BleepxHint | null>(null);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lintTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHintText = useRef<string | null>(null);
  const flyingTimer = useRef<NodeJS.Timeout | null>(null);
  const prevDock = useRef({ right: 16, bottom: 16 });
  const isDragging = useRef(false);
  const didDrag = useRef(false);

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

  const goal = findJourneyGoal();
  const completedCount = completed.size;

  const greeting = useMemo(() => {
    const goalText = goal ? `Your current track: ${goal}. ` : '';
    return `${goalText}${hint.text}`;
  }, [goal, hint]);

  const startChat = () => {
    setMessages([{ role: 'assistant', text: greeting }]);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: text.trim() }]);
    setMood('think');
    setTimeout(() => {
      const lower = text.toLowerCase();
      const reply = TOPIC_HINTS[lower.trim()] ?? generateBleepxResponse(text, context ?? 'general');
      const isKnown = TOPIC_HINTS[lower.trim()] !== undefined;
      let nextMood: Mood = 'chat';
      if (isKnown) nextMood = 'success';
      else if (lower.includes('github')) nextMood = 'github';
      else if (lower.includes('git')) nextMood = 'git';
      else if (lower.includes('hello') || lower.includes('hi ')) nextMood = 'face';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
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

  const PngSprite = ({ size = 44, rotate = 0, children }: { size?: number; rotate?: number; children?: React.ReactNode }) => (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size, perspective: '800px', transformStyle: 'preserve-3d' }}
    >
      <div
        className={`relative flex items-center justify-center ${moodClass}`}
        style={{ width: size, height: size }}
      >
        <img
          src="/bleepx-icon.png"
          alt="Bleepx"
          width={size}
          height={size}
          className="object-contain"
          style={{ filter: spriteFilter, transform: `rotate(${rotate}deg)`, transformStyle: 'preserve-3d' }}
        />
        {children}
      </div>
    </div>
  );

  const Sprite = ({ size = 44 }: { size?: number }) => {
    const shared = `drop-shadow-lg ${moodClass}`;
    switch (mood) {
      case 'flying':
        return <PngSprite size={size} rotate={rotation} />;
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
      default:
        return <PngSprite size={size} />;
    }
  };

  const isEditable = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
    if (!(el instanceof HTMLElement)) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
  };

  const applyHint = useCallback((hint: BleepxHint | null) => {
    if (!hint) {
      setDockedHint(null);
      setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle');
      return;
    }
    const text = hint.message + (hint.fix ? `\n\nFix: ${hint.fix}` : '') + (hint.snippet ? `\n\nExample:\n\`${hint.snippet}\`` : '');
    if (lastHintText.current !== text) {
      playBleep();
      setMessages((prev) => [...prev, { role: 'assistant', text }]);
      lastHintText.current = text;
    }
    setDockedHint(hint);
    setMood(hint.severity === 'error' ? 'error' : hint.severity === 'warning' ? 'think' : 'signal');
    if (hint.severity === 'error' || hint.severity === 'warning') {
      setOpen(true);
    }
  }, [pathname]);

  const lintFocused = useCallback((target: EventTarget | null) => {
    if (isDragging.current) return;
    if (!isEditable(target)) {
      setDockedHint(null);
      setDock({ right: 16, bottom: 16 });
      setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle');
      return;
    }
    const el = target as HTMLInputElement | HTMLTextAreaElement;
    const rect = el.getBoundingClientRect();
    const top = Math.max(8, Math.min(window.innerHeight - 80, rect.top + rect.height / 2 - 32));
    const left = Math.max(8, Math.min(window.innerWidth - 80, rect.right + 16));
    const nextDock = { right: window.innerWidth - left - 64, bottom: window.innerHeight - top - 64 };

    const oldLeft = window.innerWidth - prevDock.current.right - 64;
    const oldTop = window.innerHeight - prevDock.current.bottom - 64;
    const dx = left - oldLeft;
    const dy = top - oldTop;
    const distance = Math.hypot(dx, dy);
    const rawLean = distance > 4 ? Math.atan2(dx, -dy) * (180 / Math.PI) : 0;
    const lean = Math.max(-30, Math.min(30, rawLean));

    if (flyingTimer.current) clearTimeout(flyingTimer.current);
    setMood('flying');
    setRotation(lean);
    setDock(nextDock);
    prevDock.current = nextDock;

    const hint = lintInput(el.value, el, pathname ?? undefined);
    flyingTimer.current = setTimeout(() => {
      applyHint(hint);
      flyingTimer.current = null;
    }, 150);
  }, [applyHint, pathname]);

  const scheduleLint = useCallback((target: EventTarget | null) => {
    if (lintTimer.current) clearTimeout(lintTimer.current);
    if (flyingTimer.current) clearTimeout(flyingTimer.current);
    lintTimer.current = setTimeout(() => lintFocused(target), 400);
  }, [lintFocused]);

  useEffect(() => {
    const onFocus = (e: FocusEvent) => lintFocused(e.target);
    const onInput = (e: Event) => scheduleLint(e.target);
    const onScrollResize = () => {
      const active = document.activeElement;
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
    const onMove = (e: MouseEvent) => {
      didDrag.current = true;
      const right = Math.max(0, Math.min(window.innerWidth - 64, window.innerWidth - e.clientX - 32));
      const bottom = Math.max(0, Math.min(window.innerHeight - 64, window.innerHeight - e.clientY - 32));
      const nextDock = { right, bottom };
      setDock(nextDock);
      prevDock.current = nextDock;
    };
    const onUp = () => {
      isDragging.current = false;
      setDragging(false);
      setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle');
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, pathname]);

  return (
    <div
      className="fixed z-50 flex flex-col items-end gap-2 transition-all duration-500"
      style={{ right: dock.right, bottom: dock.bottom, transition: dragging ? 'none' : undefined }}
    >
      {!open && dockedHint && (
        <div className="relative mb-2 p-3 rounded-2xl bg-white dark:bg-gray-900 border-2 border-rose-300 dark:border-rose-700 shadow-2xl text-sm w-72">
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
      {open && (
        <div className="relative w-80 sm:w-96 rounded-2xl bg-white dark:bg-gray-900 border-2 border-sky-300 dark:border-sky-700 shadow-2xl text-sm transform transition-all duration-300 origin-bottom-right overflow-hidden">
          {/* speech bubble tail */}
          <div className="absolute -bottom-3 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-sky-300 dark:border-t-sky-700" />
          <div className="p-4 border-b border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/10">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 relative">
                <Sprite size={40} />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-bleepx-text">Bleepx</div>
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
              {mood === 'think' && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-none">
                    <BleepxThink size={24} className="animate-pulse" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2 mb-2">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} onClick={() => handleQuick(q)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors">{q}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
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
        onClick={() => {
          if (didDrag.current) {
            didDrag.current = false;
            return;
          }
          toggle();
        }}
        onMouseDown={() => {
          isDragging.current = true;
          didDrag.current = false;
          setDragging(true);
          setMood('flying');
        }}
        onMouseEnter={() => setMood('wave')}
        onMouseLeave={() => setMood(dockedHint ? (dockedHint.severity === 'error' ? 'error' : dockedHint.severity === 'warning' ? 'think' : 'signal') : (pathname?.startsWith('/lab/') ? 'code' : 'idle'))}
        className={`group relative w-16 h-16 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-2xl hover:shadow-sky-500/30 transition-all duration-300 flex items-center justify-center hover:-translate-y-1 hover:scale-110 border border-white/20 dark:border-gray-700/30 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        aria-label="Open Bleepx assistant"
      >
        <div className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          <Sprite />
        </div>
        {!open && (
          <span className="absolute -top-1 -right-1">
            <BleepxSpark size={20} className="animate-ping text-cyan-400" />
          </span>
        )}
      </button>
    </div>
  );
}
