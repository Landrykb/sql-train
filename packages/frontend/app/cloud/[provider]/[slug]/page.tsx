'use client';

import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import AchievementNotification from '@/components/AchievementNotification';
import { useProgress } from '@/lib/useProgress';
import { getGitHubUser } from '@/lib/authClient';
import { pushCloudMissionToGitHub } from '@/lib/githubPush';
import { playBleep } from '@/lib/audio';
import { useAuthGate } from '@/components/SignInGate';
import { GlossaryTooltip } from '@/components/GlossaryTooltip';
import { hasGlossaryEntry } from '@/lib/cloud/glossary';
import {
  CLOUD_PROVIDER_META,
  getMission,
  getMissionSlugs,
  isCloudProvider,
  cloudMissionId,
  CLOUD_LEVEL_TIER,
  type CloudProvider,
} from '@/lib/cloud';
import { cloudTrials } from '@/lib/cloud/trials';
import { iacTemplate } from '@/lib/cloud/templates';
import { getConcept, hasConcept, CLOUD_CONCEPTS } from '@/lib/cloud/concepts';
import CloudSandbox from '@/components/CloudSandbox';
import { createBleepxBankScenario } from '@/lib/cloud/sandbox';
import CrossVerseNav from '@/components/CrossVerseNav';
import { CloudProviderIcon, StarRating, BrainIcon, FlaskIcon, CheckBadge, GuideIcon, MapIcon, ToolsIcon, FormsIcon, AlertIcon, TrophyIcon, BuildingIcon } from '@/components/AppIcons';

const META_SKILLS = new Set(['everything', 'exam-prep']);

// Deterministic shuffle (seeded by slug) to avoid hydration mismatches.
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      {lang && (
        <span className="absolute top-2 right-12 text-xs uppercase tracking-wide text-gray-500 font-mono">{lang}</span>
      )}
      <button
        onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="bg-gray-900 text-green-300 p-3 pt-8 rounded-lg text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-w-full">{code}</pre>
    </div>
  );
}

// Architecture flow: connected cards with arrows between them.
function ArchitectureFlow({ nodes }: { nodes: { label: string; note?: string }[] }) {
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto max-w-full pb-2">
      {nodes.map((n, i) => (
        <React.Fragment key={i}>
          <div className="flex-shrink-0 min-w-[110px] max-w-[150px] rounded-lg border border-bleepx-border bg-gradient-to-b from-bleepx-bg to-bleepx-white p-3 text-center">
            <div className="text-xs font-bold text-bleepx-text leading-tight break-words">{n.label}</div>
            {n.note && <div className="text-xs text-bleepx-text-secondary mt-0.5 break-words">{n.note}</div>}
          </div>
          {i < nodes.length - 1 && (
            <div className="flex flex-wrap items-center text-sky-400 text-lg flex-shrink-0">→</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/** Helper to wrap text with glossary tooltips for detected technical terms */
function wrapWithGlossary(text: string): React.ReactNode {
  if (!text) return text;
  
  // Split text into words and check each for glossary entries
  const words = text.split(/(\s+)/);
  return words.map((word, index) => {
    // Remove punctuation for lookup
    const cleanWord = word.replace(/[^a-zA-Z0-9-_]/g, '');
    if (cleanWord && hasGlossaryEntry(cleanWord)) {
      return <GlossaryTooltip key={index} term={cleanWord}>{word}</GlossaryTooltip>;
    }
    return word;
  });
}

export default function CloudMissionPage() {
  const params = useParams<{ provider: string; slug: string }>();
  const { provider, slug } = params;
  const { completed, markComplete } = useProgress();
  const { user: ghUser, requireAuth, GateComponent } = useAuthGate();

  if (!isCloudProvider(provider)) notFound();
  const p = provider as CloudProvider;
  const mission = getMission(p, slug);
  if (!mission) notFound();

  const meta = CLOUD_PROVIDER_META[p];
  const missionCaseId = cloudMissionId(p, slug);
  const isDone = completed.has(missionCaseId);
  const tier = CLOUD_LEVEL_TIER[mission.level];

  // Prev / next navigation
  const slugs = getMissionSlugs(p);
  const idx = slugs.indexOf(slug);
  const prevSlug = idx > 0 ? slugs[idx - 1] : null;
  const nextSlug = idx < slugs.length - 1 ? slugs[idx + 1] : null;

  const isQuiz = mission.labType === 'quiz';
  const isScenario = mission.labType === 'scenario' || mission.labType === 'sandbox';
  const [sandboxDone, setSandboxDone] = useState(false);

  // Quiz state (for quiz-type missions)
  const quizQuestions = useMemo(() => {
    if (!isQuiz) return [];
    const pool = cloudTrials.filter((q) => q.provider === p || q.provider === 'multi');
    return pool.length ? pool.slice(0, Math.min(5, pool.length)) : cloudTrials.slice(0, 5);
  }, [isQuiz, p]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const quizScore = quizQuestions.filter((q) => answers[q.id] === q.answer).length;
  const quizPassed = quizQuestions.length > 0 && quizScore / quizQuestions.length >= 0.6;

  // ── Concept walkthrough (the real learning) ──────────────────────
  const learnList = useMemo(
    () =>
      mission.skills
        .filter((s) => !META_SKILLS.has(s))
        .map((s) => ({ key: s, concept: getConcept(s), known: hasConcept(s) })),
    [mission.skills],
  );

  const archNodes = useMemo(() => {
    if (mission.architecture && mission.architecture.length) return mission.architecture.map((n) => ({ label: n.label, note: n.note }));
    return learnList.map(({ concept }) => ({ label: concept.name }));
  }, [mission.architecture, learnList]);

  const [stepIdx, setStepIdx] = useState(0);
  const [understood, setUnderstood] = useState<Set<string>>(new Set());
  const allUnderstood = learnList.length > 0 && understood.size >= learnList.length;

  // ── Knowledge check (auto-generated from real concepts) ──────────
  const knowledgeCheck = useMemo(() => {
    if (isQuiz) return [];
    const known = learnList.filter((l) => l.known);
    if (known.length < 2) return [];
    const seed = seedFrom(slug);
    const allKeys = Object.keys(CLOUD_CONCEPTS);
    return known.slice(0, 3).map((l, i) => {
      const distractors = shuffleSeeded(
        allKeys.filter((k) => CLOUD_CONCEPTS[k].name !== l.concept.name),
        seed + i,
      )
        .slice(0, 3)
        .map((k) => CLOUD_CONCEPTS[k].name);
      const options = shuffleSeeded([l.concept.name, ...distractors], seed + i * 7);
      return { id: l.key, what: l.concept.what, options, answer: l.concept.name, why: l.concept.why };
    });
  }, [isQuiz, learnList, slug]);

  const [kcAnswers, setKcAnswers] = useState<Record<string, string>>({});
  const [kcSubmitted, setKcSubmitted] = useState(false);
  const kcScore = knowledgeCheck.filter((q) => kcAnswers[q.id] === q.answer).length;
  const kcPassed = knowledgeCheck.length === 0 || (kcSubmitted && kcScore / knowledgeCheck.length >= 0.67);

  const [reviewed, setReviewed] = useState(false);

  const handleComplete = useCallback(() => {
    if (isDone) return;
    markComplete(missionCaseId, tier);
    playBleep();
  }, [isDone, markComplete, missionCaseId, tier]);

  const canComplete = isScenario
    ? sandboxDone
    : isQuiz
      ? quizPassed && (learnList.length === 0 || allUnderstood)
      : learnList.length > 0
        ? allUnderstood && kcPassed
        : reviewed;

  const template = mission.labType === 'iac' ? iacTemplate(p, mission) : null;

  // Render the auth gate component
  if (!ghUser?.login) {
    return (
      <>
        <main className="max-w-5xl mx-auto px-2 md:px-4 py-4 space-y-5 bg-bleepx-bg min-h-screen pb-20 min-w-0">
          {/* Breadcrumb */}
          <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
            <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
            <span>/</span>
            <Link href={`/cloud/${p}`} className="hover:underline">{meta.short}</Link>
            <span>/</span>
            <span className="font-semibold text-bleepx-gray whitespace-normal break-words">{mission.title}</span>
          </nav>
          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-8 text-center">
            <p className="text-bleepx-text-secondary">Loading authentication...</p>
          </div>
        </main>
        {GateComponent()}
      </>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 py-4 space-y-5 bg-bleepx-bg min-h-screen pb-20 min-w-0">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <Link href={`/cloud/${p}`} className="hover:underline">{meta.short}</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray whitespace-normal break-words">{mission.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <span className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-md`}><CloudProviderIcon provider={provider} size={24} className="text-white" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wide font-bold text-bleepx-text-secondary">{mission.section}</span>
              {isDone && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 inline-flex flex-wrap items-center gap-1"><CheckBadge size={10} className="text-emerald-700 dark:text-emerald-300" /> COMPLETED</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-bleepx-text mt-0.5 break-words">{mission.title}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary">{mission.level}</span>
              <StarRating stars={mission.stars} size={12} />
              <span className="text-xs text-bleepx-text-secondary">+{tier * 10} pts</span>
              {mission.crossDomain && (
                <Link href={`/cloud/${mission.crossDomain}`} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:underline">↔ {mission.crossDomain} track</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Briefing */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-base font-bold text-bleepx-text mb-2 flex flex-wrap items-center gap-2"><GuideIcon size={18} /> Mission Briefing</h2>
        <div className="text-sm text-bleepx-text-secondary leading-relaxed whitespace-pre-line break-words">
          {wrapWithGlossary(mission.description)}
        </div>

        {mission.realWorld && (
          <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/15 p-3">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-0.5 flex flex-wrap items-center gap-1"><BuildingIcon size={12} /> Real-world scenario</p>
            <p className="text-sm text-bleepx-text-secondary leading-relaxed break-words">{wrapWithGlossary(mission.realWorld)}</p>
          </div>
        )}

        {mission.objectives && mission.objectives.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold text-bleepx-text mb-1.5">By the end you can:</p>
            <ul className="space-y-1">
              {mission.objectives.map((o) => (
                <li key={o} className="flex flex-wrap items-start gap-2 text-sm text-bleepx-text-secondary">
                  <span className="text-sky-500 mt-0.5">▸</span><span className="break-words">{wrapWithGlossary(o)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Architecture flow */}
      {archNodes.length > 1 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-bleepx-text mb-1 flex flex-wrap items-center gap-2"><MapIcon size={18} /> How it fits together</h2>
          <p className="text-xs text-bleepx-text-secondary mb-3">Follow the request/data flow through the architecture.</p>
          <ArchitectureFlow nodes={archNodes} />
        </div>
      )}

      {/* Concept walkthrough (the learning core) - shown for all missions with concepts */}
      {learnList.length > 0 && (() => {
        const current = learnList[Math.min(stepIdx, learnList.length - 1)];
        const c = current.concept;
        const isUnderstood = understood.has(current.key);
        const markAndAdvance = () => {
          setUnderstood((prev) => new Set(prev).add(current.key));
          const next = learnList.findIndex((l, i) => i > stepIdx && !understood.has(l.key));
          if (next !== -1) setStepIdx(next);
          else if (stepIdx < learnList.length - 1) setStepIdx(stepIdx + 1);
        };
        return (
          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between mb-1">
              <h2 className="text-base font-bold text-bleepx-text flex flex-wrap items-center gap-2"><GuideIcon size={18} /> Concept Walkthrough</h2>
              <span className="text-xs text-bleepx-text-secondary font-mono">{understood.size}/{learnList.length} understood</span>
            </div>
            <p className="text-xs text-bleepx-text-secondary mb-3">Work through each concept and mark it understood. This unlocks the knowledge check.</p>

            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500" style={{ width: `${(understood.size / learnList.length) * 100}%` }} />
            </div>

            {/* Step dots */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {learnList.map((l, i) => (
                <button
                  key={l.key}
                  onClick={() => setStepIdx(i)}
                  title={l.concept.name}
                  className={`h-7 px-2 rounded-full text-sm font-medium border transition-colors ${
                    understood.has(l.key)
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : i === stepIdx
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                        : 'border-bleepx-border text-bleepx-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {understood.has(l.key) ? <span className="inline-flex flex-wrap items-center gap-1"><CheckBadge size={10} /> {l.concept.name}</span> : l.concept.name}
                </button>
              ))}
            </div>

            {/* Current concept card */}
            <div className="rounded-xl border border-bleepx-border overflow-hidden">
              <div className="bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-900/20 px-4 py-3 flex flex-wrap items-center gap-3">
                <CloudProviderIcon provider={provider} size={24} className="text-sky-600" />
                <div className="min-w-0">
                  <h3 className="font-bold text-bleepx-text leading-tight break-words">{c.name}</h3>
                  <p className="text-xs text-bleepx-text-secondary break-words">{wrapWithGlossary(c.what)}</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-sky-600 mb-0.5">Why it matters</p>
                  <p className="text-sm text-bleepx-text-secondary leading-relaxed break-words">{c.why}</p>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-indigo-500 mb-0.5">When to use it</p>
                  <p className="text-sm text-bleepx-text-secondary leading-relaxed break-words">{c.when}</p>
                </div>
                {c.example && (
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-emerald-600 mb-1">Example</p>
                    <CodeBlock code={c.example.code} lang={c.example.lang} />
                  </div>
                )}
                {c.gotcha && (
                  <div className="rounded-lg border-l-4 border-red-400 bg-red-50 dark:bg-red-900/15 p-3">
                    <p className="text-sm font-bold text-red-600 mb-0.5 flex flex-wrap items-center gap-1"><AlertIcon size={12} /> Gotcha (exam trap)</p>
                    <p className="text-sm text-bleepx-text-secondary leading-relaxed break-words">{c.gotcha}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Nav */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
                disabled={stepIdx === 0}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-bleepx-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={markAndAdvance}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  isUnderstood
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {isUnderstood ? <span className="inline-flex flex-wrap items-center gap-1"><CheckBadge size={14} className="text-emerald-700 dark:text-emerald-300" /> Understood</span> : 'Mark understood →'}
              </button>
              <button
                onClick={() => setStepIdx(Math.min(learnList.length - 1, stepIdx + 1))}
                disabled={stepIdx >= learnList.length - 1}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-bleepx-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        );
      })()}

      {/* Hands-on code (IaC missions) */}
      {!isQuiz && template && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-bleepx-text mb-1 flex flex-wrap items-center gap-2"><ToolsIcon size={18} /> Hands-on: Infrastructure as Code</h2>
          <p className="text-xs text-bleepx-text-secondary mb-3">A realistic <code className="font-mono">{template.filename}</code> for this mission. Read it top to bottom — it mirrors the concepts above.</p>
          <CodeBlock code={template.code} lang={template.language} />
        </div>
      )}

      {/* Quiz (quiz missions) */}
      {isQuiz && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-bleepx-text mb-1 flex flex-wrap items-center gap-2"><FormsIcon size={18} /> {mission.isBonus ? 'Exam Simulator' : 'Knowledge Check'}</h2>
          <p className="text-xs text-bleepx-text-secondary mb-4">Answer at least 60% correctly to complete this mission.</p>
          <div className="space-y-4">
            {quizQuestions.map((q, qi) => (
              <div key={q.id} className="border border-bleepx-border rounded-lg p-3">
                <p className="text-sm font-medium text-bleepx-text mb-2 break-words">{qi + 1}. {q.question}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt;
                    const showCorrect = quizSubmitted && opt === q.answer;
                    const showWrong = quizSubmitted && selected && opt !== q.answer;
                    return (
                      <button
                        key={opt}
                        disabled={quizSubmitted}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors break-words ${
                          showCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                          : showWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                          : selected ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                          : 'border-bleepx-border text-bleepx-text hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && <p className="text-xs text-bleepx-text-secondary mt-2 italic break-words">{q.explanation}</p>}
              </div>
            ))}
          </div>
          {!quizSubmitted ? (
            <button
              onClick={() => setQuizSubmitted(true)}
              disabled={Object.keys(answers).length < quizQuestions.length}
              className="mt-4 px-5 py-2 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              Submit Answers
            </button>
          ) : (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className={`text-sm font-bold ${quizPassed ? 'text-emerald-600' : 'text-red-500'}`}>
                Score: {quizScore}/{quizQuestions.length} — {quizPassed ? <span className="inline-flex flex-wrap items-center gap-1"><CheckBadge size={14} className="text-emerald-600" /> Passed!</span> : 'Try again (need 60%)'}
              </p>
              {!quizPassed && (
                <button onClick={() => { setQuizSubmitted(false); setAnswers({}); }} className="mt-2 text-sm text-sky-600 hover:underline">Retry</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Knowledge check (diagram/iac missions) */}
      {!isQuiz && knowledgeCheck.length > 0 && (
        <div className={`bg-bleepx-white rounded-xl border p-5 shadow-sm transition-opacity ${allUnderstood ? 'border-bleepx-border' : 'border-dashed border-bleepx-border opacity-60'}`}>
          <h2 className="text-base font-bold text-bleepx-text mb-1 flex flex-wrap items-center gap-2"><BrainIcon size={18} /> Knowledge Check</h2>
          <p className="text-xs text-bleepx-text-secondary mb-4">
            {allUnderstood ? 'Match each description to the right concept (67% to pass).' : 'Finish the walkthrough above to unlock the check.'}
          </p>
          {allUnderstood && (
            <>
              <div className="space-y-4">
                {knowledgeCheck.map((q, qi) => (
                  <div key={q.id} className="border border-bleepx-border rounded-lg p-3">
                    <p className="text-sm font-medium text-bleepx-text mb-2 break-words">{qi + 1}. Which is described as: <span className="italic text-bleepx-text-secondary break-words">&ldquo;{q.what}&rdquo;</span></p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {q.options.map((opt) => {
                        const selected = kcAnswers[q.id] === opt;
                        const showCorrect = kcSubmitted && opt === q.answer;
                        const showWrong = kcSubmitted && selected && opt !== q.answer;
                        return (
                          <button
                            key={opt}
                            disabled={kcSubmitted}
                            onClick={() => setKcAnswers((a) => ({ ...a, [q.id]: opt }))}
                            className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors break-words ${
                              showCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                              : showWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                              : selected ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                              : 'border-bleepx-border text-bleepx-text hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {kcSubmitted && <p className="text-xs text-bleepx-text-secondary mt-2 italic break-words">{q.why}</p>}
                  </div>
                ))}
              </div>
              {!kcSubmitted ? (
                <button
                  onClick={() => setKcSubmitted(true)}
                  disabled={Object.keys(kcAnswers).length < knowledgeCheck.length}
                  className="mt-4 px-5 py-2 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50"
                >
                  Submit Check
                </button>
              ) : (
                <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className={`text-sm font-bold ${kcPassed ? 'text-emerald-600' : 'text-red-500'}`}>
                    Score: {kcScore}/{knowledgeCheck.length} — {kcPassed ? <span className="inline-flex flex-wrap items-center gap-1"><CheckBadge size={14} className="text-emerald-600" /> Passed!</span> : 'Try again (need 67%)'}
                  </p>
                  {!kcPassed && (
                    <button onClick={() => { setKcSubmitted(false); setKcAnswers({}); }} className="mt-2 text-sm text-sky-600 hover:underline">Retry</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Scenario / Sandbox missions: hands-on cloud simulator */}
      {isScenario && !isDone && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-bleepx-text mb-1 flex flex-wrap items-center gap-2"><FlaskIcon size={18} /> Hands-on Cloud Sandbox</h2>
          <p className="text-xs text-bleepx-text-secondary mb-4">
            Use the simulated AWS console below to complete each mission step. No real AWS account is required.
          </p>
          <CloudSandbox
            mission={mission}
            onComplete={() => setSandboxDone(true)}
            initialState={mission.preset === 'bleepxbank' ? createBleepxBankScenario() : undefined}
          />
        </div>
      )}

      {/* Design-led missions with no concepts: simple review confirmation */}
      {!isQuiz && !isScenario && learnList.length === 0 && !isDone && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <label className="flex flex-wrap items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-1 w-4 h-4 accent-sky-600" />
            <span className="text-sm text-bleepx-text">I have studied the architecture and the starter code above and understand how the pieces fit together.</span>
          </label>
        </div>
      )}

      {/* Cross-verse navigation */}
      <CrossVerseNav path={`/cloud/${p}/${slug}`} currentVerse="cloud" />

      {/* Complete + Export */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-3">
        {!isDone ? (
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="w-full px-5 py-3 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            {canComplete
              ? <span className="inline-flex flex-wrap items-center gap-1"><CheckBadge size={14} className="text-white" /> Complete Mission (+{tier * 10} pts)</span>
              : isQuiz
                ? learnList.length > 0 && !allUnderstood
                  ? 'Work through every concept to continue'
                  : 'Pass the quiz to complete'
                : !allUnderstood && learnList.length > 0
                  ? 'Work through every concept to continue'
                  : !kcPassed
                    ? 'Pass the knowledge check to complete'
                    : 'Confirm your review to complete'}
          </button>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-sm font-semibold text-emerald-600 flex flex-wrap items-center justify-center gap-1"><TrophyIcon size={16} className="text-emerald-600" /> Mission complete — nice work, human.</div>
            {nextSlug && (
              <Link href={`/cloud/${p}/${nextSlug}`}>
                <button className="px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors">
                  Next Mission →
                </button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {prevSlug ? (
          <Link href={`/cloud/${p}/${prevSlug}`} className="text-sm text-sky-600 hover:underline font-medium">← Previous</Link>
        ) : <span />}
        <Link href={`/cloud/${p}`} className="text-sm text-bleepx-text-secondary hover:underline">All {meta.short} missions</Link>
        {nextSlug ? (
          <Link href={`/cloud/${p}/${nextSlug}`} className="text-sm text-sky-600 hover:underline font-medium">Next →</Link>
        ) : <span />}
      </div>

      <AchievementNotification />
      <GateComponent />
    </main>
  );
}
