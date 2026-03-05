'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BleepxHead, BleepxTrophy, BleepxFace, BleepxGhost } from '@/components/BleepxIcons';
import { SKILL_QUESTIONS, GENERIC_QUESTIONS, type QuizQuestion } from '@/components/TrialQuiz';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrialInfo {
  id: string;
  name: string;
  skills: string[];
}

interface MasterQuestion extends QuizQuestion {
  skill: string;
  relatedTrials: { id: string; name: string }[];
}

interface MasterQuizProps {
  trials: TrialInfo[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const POINTS_PER_CORRECT = 3;
const PERFECT_BONUS = 10;
const REDIRECT_SECONDS = 6;

// ─── Build master question pool ─────────────────────────────────────────────

function buildMasterPool(trials: TrialInfo[]): MasterQuestion[] {
  // Map skill → trials that use it
  const skillToTrials: Record<string, { id: string; name: string }[]> = {};
  for (const t of trials) {
    for (const s of t.skills) {
      const key = s.toLowerCase();
      if (!skillToTrials[key]) skillToTrials[key] = [];
      if (!skillToTrials[key].find((x) => x.id === t.id)) {
        skillToTrials[key].push({ id: t.id, name: t.name });
      }
    }
  }

  const pool: MasterQuestion[] = [];
  const seen = new Set<string>();

  // Add all skill questions
  for (const [skill, questions] of Object.entries(SKILL_QUESTIONS)) {
    for (const q of questions) {
      if (!seen.has(q.question)) {
        seen.add(q.question);
        pool.push({
          ...q,
          skill,
          relatedTrials: skillToTrials[skill] || [],
        });
      }
    }
  }

  // Add generic questions
  for (const q of GENERIC_QUESTIONS) {
    if (!seen.has(q.question)) {
      seen.add(q.question);
      pool.push({
        ...q,
        skill: 'general',
        relatedTrials: [],
      });
    }
  }

  // Shuffle
  return pool.sort(() => Math.random() - 0.5);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MasterQuiz({ trials }: MasterQuizProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [redirectTarget, setRedirectTarget] = useState<{ id: string; name: string } | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Build pool on mount
  useEffect(() => {
    setQuestions(buildMasterPool(trials));
  }, [trials]);

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  // Countdown effect
  useEffect(() => {
    if (countdown > 0 && redirectTarget) {
      countdownRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
    } else if (countdown === 0 && redirectTarget) {
      router.push(`/cases/trials/${redirectTarget.id}`);
    }
  }, [countdown, redirectTarget, router]);

  const cancelRedirect = useCallback(() => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setCountdown(0);
    setRedirectTarget(null);
  }, []);

  const handleAnswer = useCallback(() => {
    if (!currentQ) return;
    const userAnswer = currentQ.type === 'multiple_choice' ? selected : textInput.trim();
    if (!userAnswer) return;

    const isCorrect = currentQ.type === 'fill_blank'
      ? userAnswer.toUpperCase() === currentQ.answer.toUpperCase()
      : userAnswer === currentQ.answer;

    setCorrect(isCorrect);
    setAnswered(true);
    if (isCorrect) setScore((s) => s + POINTS_PER_CORRECT);

    // Start redirect countdown if there's a related trial
    if (currentQ.relatedTrials.length > 0) {
      const randomTrial = currentQ.relatedTrials[Math.floor(Math.random() * currentQ.relatedTrials.length)];
      setRedirectTarget(randomTrial);
      setCountdown(REDIRECT_SECONDS);
    }
  }, [currentQ, selected, textInput]);

  const handleNext = useCallback(() => {
    cancelRedirect();

    if (currentIdx + 1 >= totalQuestions) {
      const finalScore = score + (score === totalQuestions * POINTS_PER_CORRECT ? PERFECT_BONUS : 0);
      setScore(finalScore);
      setFinished(true);

      // Award bonus points
      try {
        const currentPoints = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
        localStorage.setItem('bleepxPoints', (currentPoints + finalScore).toString());
        localStorage.setItem('bleepx_master_quiz', JSON.stringify({
          score: finalScore,
          total: totalQuestions,
          ts: Date.now(),
        }));
        window.dispatchEvent(new Event('storage'));
      } catch { /* ignore */ }
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setTextInput('');
      setAnswered(false);
      setCorrect(false);
      setRedirectTarget(null);
    }
  }, [currentIdx, totalQuestions, score, cancelRedirect]);

  const handleTryTrial = useCallback(() => {
    if (redirectTarget) {
      cancelRedirect();
      router.push(`/cases/trials/${redirectTarget.id}`);
    }
  }, [redirectTarget, cancelRedirect, router]);

  const handleRestart = useCallback(() => {
    setQuestions(buildMasterPool(trials));
    setCurrentIdx(0);
    setSelected(null);
    setTextInput('');
    setAnswered(false);
    setCorrect(false);
    setScore(0);
    setFinished(false);
    setRedirectTarget(null);
    setCountdown(0);
  }, [trials]);

  const progress = totalQuestions > 0 ? ((currentIdx + (answered ? 1 : 0)) / totalQuestions) * 100 : 0;

  // ─── Loading ────────────────────────────────────────────────────────────

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse flex items-center gap-2">
          <img src="/bleepx-icon.png" alt="Bleepx" className="h-8 w-8" />
          <span className="text-bleepx-text-secondary">Loading master quiz...</span>
        </div>
      </div>
    );
  }

  // ─── Finished ───────────────────────────────────────────────────────────

  if (finished) {
    const maxScore = totalQuestions * POINTS_PER_CORRECT + PERFECT_BONUS;
    const isPerfect = score >= maxScore;
    const pct = Math.round((score / maxScore) * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-bleepx-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            {isPerfect ? <BleepxTrophy size={64} /> : <BleepxHead size={64} />}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-bleepx-gray mb-2">
            {isPerfect ? 'SQL Master!' : score > totalQuestions * POINTS_PER_CORRECT * 0.7 ? 'Great Job!' : score > 0 ? 'Quiz Complete!' : 'Keep Practicing!'}
          </h2>
          <p className="text-lg text-bleepx-text-secondary mb-1">Master Quiz — All Skills</p>

          <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-bleepx-blue/10 to-indigo-500/10 border border-bleepx-blue/20">
            <div className="text-4xl font-bold text-bleepx-blue mb-1">+{score} pts</div>
            <p className="text-sm text-bleepx-text-secondary">
              {score}/{maxScore} possible ({pct}%) — {totalQuestions} questions
              {isPerfect && <span className="ml-1 text-yellow-500">✨ Perfect Bonus!</span>}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-bleepx-blue/5 transition-colors"
            >
              🔄 Retake
            </button>
            <Link href="/cases/trials">
              <button className="px-5 py-2.5 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-bleepx-blue/90 transition-colors shadow-sm">
                ← All Trials
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Question ────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BleepxFace size={24} />
          <h2 className="text-lg font-bold text-bleepx-gray">Master Quiz</h2>
        </div>
        <span className="text-sm text-bleepx-text-secondary font-medium">
          {currentIdx + 1} / {totalQuestions}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-bleepx-white rounded-2xl shadow-xl p-5 sm:p-8">
        {/* Skill tag */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium uppercase tracking-wide">
            {currentQ.skill.replace(/_/g, ' ')}
          </span>
          {currentQ.relatedTrials.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary">
              {currentQ.relatedTrials.length} trial{currentQ.relatedTrials.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Question */}
        <h3 className="text-lg sm:text-xl font-semibold text-bleepx-gray mb-5 leading-relaxed">
          {currentQ.question}
        </h3>

        {/* Answer area */}
        {currentQ.type === 'multiple_choice' ? (
          <div className="space-y-3">
            {currentQ.options?.map((opt) => {
              const isSelected = selected === opt;
              const isAnswer = opt === currentQ.answer;
              let classes = 'w-full text-left p-3.5 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all duration-200 ';

              if (answered) {
                if (isAnswer) {
                  classes += 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 ring-2 ring-green-400';
                } else if (isSelected && !isAnswer) {
                  classes += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                } else {
                  classes += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60';
                }
              } else if (isSelected) {
                classes += 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400/30';
              } else {
                classes += 'border-gray-200 dark:border-gray-700 text-bleepx-gray hover:border-indigo-400/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer';
              }

              return (
                <button
                  key={opt}
                  onClick={() => !answered && setSelected(opt)}
                  disabled={answered}
                  className={classes}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="relative">
              <input
                type="text"
                value={textInput}
                onChange={(e) => !answered && setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !answered && handleAnswer()}
                disabled={answered}
                placeholder="Type your answer..."
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-mono font-medium transition-all duration-200 bg-transparent outline-none ${
                  answered
                    ? correct
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 text-bleepx-gray focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400/30'
                }`}
              />
              {answered && !correct && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                  Correct answer: <code className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-800/40 font-bold">{currentQ.answer}</code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explanation */}
        {answered && (
          <div className={`mt-5 p-4 rounded-xl text-sm leading-relaxed ${
            correct
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
          }`}>
            <strong>{correct ? '✅ Correct!' : '❌ Not quite.'}</strong>{' '}
            {currentQ.explanation}
            {correct && <span className="ml-1 font-bold text-indigo-600 dark:text-indigo-400">+{POINTS_PER_CORRECT} pts</span>}
          </div>
        )}

        {/* Auto-redirect banner */}
        {answered && redirectTarget && countdown > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <BleepxGhost size={20} />
              <span className="text-sm text-indigo-800 dark:text-indigo-200 truncate">
                Redirecting to <strong>{redirectTarget.name}</strong> in {countdown}s...
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleTryTrial}
                className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                Go Now →
              </button>
              <button
                onClick={() => { cancelRedirect(); }}
                className="px-2 py-1 rounded-full text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/30 transition-colors"
              >
                Stay
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-bleepx-text-secondary">
            Score: <span className="font-bold text-indigo-600 dark:text-indigo-400">{score} pts</span>
          </div>
          {!answered ? (
            <button
              onClick={handleAnswer}
              disabled={currentQ.type === 'multiple_choice' ? !selected : !textInput.trim()}
              className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
            >
              {currentIdx + 1 >= totalQuestions ? 'See Results' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
