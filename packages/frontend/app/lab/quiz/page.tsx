'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import AchievementNotification from '@/components/AchievementNotification';
import LabQuiz from '@/components/LabQuiz';
import { BrainIcon, TopicIcon, CheckBadge } from '@/components/AppIcons';

const QUIZ_TOPICS: { id: string; name: string; skills: string[]; color: string }[] = [
  { id: 'fundamentals', name: 'DS Fundamentals', skills: ['statistics', 'probability', 'data_analysis'], color: 'from-teal-500 to-teal-700' },
  { id: 'python', name: 'Python & Pandas', skills: ['python', 'data_analysis', 'visualization'], color: 'from-blue-500 to-blue-700' },
  { id: 'ml_basics', name: 'Machine Learning Basics', skills: ['machine_learning', 'evaluation', 'feature_engineering'], color: 'from-purple-500 to-purple-700' },
  { id: 'statistics', name: 'Statistics & Probability', skills: ['statistics', 'probability'], color: 'from-amber-500 to-amber-700' },
  { id: 'evaluation', name: 'Model Evaluation & Metrics', skills: ['evaluation', 'machine_learning'], color: 'from-red-500 to-red-700' },
  { id: 'feature_eng', name: 'Feature Engineering', skills: ['feature_engineering', 'data_analysis', 'python'], color: 'from-indigo-500 to-indigo-700' },
  { id: 'visualization', name: 'Data Visualization', skills: ['visualization', 'data_analysis'], color: 'from-pink-500 to-pink-700' },
  { id: 'clustering', name: 'Clustering & Unsupervised', skills: ['clustering', 'machine_learning', 'evaluation'], color: 'from-emerald-500 to-emerald-700' },
  { id: 'timeseries', name: 'Time Series Analysis', skills: ['time_series', 'statistics', 'machine_learning'], color: 'from-cyan-500 to-cyan-700' },
  { id: 'deep_learning', name: 'Deep Learning Concepts', skills: ['deep_learning', 'machine_learning', 'evaluation'], color: 'from-violet-500 to-violet-700' },
  { id: 'llm', name: 'LLMs & NLP', skills: ['llm', 'deep_learning'], color: 'from-fuchsia-500 to-fuchsia-700' },
  { id: 'aws_cloud', name: 'AWS & Cloud Practitioner', skills: ['aws', 'cloud'], color: 'from-orange-500 to-orange-700' },
  { id: 'mlops', name: 'MLOps & Deployment', skills: ['mlops', 'cloud', 'machine_learning'], color: 'from-rose-500 to-rose-700' },
  { id: 'master', name: 'Master DS Quiz', skills: ['statistics', 'probability', 'machine_learning', 'data_analysis', 'python', 'evaluation', 'feature_engineering', 'visualization', 'clustering', 'time_series', 'deep_learning', 'llm', 'aws', 'cloud', 'mlops'], color: 'from-gray-800 to-gray-900' },
];

export default function LabQuizPage() {
  const [activeTopic, setActiveTopic] = useState<typeof QUIZ_TOPICS[0] | null>(null);
  // Read best-scores after mount so server/client markup matches (avoids
  // React hydration error #418 caused by reading localStorage during render).
  const [bestScores, setBestScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const topic of QUIZ_TOPICS) {
      try {
        const raw = localStorage.getItem(`bleepx_lab_quiz_${topic.id}`);
        if (raw) next[topic.id] = JSON.parse(raw).score || 0;
      } catch { /* ignore */ }
    }
    setBestScores(next);
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-6 bg-bleepx-bg min-h-screen">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/lab" className="hover:underline">BleepxLab</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Quizzes</span>
      </nav>

      <div className="flex items-center gap-3">
        <BleepxLogo />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-bleepx-text flex items-center gap-2"><BrainIcon size={28} /> Data Science Quizzes</h1>
          <p className="text-xs sm:text-sm text-bleepx-text-secondary">
            Test your knowledge across statistics, probability, ML, Python, and more.
          </p>
        </div>
      </div>

      {!activeTopic ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUIZ_TOPICS.map((topic) => {
            const prevScore = bestScores[topic.id] || 0;
            return (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic)}
                className="group relative overflow-hidden bg-bleepx-white border border-bleepx-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-left"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${topic.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-bleepx-text"><TopicIcon topic={topic.id} size={24} /></span>
                    <h3 className="font-bold text-bleepx-text group-hover:text-teal-600 transition-colors">{topic.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {topic.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium">{s.replace(/_/g, ' ')}</span>
                    ))}
                    {topic.skills.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-bleepx-text-secondary">+{topic.skills.length - 3}</span>
                    )}
                  </div>
                  {prevScore > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium inline-flex items-center gap-1"><CheckBadge size={12} className="text-green-600 dark:text-green-400" /> Best: +{prevScore} pts</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setActiveTopic(null)}
            className="mb-4 text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
          >
            ← Back to Topics
          </button>
          <LabQuiz
            quizId={activeTopic.id}
            quizName={activeTopic.name}
            skills={activeTopic.skills}
            backLink="/lab/quiz"
            backLabel="← All Quizzes"
            onBack={() => setActiveTopic(null)}
          />
        </div>
      )}

      <AchievementNotification />
    </main>
  );
}
