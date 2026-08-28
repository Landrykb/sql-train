'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SAA_QUESTIONS, SAAExamDomain, scoreByDomain } from '@/lib/cloud/saaExam';
import { useProgress } from '@/lib/useProgress';

const DOMAIN_LABELS: Record<SAAExamDomain, string> = {
  secure: 'Design Secure Architectures',
  resilient: 'Design Resilient Architectures',
  'high-performing': 'Design High-Performing Architectures',
  'cost-optimized': 'Design Cost-Optimized Architectures',
};

const DOMAIN_LINKS: Record<SAAExamDomain, string> = {
  secure: '/cloud/aws/bleepx-bank-security-audit',
  resilient: '/cloud/sandbox',
  'high-performing': '/cloud/sandbox',
  'cost-optimized': '/cloud/sandbox',
};

const STORAGE_KEY = 'bleepx-saa-exam-progress';
const TIME_LIMIT_MINUTES = 30;
const TIME_LIMIT_MS = TIME_LIMIT_MINUTES * 60 * 1000;

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SaaPracticeExamPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const { points } = useProgress();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.answers) setAnswers(saved.answers);
      }
    } catch { /* ignore */ }
    setStartTime(new Date());
    setNow(new Date());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers }));
    } catch { /* ignore */ }
  }, [answers]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (startTime && now && !submitted) {
      const elapsed = now.getTime() - startTime.getTime();
      if (elapsed >= TIME_LIMIT_MS) {
        setSubmitted(true);
      }
    }
  }, [now, startTime, submitted]);

  const question = SAA_QUESTIONS[current];
  const score = useMemo(() => scoreByDomain(answers), [answers]);
  const total = SAA_QUESTIONS.length;
  const correct = useMemo(() => Object.values(score).reduce((a, d) => a + d.correct, 0), [score]);

  const select = (idx: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [question.id]: idx }));
  };

  const finish = () => setSubmitted(true);
  const reset = () => { setAnswers({}); setSubmitted(false); setCurrent(0); const t = new Date(); setStartTime(t); setNow(t); };

  const elapsed = startTime && now ? now.getTime() - startTime.getTime() : 0;
  const remaining = TIME_LIMIT_MS - elapsed;

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-12">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <Link href="/cloud/certifications" className="hover:underline">Certifications</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">SAA Practice Exam</span>
      </nav>

      <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 rounded-2xl p-6 sm:p-10 text-white">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">SAA-C03 Practice Exam</h1>
        <p className="text-white/80 text-sm sm:text-lg max-w-2xl leading-relaxed">
          {submitted ? 'Review your results and drill weak domains.' : 'Scenario-based questions across all 4 SAA domains.'}
        </p>
      </div>

      {!submitted ? (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase text-bleepx-text-secondary">Question {current + 1} of {total}</span>
            <span className={`text-xs font-bold uppercase ${remaining < 300000 ? 'text-rose-600' : 'text-bleepx-text-secondary'}`}>Time: {formatTime(remaining)}</span>
            <span className="text-xs font-bold uppercase text-bleepx-text-secondary">{DOMAIN_LABELS[question.domain]}</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-sky-600 transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
          </div>

          <div className="text-sm text-bleepx-text-secondary leading-relaxed bg-sky-50 dark:bg-sky-900/10 p-4 rounded-lg border border-sky-100 dark:border-sky-900/30">
            {question.scenario}
          </div>
          <h2 className="text-base font-bold text-bleepx-text">{question.question}</h2>

          <div className="space-y-2">
            {question.choices.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => select(idx)}
                className={`w-full text-left p-4 rounded-xl border text-sm transition-colors ${
                  answers[question.id] === idx
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-900 dark:text-sky-100'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-bleepx-text'
                }`}
              >
                <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                {choice}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-bold disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ← Prev
            </button>
            {current < total - 1 ? (
              <button
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                className="px-5 py-2.5 rounded-full bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={finish}
                className="px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                Submit Exam
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-bleepx-text mb-1">{correct}/{total} correct</h2>
            <p className="text-bleepx-text-secondary text-sm">Time used: {formatTime(elapsed)} of {TIME_LIMIT_MINUTES} minutes</p>
            <p className="text-bleepx-text-secondary text-sm">
              {correct >= Math.ceil(total * 0.72) ? 'Passing score! Keep going to make it solid.' : 'Below a typical passing score. Drill the weak domains below.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button onClick={reset} className="px-4 py-2 rounded-full bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 transition-colors">Retake</button>
              <Link href="/cloud/certifications" className="px-4 py-2 rounded-full border border-sky-600 text-sky-600 text-sm font-bold hover:bg-sky-50 transition-colors">Back to SAA Plan</Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {(Object.keys(score) as SAAExamDomain[]).map((d) => {
              const s = score[d];
              const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
              const weak = pct < 66;
              return (
                <div key={d} className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-bleepx-text">{DOMAIN_LABELS[d]}</h3>
                    <span className={`text-lg font-bold ${weak ? 'text-rose-600' : 'text-emerald-600'}`}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${weak ? 'bg-rose-500' : 'bg-emerald-500'} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-bleepx-text-secondary mb-3">{s.correct}/{s.total} correct</p>
                  {weak && (
                    <Link href={DOMAIN_LINKS[d]} className="text-xs px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 font-bold hover:underline">
                      Drill this domain →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-bleepx-text">Review</h3>
            {SAA_QUESTIONS.map((q, i) => {
              const chosen = answers[q.id];
              const isCorrect = chosen === q.correctIndex;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-bleepx-text-secondary">{i + 1}. {DOMAIN_LABELS[q.domain]}</span>
                      <p className="text-sm font-bold text-bleepx-text mt-1">{q.question}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                  </div>
                  <p className="text-sm text-bleepx-text-secondary mt-2 leading-relaxed">{q.explanation}</p>
                  <p className="text-xs text-bleepx-text-secondary mt-1">Your answer: {chosen !== undefined ? q.choices[chosen] : 'No answer'} | Correct: {q.choices[q.correctIndex]}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
