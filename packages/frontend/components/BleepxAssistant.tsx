'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProgress } from '@/lib/useProgress';
import { playBleep } from '@/lib/audio';
import { lintInput, BleepxHint } from '@/lib/bleepxLinter';

type AssistantContext = 'home' | 'sql' | 'lab' | 'cloud' | 'journey' | 'general';

type Mood = 'idle' | 'wave' | 'think' | 'code';

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
  const lintTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHintText = useRef<string | null>(null);

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
      const reply = TOPIC_HINTS[text.toLowerCase().trim()] ?? generateBleepxResponse(text, context ?? 'general');
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle');
      playBleep();
    }, 700);
  };

  const handleQuick = (q: string) => send(q);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        playBleep();
        setMood('wave');
        setTimeout(() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle'), 1200);
        if (messages.length === 0) startChat();
      }
      return next;
    });
  };

  const moodClass = mood === 'think' ? 'animate-pulse' : mood === 'wave' ? 'animate-bounce' : 'animate-float';

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
      setMessages((prev) => [...prev, { role: 'assistant', text }]);
      lastHintText.current = text;
    }
    setDockedHint(hint);
    setMood('think');
    if (hint.severity === 'error' || hint.severity === 'warning') {
      setOpen(true);
    }
  }, [pathname]);

  const lintFocused = useCallback((target: EventTarget | null) => {
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
    setDock({ right: window.innerWidth - left - 64, bottom: window.innerHeight - top - 64 });

    const hint = lintInput(el.value, el, pathname ?? undefined);
    applyHint(hint);
  }, [applyHint, pathname]);

  const scheduleLint = useCallback((target: EventTarget | null) => {
    if (lintTimer.current) clearTimeout(lintTimer.current);
    lintTimer.current = setTimeout(() => lintFocused(target), 600);
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

  return (
    <div
      className="fixed z-50 flex flex-col items-end gap-2 transition-all duration-500"
      style={{ right: dock.right, bottom: dock.bottom }}
    >
      {!open && dockedHint && (
        <div className="relative mb-2 p-3 rounded-2xl bg-white dark:bg-gray-900 border-2 border-rose-300 dark:border-rose-700 shadow-2xl text-sm w-72">
          <div className="absolute -bottom-3 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-rose-300 dark:border-t-rose-700" />
          <div className="font-bold text-bleepx-text mb-1 text-xs uppercase tracking-wide">Bleepx spotted an issue</div>
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
              <div className="shrink-0 w-8 h-8 relative">
                <img src="/bleepx-icon.svg" alt="Bleepx" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-bleepx-text">Bleepx</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{completedCount} steps done · {points} pts</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-xs text-bleepx-text-secondary hover:text-bleepx-text">Close</button>
            </div>
          </div>
          <div className="h-72 flex flex-col">
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
                    <img src="/bleepx-icon.svg" alt="Bleepx" className="w-5 h-5 object-contain animate-pulse" />
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
        onClick={toggle}
        onMouseEnter={() => setMood('think')}
        onMouseLeave={() => setMood(pathname?.startsWith('/lab/') ? 'code' : 'idle')}
        className="group relative w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-2xl hover:shadow-sky-500/30 transition-all duration-300 flex items-center justify-center hover:-translate-y-1 hover:scale-110 animate-float"
        aria-label="Open Bleepx assistant"
      >
        <img
          src="/bleepx-icon.svg"
          alt="Bleepx"
          className={`w-10 h-10 object-contain drop-shadow-md transition-transform duration-300 group-hover:rotate-6 ${moodClass}`}
        />
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500" />
          </span>
        )}
      </button>
    </div>
  );
}
