'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import AchievementNotification from '@/components/AchievementNotification';
import { useProgress } from '@/lib/useProgress';
import { playBleep } from '@/lib/audio';
import { cloudTrials, TRIAL_PROVIDERS, type CloudTrialQuestion } from '@/lib/cloud/trials';
import { CLOUD_PROVIDER_META } from '@/lib/cloud';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const providerLabel = (p: string) =>
  p === 'multi' ? '🌐 Multi-Cloud' : `${CLOUD_PROVIDER_META[p as keyof typeof CLOUD_PROVIDER_META]?.icon || ''} ${CLOUD_PROVIDER_META[p as keyof typeof CLOUD_PROVIDER_META]?.short || p}`;

export default function CloudTrialsPage() {
  const { markComplete, completed } = useProgress();
  const [filter, setFilter] = useState<string>('all');
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<CloudTrialQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const pool = useMemo(
    () => (filter === 'all' ? cloudTrials : cloudTrials.filter((q) => q.provider === filter)),
    [filter],
  );

  const start = () => {
    // When "All" is selected, ask all questions. Otherwise limit to 10.
    const qs = shuffle(pool).slice(0, filter === 'all' ? pool.length : Math.min(10, pool.length));
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
    setStarted(true);
    setShowHint(false);
  };

  const submit = () => {
    if (!selected) return;
    setRevealed(true);
    if (selected === questions[current].answer) {
      setScore((s) => s + 1);
      playBleep();
    }
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
      // Award points for a passing run (>=70%), once per filter scope.
      const pct = (score + (selected === questions[current].answer ? 0 : 0)) / questions.length;
      if (pct >= 0.7) {
        const id = `cloud_trial_${filter}`;
        if (!completed.has(id)) markComplete(id, 2);
      }
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
      setShowHint(false);
    }
  };

  const q = questions[current];
  const finalPct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <main className="max-w-2xl mx-auto px-2 md:px-4 py-4 space-y-5 bg-bleepx-bg min-h-screen pb-12">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Trials Arena</span>
      </nav>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 p-6 text-white">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold">⚡ Trials Arena</h1>
          <p className="text-white/85 text-sm mt-1">Rapid-fire scenario questions across every cloud track. Score 70%+ to earn points.</p>
        </div>
      </div>

      {!started ? (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-bleepx-text mb-2">Pick a track</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                🎲 All ({cloudTrials.length})
              </button>
              {TRIAL_PROVIDERS.map((p) => {
                const count = cloudTrials.filter((q) => q.provider === p).length;
                if (!count) return null;
                return (
                  <button key={p} onClick={() => setFilter(p)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === p ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    {providerLabel(p)} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={start} disabled={!pool.length} className="w-full px-5 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50">
            Start Trial ({filter === 'all' ? pool.length : Math.min(10, pool.length)} questions)
          </button>
        </div>
      ) : finished ? (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-6 shadow-sm text-center space-y-3">
          <div className="text-4xl">{finalPct >= 70 ? '🏆' : '💪'}</div>
          <h2 className="text-xl font-bold text-bleepx-text">{score}/{questions.length} — {finalPct}%</h2>
          <p className="text-sm text-bleepx-text-secondary">
            {finalPct >= 70 ? '*bleep* Certified-ready performance, human. +20 pts.' : 'Solid effort. Review the guide and run it back.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={start} className="px-5 py-2 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors">Run Again</button>
            <button onClick={() => setStarted(false)} className="px-5 py-2 rounded-full border border-bleepx-border text-bleepx-text text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Change Track</button>
          </div>
        </div>
      ) : (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs text-bleepx-text-secondary">
            <span>Question {current + 1} / {questions.length}</span>
            <span className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{providerLabel(q.provider)}</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 capitalize">{q.difficulty}</span>
              {q.examLevel !== 'None' && (
                <span className={`px-2 py-0.5 rounded-full ${
                  q.examLevel === 'Professional' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                  q.examLevel === 'Associate' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  q.examLevel === 'Specialty' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                  'bg-gray-100 dark:bg-gray-800'
                }`}>{q.examLevel}</span>
              )}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${((current) / questions.length) * 100}%` }} />
          </div>
          <p className="text-base font-medium text-bleepx-text">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const isSel = selected === opt;
              const showCorrect = revealed && opt === q.answer;
              const showWrong = revealed && isSel && opt !== q.answer;
              return (
                <button
                  key={opt}
                  disabled={revealed}
                  onClick={() => setSelected(opt)}
                  className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-colors ${
                    showCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : showWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                    : isSel ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                    : 'border-bleepx-border text-bleepx-text hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {revealed && <p className="text-xs text-bleepx-text-secondary italic bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{q.explanation}</p>}
          {!revealed && q.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
            >
              {showHint ? 'Hide Hint' : '💡 Need a hint?'}
            </button>
          )}
          {showHint && q.hint && !revealed && (
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              {q.hint}
            </p>
          )}
          {!revealed ? (
            <button onClick={submit} disabled={!selected} className="w-full px-5 py-2.5 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50">Submit</button>
          ) : (
            <button onClick={next} className="w-full px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-sm font-bold hover:opacity-90 transition-opacity">
              {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
            </button>
          )}
        </div>
      )}

      <AchievementNotification />
    </main>
  );
}
