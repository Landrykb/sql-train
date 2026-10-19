'use client'

import { LAB_SKILL_QUESTIONS, LAB_GENERIC_QUESTIONS, type LabQuizQuestion } from '@/lib/lab/questions';
;

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BleepxHead, BleepxTrophy, BleepxFace } from '@/components/BleepxIcons';
import { RefreshIcon } from '@/components/AppIcons';
import { IconCheck, IconX, IconSparkles } from '@tabler/icons-react';
import { syncCurrentProgress } from '@/lib/progressSync';
import { useAuthGate } from '@/components/SignInGate';
import { track, Events } from '@/lib/analytics';

// ─── Question types ─────────────────────────────────────────────────────────



// ─── Build quiz ─────────────────────────────────────────────────────────────

function buildLabQuiz(skills: string[], count: number = 7): LabQuizQuestion[] {
  const skillPool: LabQuizQuestion[] = [];
  for (const skill of skills) {
    const questions = LAB_SKILL_QUESTIONS[skill.toLowerCase()];
    if (questions) skillPool.push(...questions);
  }
  skillPool.sort(() => Math.random() - 0.5);

  const seen = new Set<string>();
  const result: LabQuizQuestion[] = [];
  for (const q of skillPool) {
    if (!seen.has(q.question) && result.length < count) {
      seen.add(q.question);
      result.push(q);
    }
  }
  if (result.length < count) {
    const genericPool = [...LAB_GENERIC_QUESTIONS].sort(() => Math.random() - 0.5);
    for (const q of genericPool) {
      if (!seen.has(q.question) && result.length < count) {
        seen.add(q.question);
        result.push(q);
      }
    }
  }
  return result;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const POINTS_PER_CORRECT = 3;
const PERFECT_BONUS = 5;

// ─── Component ──────────────────────────────────────────────────────────────

interface LabQuizProps {
  quizId: string;
  quizName: string;
  skills: string[];
  backLink: string;
  backLabel: string;
  onBack?: () => void;
}

interface AnswerRecord {
  userAnswer: string;
  correct: boolean;
}

export default function LabQuiz({ quizId, quizName, skills, backLink, backLabel, onBack }: LabQuizProps) {
  const [questions, setQuestions] = useState<LabQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(AnswerRecord | null)[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousScore, setPreviousScore] = useState(0);
  const { requireAuth, GateComponent } = useAuthGate();

  const currentAnswer = answers[currentIdx] ?? null;
  const answered = currentAnswer !== null;
  const correct = currentAnswer?.correct ?? false;

  useEffect(() => {
    const key = `bleepx_lab_quiz_${quizId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAlreadyCompleted(true);
        setPreviousScore(data.score || 0);
      } catch { /* ignore */ }
    }
    const built = buildLabQuiz(skills);
    setQuestions(built);
    setAnswers(new Array(built.length).fill(null));
  }, [quizId, skills]);

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  const goToQuestion = useCallback((idx: number) => {
    setCurrentIdx(idx);
    const ans = answers[idx];
    if (ans) {
      setSelected(ans.userAnswer);
      setTextInput(ans.userAnswer);
    } else {
      setSelected(null);
      setTextInput('');
    }
  }, [answers]);

  const handleAnswer = useCallback(() => {
    if (!currentQ || answered) return;
    // Gate: require GitHub sign-in to submit answers
    if (!requireAuth('submit quiz answers')) return;
    if (currentIdx === 0) track(Events.QUIZ_STARTED, { quiz_id: quizId, kind: 'lab' });
    const userAnswer = currentQ.type === 'multiple_choice' ? selected : textInput.trim();
    if (!userAnswer) return;

    const isCorrect = currentQ.type === 'fill_blank'
      ? userAnswer.toLowerCase() === currentQ.answer.toLowerCase()
      : userAnswer === currentQ.answer;

    const newAnswers = [...answers];
    newAnswers[currentIdx] = { userAnswer, correct: isCorrect };
    setAnswers(newAnswers);
    if (isCorrect) setScore((s) => s + POINTS_PER_CORRECT);
  }, [currentQ, answered, selected, textInput, answers, currentIdx, requireAuth, quizId]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= totalQuestions) {
      const finalScore = score + (score === totalQuestions * POINTS_PER_CORRECT ? PERFECT_BONUS : 0);
      setScore(finalScore);
      setFinished(true);
      track(Events.QUIZ_COMPLETED, { quiz_type: 'lab', quiz_id: quizId, total_questions: totalQuestions, score: finalScore, max_score: totalQuestions * POINTS_PER_CORRECT + PERFECT_BONUS });
      try {
        const currentPoints = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
        localStorage.setItem('bleepxPoints', (currentPoints + finalScore).toString());
        localStorage.setItem(`bleepx_lab_quiz_${quizId}`, JSON.stringify({
          score: finalScore, total: totalQuestions, ts: Date.now(),
        }));
        window.dispatchEvent(new Event('storage'));
        syncCurrentProgress().catch(() => {});
      } catch { /* ignore */ }
    } else {
      goToQuestion(currentIdx + 1);
    }
  }, [currentIdx, totalQuestions, score, quizId, goToQuestion]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1);
  }, [currentIdx, goToQuestion]);

  const handleRetake = useCallback(() => {
    const built = buildLabQuiz(skills);
    setQuestions(built);
    setAnswers(new Array(built.length).fill(null));
    setCurrentIdx(0);
    setSelected(null);
    setTextInput('');
    setScore(0);
    setFinished(false);
    setAlreadyCompleted(false);
  }, [skills]);

  const answeredCount = answers.filter(a => a !== null).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse flex items-center gap-2">
          <span className="text-bleepx-text-secondary">Loading quiz...</span>
        </div>
      </div>
    );
  }

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
            {isPerfect ? 'Perfect Score!' : score > 0 ? 'Quiz Complete!' : 'Keep Practicing!'}
          </h2>
          <p className="text-lg text-bleepx-text-secondary mb-1">{quizName}</p>
          <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
            <div className="text-3xl sm:text-4xl font-bold text-teal-600 mb-1">+{score} pts</div>
            <p className="text-sm text-bleepx-text-secondary">
              {score}/{maxScore} possible points ({pct}%)
              {isPerfect && <span className="ml-1 text-yellow-500 inline-flex items-center gap-1"><IconSparkles size={14} /> Perfect Bonus!</span>}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button onClick={handleRetake} className="px-5 py-2.5 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 transition-colors">
              <RefreshIcon size={16} className="inline" /> Retake Quiz
            </button>
            {onBack ? (
              <button onClick={onBack} className="px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
                {backLabel}
              </button>
            ) : (
              <Link href={backLink}>
                <button className="px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
                  {backLabel}
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const previousBanner = alreadyCompleted && currentIdx === 0 && !answered ? (
    <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
      <IconCheck size={16} />
      <span>You scored <strong>+{previousScore} pts</strong> previously. Retake to earn more!</span>
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BleepxFace size={24} />
          <h2 className="text-lg font-bold text-bleepx-gray">Data Science Quiz</h2>
        </div>
        <span className="text-sm text-bleepx-text-secondary font-medium">{currentIdx + 1} / {totalQuestions}</span>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {previousBanner}

      <div className="bg-bleepx-white rounded-2xl shadow-xl p-5 sm:p-8">
        <div className="flex flex-wrap gap-2 mb-3">
          {skills.map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium uppercase tracking-wide">{s.replace(/_/g, ' ')}</span>
          ))}
          {answered && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {correct ? <span className="inline-flex items-center gap-1"><IconCheck size={12} /> Mastered</span> : <span className="inline-flex items-center gap-1"><IconX size={12} /> Review</span>}
            </span>
          )}
        </div>

        <h3 className="text-lg sm:text-xl font-semibold text-bleepx-gray mb-5 leading-relaxed">{currentQ.question}</h3>

        {currentQ.type === 'multiple_choice' ? (
          <div className="space-y-3">
            {currentQ.options?.map((opt) => {
              const isSelected = selected === opt;
              const isAnswer = opt === currentQ.answer;
              let classes = 'w-full text-left p-3.5 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all duration-200 break-words ';
              if (answered) {
                if (isAnswer) classes += 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 ring-2 ring-green-400';
                else if (isSelected && !isAnswer) classes += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                else classes += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60';
              } else if (isSelected) {
                classes += 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 ring-2 ring-teal-400/30';
              } else {
                classes += 'border-gray-200 dark:border-gray-700 text-bleepx-gray hover:border-teal-400/40 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 cursor-pointer';
              }
              return (
                <button key={opt} onClick={() => !answered && setSelected(opt)} disabled={answered} className={classes}>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={textInput}
              onChange={(e) => !answered && setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !answered && handleAnswer()}
              disabled={answered}
              placeholder="Type your answer..."
              className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-mono font-medium transition-all duration-200 bg-transparent outline-none ${
                answered
                  ? correct ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'border-gray-200 dark:border-gray-700 text-bleepx-gray focus:border-teal-500 focus:ring-2 focus:ring-teal-400/30'
              }`}
            />
            {answered && !correct && (
              <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                Correct answer: <code className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-800/40 font-bold">{currentQ.answer}</code>
              </div>
            )}
          </div>
        )}

        {answered && (
          <div className={`mt-5 p-4 rounded-xl text-sm leading-relaxed ${
            correct ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
          }`}>
            <strong className="inline-flex items-center gap-1">{correct ? <><IconCheck size={14} /> Correct!</> : <><IconX size={14} /> Not quite.</>}</strong>{' '}
            {currentQ.explanation}
            {correct && <span className="ml-1 font-bold text-teal-600">+{POINTS_PER_CORRECT} pts</span>}
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <button onClick={handlePrev} disabled={currentIdx === 0} className="px-4 py-2 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            ← Prev
          </button>
          <div className="text-sm text-bleepx-text-secondary">
            Score: <span className="font-bold text-teal-600">{score} pts</span>
          </div>
          {!answered ? (
            <button onClick={handleAnswer} disabled={currentQ.type === 'multiple_choice' ? !selected : !textInput.trim()} className="px-6 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Submit
            </button>
          ) : (
            <button onClick={handleNext} className="px-6 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">
              {currentIdx + 1 >= totalQuestions ? 'See Results' : 'Next →'}
            </button>
          )}
        </div>
      </div>
      <GateComponent />
    </div>
  );
}
