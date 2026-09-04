'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { GoalIcon, FlaskIcon, BulbIcon, MapIcon, BrainIcon } from '@/components/AppIcons';

type Goal = 'sql' | 'python' | 'datascience' | 'machine-learning' | 'llm' | 'cloud' | 'saa' | 'carbon';
type Level = 'beginner' | 'intermediate' | 'advanced';
type Time = 'casual' | 'focused' | 'intensive';

const JOURNEY_STORAGE = 'bleepx-journey';

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: 'sql', label: 'SQL', desc: 'Query, join, aggregate, window functions' },
  { id: 'python', label: 'Python', desc: 'Pandas, plotting, statistics' },
  { id: 'datascience', label: 'Data Science', desc: 'EDA, visualisation, experiments' },
  { id: 'machine-learning', label: 'Machine Learning', desc: 'Classification, regression, evaluation' },
  { id: 'llm', label: 'LLM & AI', desc: 'Transformers, fine-tuning, Hugging Face' },
  { id: 'cloud', label: 'Cloud (AWS)', desc: 'S3, IAM, EC2, Lambda, RDS, VPC' },
  { id: 'saa', label: 'SAA Certification', desc: 'Solutions Architect – Associate' },
  { id: 'carbon', label: 'Carbon Credits', desc: 'Climate, regenerative ag, offset markets' },
];

interface Step {
  title: string;
  href: string;
  resource: string;
  hint: string;
  time: string;
}

const PATHS: Record<Goal, Step[]> = {
  sql: [
    { title: 'SQL Fundamentals', href: '/', resource: 'BleepxQuery', hint: 'Start with basics_select and basics filtering.', time: '1–2 weeks' },
    { title: 'Joins & Aggregations', href: '/cases/business', resource: 'Business cases', hint: 'Master JOIN, GROUP BY, HAVING, and CTEs.', time: '1–2 weeks' },
    { title: 'Window Functions', href: '/cases', resource: 'Advanced cases', hint: 'Use ROW_NUMBER, RANK, LEAD, LAG for ranking and trends.', time: '1 week' },
    { title: 'Capstone', href: '/cases/trials/master-quiz', resource: 'Master Quiz', hint: 'Test everything in the trials arena.', time: '3 days' },
  ],
  python: [
    { title: 'Python Basics & Pandas', href: '/lab/churn/churn_explore', resource: 'BleepxLab', hint: 'Load data, inspect columns, and summarise.', time: '1 week' },
    { title: 'Visualisation', href: '/lab/forecasting/forecast_explore', resource: 'Forecasting lab', hint: 'Create plots with matplotlib and interpret trends.', time: '1 week' },
    { title: 'Statistics & EDA', href: '/lab/fraud/fraud_explore', resource: 'Fraud lab', hint: 'Distributions, outliers, and class imbalance.', time: '1–2 weeks' },
  ],
  'datascience': [
    { title: 'EDA Workflow', href: '/lab/churn/churn_explore', resource: 'BleepxLab', hint: 'Always start with head(), describe(), and a pairplot.', time: '1 week' },
    { title: 'Feature Engineering', href: '/lab/transport/transport_features', resource: 'Transport lab', hint: 'Build meaningful features from raw columns.', time: '1–2 weeks' },
    { title: 'Model Evaluation', href: '/lab/fraud/fraud_evaluate', resource: 'Fraud lab', hint: 'Precision, recall, ROC — not just accuracy.', time: '2 weeks' },
  ],
  'machine-learning': [
    { title: 'Supervised Learning', href: '/lab/churn/churn_model', resource: 'Churn lab', hint: 'Logistic regression then Random Forest.', time: '2 weeks' },
    { title: 'Anomaly Detection', href: '/lab/fraud/fraud_anomaly', resource: 'Fraud lab', hint: 'Isolation Forest and Local Outlier Factor.', time: '1–2 weeks' },
    { title: 'Time Series', href: '/lab/forecasting/forecast_arima', resource: 'Forecasting lab', hint: 'ARIMA, Prophet, and trend/seasonality.', time: '2–3 weeks' },
    { title: 'Carbon ML', href: '/lab/carbon_credits/carbon_price_ml', resource: 'Carbon Credits lab', hint: 'Predict carbon credit price with regression.', time: '1 week' },
  ],
  llm: [
    { title: 'Text Data & Tokenization', href: '/lab/carbon_credits/carbon_offset', resource: 'BleepxLab', hint: 'Pandas for text is still step one.', time: '1 week' },
    { title: 'Hugging Face Datasets', href: 'https://huggingface.co/datasets', resource: 'Hugging Face', hint: 'Explore imdb, wikitext, and openai/summarize_from_feedback.', time: '1–2 weeks' },
    { title: 'Transformers 101', href: 'https://huggingface.co/docs/transformers/index', resource: 'Hugging Face docs', hint: 'Pipeline, AutoTokenizer, AutoModel — start with a pre-trained model.', time: '2–3 weeks' },
    { title: 'Build a Text Classifier', href: 'https://huggingface.co/spaces', resource: 'Hugging Face Spaces', hint: 'Fine-tune a small model and deploy a demo Space.', time: '2–4 weeks' },
  ],
  cloud: [
    { title: 'S3 & IAM', href: '/cloud/sandbox', resource: 'Cloud Sandbox', hint: 'Create buckets, manage policies, block public access.', time: '1 week' },
    { title: 'EC2, VPC, Security', href: '/cloud/sandbox', resource: 'Cloud Sandbox', hint: 'Launch instances, create subnets, tighten security groups.', time: '2 weeks' },
    { title: 'Lambda & DynamoDB', href: '/cloud/sandbox', resource: 'Cloud Sandbox', hint: 'Serverless compute and NoSQL with real event flow.', time: '1 week' },
    { title: 'RDS & Backups', href: '/cloud/sandbox', resource: 'Cloud Sandbox', hint: 'Create Multi-AZ DBs, snapshots, encryption.', time: '1–2 weeks' },
    { title: 'ETL Pipeline', href: '/cloud/pipelines', resource: 'Pipeline Canvas', hint: 'Extract → SQL → Python → S3 for real data.', time: '1 week' },
  ],
  saa: [
    { title: 'Cloud Foundations', href: '/cloud/sandbox', resource: 'Cloud Sandbox', hint: 'Master S3, IAM, EC2, VPC, Lambda, RDS.', time: '2–3 weeks' },
    { title: 'Security Architecture', href: '/cloud/aws/bleepx-bank-security-audit', resource: 'Security mission', hint: 'Least privilege, encryption, public access.', time: '1–2 weeks' },
    { title: 'Resilient Architecture', href: '/cloud/sandbox', resource: 'Cloud Sandbox', hint: 'Multi-AZ, S3 versioning, backups, ASG.', time: '2 weeks' },
    { title: 'SAA Master Plan', href: '/cloud/certifications', resource: 'Certifications page', hint: 'Map each SAA-C03 domain to hands-on exercises.', time: 'Ongoing' },
  ],
  carbon: [
    { title: 'AWD Rice', href: '/lab/carbon_credits/carbon_awd', resource: 'Carbon Credits lab', hint: 'Methane reduction and carbon credits from rice.', time: '1 week' },
    { title: 'Soil Carbon', href: '/lab/carbon_credits/carbon_soil', resource: 'Carbon Credits lab', hint: 'Regenerative agriculture and carbon stock.', time: '1 week' },
    { title: 'Offset Markets', href: '/lab/carbon_credits/carbon_offset', resource: 'Carbon Credits lab', hint: 'Methodology, vintage, price, utilization.', time: '1 week' },
    { title: 'Price ML', href: '/lab/carbon_credits/carbon_price_ml', resource: 'Carbon Credits lab', hint: 'Predict carbon credit price with ML.', time: '1–2 weeks' },
  ],
};

function buildPlan(goals: Goal[], level: Level, time: Time): { suggested: Goal[]; totalTime: string; steps: Step[] } {
  const ordered: Goal[] = ['sql', 'python', 'datascience', 'machine-learning', 'cloud', 'saa'];
  const suggested = ordered.filter((g) => goals.includes(g));
  // append any selected goals not in default order at the end
  goals.forEach((g) => { if (!suggested.includes(g)) suggested.push(g); });

  const allSteps = suggested.flatMap((g) => PATHS[g]);
  const totalTime = time === 'intensive' ? '2–3 months' : time === 'focused' ? '4–6 months' : '6–12 months';
  return { suggested, totalTime, steps: allSteps };
}

export default function JourneyPage() {
  const [level, setLevel] = useState<Level>('beginner');
  const [time, setTime] = useState<Time>('focused');
  const [selected, setSelected] = useState<Goal[]>([]);
  const [plan, setPlan] = useState<{ suggested: Goal[]; totalTime: string; steps: Step[] } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(JOURNEY_STORAGE);
      if (raw) {
        const saved = JSON.parse(raw);
        setLevel(saved.level || 'beginner');
        setTime(saved.time || 'focused');
        setSelected(saved.selected || []);
        setPlan(saved.plan ? saved.plan : null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(JOURNEY_STORAGE, JSON.stringify({ level, time, selected, plan }));
    } catch {}
  }, [level, time, selected, plan]);

  const toggleGoal = (goal: Goal) => {
    setSelected((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
    setPlan(null);
  };

  const generate = () => {
    if (selected.length === 0) return;
    const p = buildPlan(selected, level, time);
    setPlan(p);
  };

  const levels: { id: Level; label: string; hint: string }[] = [
    { id: 'beginner', label: 'Beginner', hint: 'New to data and cloud. Start from SQL + Python basics.' },
    { id: 'intermediate', label: 'Intermediate', hint: 'Comfortable with SQL/Python. Jump into ML or Cloud.' },
    { id: 'advanced', label: 'Advanced', hint: 'Experienced. Focus on SAA, LLMs, and carbon ML.' },
  ];

  const times: { id: Time; label: string; hint: string }[] = [
    { id: 'casual', label: 'Casual', hint: '~5 hours / week' },
    { id: 'focused', label: 'Focused', hint: '~10–15 hours / week' },
    { id: 'intensive', label: 'Intensive', hint: '~20+ hours / week' },
  ];

  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-20">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">My Journey</span>
      </nav>

      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 rounded-2xl p-6 sm:p-10 text-white">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 flex flex-wrap items-center gap-2 break-words"><MapIcon size={28} /> Bleepx Journey</h1>
        <p className="text-white/80 text-sm sm:text-lg max-w-2xl leading-relaxed">
          Tell Bleepx what you want to learn and how much time you have. We will build a personalized path across SQL, Python, data science, machine learning, AI/LLMs, cloud, and certifications — with hints and the right resources.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-lg font-bold text-bleepx-text mb-4">1. Your starting level</h2>
          <div className="space-y-2">
            {levels.map((l) => (
              <label key={l.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${level === l.id ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <input type="radio" name="level" value={l.id} checked={level === l.id} onChange={() => setLevel(l.id)} className="mt-1 w-4 h-4 text-sky-600" />
                <div>
                  <div className="font-bold text-sm text-bleepx-text">{l.label}</div>
                  <div className="text-xs text-bleepx-text-secondary">{l.hint}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h2 className="text-lg font-bold text-bleepx-text mb-4">2. Time commitment</h2>
          <div className="space-y-2">
            {times.map((t) => (
              <label key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${time === t.id ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <input type="radio" name="time" value={t.id} checked={time === t.id} onChange={() => setTime(t.id)} className="mt-1 w-4 h-4 text-sky-600" />
                <div>
                  <div className="font-bold text-sm text-bleepx-text">{t.label}</div>
                  <div className="text-xs text-bleepx-text-secondary">{t.hint}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-lg font-bold text-bleepx-text mb-4">3. What do you want to master?</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {GOALS.map((g) => {
            const active = selected.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                className={`p-3 rounded-xl border text-left transition-colors ${active ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <div className="mb-1 text-bleepx-text"><GoalIcon goal={g.id} size={20} /></div>
                <div className="font-bold text-sm text-bleepx-text break-words">{g.label}</div>
                <div className="text-[10px] text-bleepx-text-secondary break-words">{g.desc}</div>
              </button>
            );
          })}
        </div>
        <button onClick={generate} disabled={selected.length === 0} className="w-full sm:w-auto inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-50 transition-colors">
          <FlaskIcon size={18} /> Generate My Journey
        </button>
      </div>

      {plan && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-bleepx-text">Your Personalized Plan</h2>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold">Estimated: {plan.totalTime}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {plan.suggested.map((g) => {
              const meta = GOALS.find((x) => x.id === g)!;
              return <span key={g} className="text-xs px-2 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium inline-flex items-center gap-1"><GoalIcon goal={g} size={14} /> {meta.label}</span>;
            })}
          </div>
          <ol className="space-y-3">
            {plan.steps.map((step, i) => (
              <li key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-bleepx-text break-words">
                      <span className="text-sky-600 mr-2">{i + 1}.</span>
                      {step.title}
                    </div>
                    <div className="text-xs text-bleepx-text-secondary mt-0.5 inline-flex flex-wrap items-center gap-1"><BulbIcon size={14} /> <span className="break-words">{step.hint}</span></div>
                  </div>
                  <div className="text-right min-w-0">
                    <Link href={step.href} target={step.href.startsWith('http') ? '_blank' : undefined} rel={step.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="text-xs text-sky-600 hover:underline font-medium break-words">{step.resource} →</Link>
                    <div className="text-[10px] text-bleepx-text-secondary">{step.time}</div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h2 className="text-lg font-bold text-bleepx-text mb-3 flex flex-wrap items-center gap-2"><BrainIcon size={20} /> Bleepx Assistant Hints</h2>
        <ul className="text-sm text-bleepx-text-secondary space-y-2 list-disc pl-4">
          <li><strong>Start small.</strong> Pick one SQL case and one Python lab before taking on cloud or ML.</li>
          <li><strong>Do the sandbox scenarios.</strong> BleepxBank, BleepxRetail, and BleepxHealth are built to teach real AWS decisions.</li>
          <li><strong>Hugging Face for LLMs.</strong> Use <a href="https://huggingface.co/datasets" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">datasets</a> and <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">models</a> once you are comfortable with Python and transformers.</li>
          <li><strong>Cross-train.</strong> Data science projects use cloud storage; cloud architects must understand data pipelines.</li>
          <li><strong>Track progress.</strong> This page remembers your plan and the certifications page tracks SAA readiness.</li>
        </ul>
      </div>
    </main>
  );
}
