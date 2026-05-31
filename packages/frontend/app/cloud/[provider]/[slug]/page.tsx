'use client';

import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import AchievementNotification from '@/components/AchievementNotification';
import { useProgress } from '@/lib/useProgress';
import { getGitHubUser } from '@/lib/authClient';
import { pushCloudMissionToGitHub } from '@/lib/githubPush';
import { playBleep } from '@/lib/audio';
import {
  CLOUD_PROVIDER_META,
  getMissions,
  getMission,
  getMissionSlugs,
  isCloudProvider,
  cloudMissionId,
  CLOUD_LEVEL_TIER,
  type CloudProvider,
} from '@/lib/cloud';
import { cloudTrials } from '@/lib/cloud/trials';
import { iacTemplate } from '@/lib/cloud/templates';

export default function CloudMissionPage() {
  const params = useParams<{ provider: string; slug: string }>();
  const { provider, slug } = params;
  const { completed, markComplete } = useProgress();

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

  // Quiz state (for quiz-type missions)
  const quizQuestions = useMemo(() => {
    if (mission.labType !== 'quiz') return [];
    const pool = cloudTrials.filter((q) => q.provider === p || q.provider === 'multi');
    return pool.length ? pool.slice(0, Math.min(5, pool.length)) : cloudTrials.slice(0, 5);
  }, [mission.labType, p]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const quizScore = quizQuestions.filter((q) => answers[q.id] === q.answer).length;
  const quizPassed = quizQuestions.length > 0 && quizScore / quizQuestions.length >= 0.6;

  // Diagram/IaC checklist
  const checklist = useMemo(() => mission.skills.map((s, i) => ({ id: `${s}-${i}`, label: s })), [mission.skills]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const allChecked = checklist.length > 0 && checked.size >= checklist.length;

  // GitHub export
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ success: boolean; repoUrl?: string; error?: string } | null>(null);

  const handleComplete = useCallback(() => {
    if (isDone) return;
    markComplete(missionCaseId, tier);
    playBleep();
  }, [isDone, markComplete, missionCaseId, tier]);

  const canComplete = mission.labType === 'quiz' ? quizPassed : allChecked;

  const template = mission.labType === 'iac' ? iacTemplate(p, mission) : null;

  const handlePush = useCallback(async () => {
    setPushing(true);
    setPushResult(null);
    const result = await pushCloudMissionToGitHub(
      p,
      mission,
      meta.name,
      template?.code || null,
      (msg) => setPushMsg(msg),
    );
    setPushResult(result);
    setPushing(false);
    setPushMsg(null);
  }, [p, mission, meta.name, template]);

  const ghUser = typeof window !== 'undefined' ? getGitHubUser() : null;

  return (
    <main className="max-w-3xl mx-auto px-2 md:px-4 py-4 space-y-5 bg-bleepx-bg min-h-screen pb-12">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <Link href={`/cloud/${p}`} className="hover:underline">{meta.short}</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray truncate">{mission.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-xl shadow-md`}>{meta.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide font-bold text-bleepx-text-secondary">{mission.section}</span>
              {isDone && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✓ COMPLETED</span>}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-bleepx-text mt-0.5">{mission.title}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary">{mission.level}</span>
              <span className="text-amber-400 text-xs">{'⭐'.repeat(mission.stars)}</span>
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
        <h2 className="text-base font-bold text-bleepx-text mb-2">📋 Mission Briefing</h2>
        <div className="text-sm text-bleepx-text-secondary leading-relaxed whitespace-pre-line">{mission.description}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mission.skills.map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">{s}</span>
          ))}
        </div>
      </div>

      {/* Lab area */}
      {mission.labType === 'quiz' ? (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-bleepx-text mb-1">📝 {mission.isBonus ? 'Exam Simulator' : 'Knowledge Check'}</h2>
          <p className="text-xs text-bleepx-text-secondary mb-4">Answer at least 60% correctly to complete this mission.</p>
          <div className="space-y-4">
            {quizQuestions.map((q, qi) => (
              <div key={q.id} className="border border-bleepx-border rounded-lg p-3">
                <p className="text-sm font-medium text-bleepx-text mb-2">{qi + 1}. {q.question}</p>
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
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
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
                {quizSubmitted && <p className="text-xs text-bleepx-text-secondary mt-2 italic">{q.explanation}</p>}
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
                Score: {quizScore}/{quizQuestions.length} — {quizPassed ? '✓ Passed!' : 'Try again (need 60%)'}
              </p>
              {!quizPassed && (
                <button onClick={() => { setQuizSubmitted(false); setAnswers({}); }} className="mt-2 text-sm text-sky-600 hover:underline">Retry</button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-bleepx-text mb-1">
            {mission.labType === 'iac' ? '⚙️ Build It: Infrastructure as Code' : '🗺️ Design It: Architecture Checklist'}
          </h2>
          <p className="text-xs text-bleepx-text-secondary mb-4">
            {mission.labType === 'iac'
              ? 'Study the starter template, then check off each concept as you understand and implement it.'
              : 'Work through each design concept. Check it off once you can explain and justify it.'}
          </p>

          {template && (
            <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre mb-4">{template.code}</pre>
          )}

          <div className="space-y-2">
            {checklist.map((c) => {
              const on = checked.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setChecked((prev) => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                  className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg border transition-colors ${on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-bleepx-border hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0 ${on ? 'bg-emerald-500 text-white' : 'border border-gray-300 dark:border-gray-600'}`}>{on ? '✓' : ''}</span>
                  <span className={`text-sm font-mono ${on ? 'text-emerald-700 dark:text-emerald-300' : 'text-bleepx-text'}`}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Complete + Export */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-3">
        {!isDone ? (
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="w-full px-5 py-3 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            {canComplete ? `✓ Complete Mission (+${tier * 10} pts)` : mission.labType === 'quiz' ? 'Pass the quiz to complete' : 'Check off all concepts to complete'}
          </button>
        ) : (
          <div className="text-center text-sm font-semibold text-emerald-600">🎉 Mission complete — nice work, human.</div>
        )}

        {/* GitHub export */}
        <div className="pt-3 border-t border-bleepx-border">
          <h3 className="text-sm font-bold text-bleepx-text mb-1">Export to GitHub</h3>
          <p className="text-xs text-bleepx-text-secondary mb-2">Push a mission README{template ? ' + IaC template' : ''} to your <code>cloud-portfolio</code> repo.</p>
          {ghUser ? (
            <button onClick={handlePush} disabled={pushing} className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
              {pushing ? pushMsg || 'Pushing...' : '⬆ Push to GitHub'}
            </button>
          ) : (
            <Link href="/profile" className="text-sm text-sky-600 hover:underline">Sign in on your profile to enable GitHub export →</Link>
          )}
          {pushResult?.success && (
            <p className="mt-2 text-sm text-emerald-600">✅ Pushed! <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">{pushResult.repoUrl}</a></p>
          )}
          {pushResult?.error && <p className="mt-2 text-sm text-red-600">❌ {pushResult.error}</p>}
        </div>
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between gap-3">
        {prevSlug ? (
          <Link href={`/cloud/${p}/${prevSlug}`} className="text-sm text-sky-600 hover:underline font-medium">← Previous</Link>
        ) : <span />}
        <Link href={`/cloud/${p}`} className="text-sm text-bleepx-text-secondary hover:underline">All {meta.short} missions</Link>
        {nextSlug ? (
          <Link href={`/cloud/${p}/${nextSlug}`} className="text-sm text-sky-600 hover:underline font-medium">Next →</Link>
        ) : <span />}
      </div>

      <AchievementNotification />
    </main>
  );
}
