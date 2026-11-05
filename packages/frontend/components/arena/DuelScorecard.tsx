'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Trophy } from 'lucide-react';
import { DUEL_SET_V1 } from '@/lib/duels/tasks';

/**
 * Duel Scorecard — the public read surface for Duel Scoring v1.
 *
 * Shows what the scoring store actually holds: per-subject aggregates
 * from `duel_runs`, the human baseline for each task, and the most
 * recent runs. With zero runs it says so — no placeholder standings.
 */

interface SubjectCard {
  subject: { type: string; id: string; model?: string; version?: string };
  attempts: number;
  completed: number;
  passes: number;
  pass_rate: number | null;
  avg_runtime_ms: number | null;
  total_cost: { tokens: number; usd: number } | null;
  by_kind: Record<string, { attempts: number; completed: number; passes: number }>;
  tasks: Record<string, { attempts: number; completed: number; passes: number; pass_rate: number | null }>;
  last_run_at: string | null;
}

interface TaskAgg { attempts: number; completed: number; passes: number; pass_rate: number | null }

interface RecentRun {
  run_id: string;
  subject: { type: string; id: string };
  task_id: string;
  kind: string;
  status: string;
  correct: boolean | null;
  runtime_ms: number | null;
  verified_by: string;
  created_at: string;
}

interface ScorecardData {
  subjects: SubjectCard[];
  baselines: Record<string, TaskAgg>;
  runs: RecentRun[];
}

const KIND_LABEL: Record<string, string> = { sql: 'SQL', python: 'Python', cloud: 'Cloud' };

function fmtMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtPct(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

function shortId(id: string): string {
  return id.length > 22 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function DuelScorecard() {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/duels/scorecard', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('scorecard unavailable');
        const json = (await res.json()) as ScorecardData;
        if (!cancelled) {
          setData(json);
          setState('ready');
        }
      })
      .catch(() => { if (!cancelled) setState('offline'); });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return <p className="text-sm text-slate-400 font-bold">Loading scored runs…</p>;
  }

  if (state === 'offline' || !data) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-800/40 p-5 text-center">
        <p className="text-sm font-bold text-white">The scorecard is unreachable right now.</p>
        <p className="text-xs text-slate-400 mt-1">Scored runs are stored safely — this page just cannot read them at the moment. Try again in a bit.</p>
      </div>
    );
  }

  const taskName = (task_id: string) => DUEL_SET_V1.find((t) => t.task_id === task_id)?.domain ?? task_id;
  const hasRuns = data.runs.length > 0;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-5">
      {/* how scoring works — plain language, honest about verification */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
        <p className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-teal-300" /> How a score is earned
        </p>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Every run on the nine duel tasks — three SQL cases, three Python duels, three cloud missions — is
          recorded with its result, its time, and what it cost. SQL scores are recomputed on the server from
          the submitted results, so they cannot be claimed, only earned. Python and cloud scores are recorded
          from the platform&apos;s own checkers for now; a server-side runner for outside agents is the next step.
          Agent scores are always shown next to the human baseline on the same task.
        </p>
      </div>

      {!hasRuns ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6 text-center">
          <p className="text-sm font-bold text-white">No scored runs yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Play any of the nine duel tasks — a duel-set case in training, or a Python or cloud round in the
            Arena — and the first records will land here.
          </p>
        </div>
      ) : (
        <>
          {/* subjects */}
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Trophy size={13} className="text-amber-300" /> Scorecard
            </p>
            <div className="flex flex-col gap-2">
              {data.subjects.map((card) => (
                <div key={`${card.subject.type}:${card.subject.id}`} className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
                  <p className="text-sm font-bold text-white flex items-center justify-between gap-2">
                    <span className="truncate" title={card.subject.id}>
                      {card.subject.type === 'agent' ? (card.subject.model ?? card.subject.id) : `Player ${shortId(card.subject.id)}`}
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-700/70 text-[9px] font-bold text-slate-300 align-middle uppercase tracking-wider">
                        {card.subject.type === 'agent' ? 'Agent' : 'Human'}
                      </span>
                    </span>
                    <span className="shrink-0 text-teal-300">{fmtPct(card.pass_rate)} pass</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {card.attempts} run{card.attempts === 1 ? '' : 's'} · {card.passes} passed · avg {fmtMs(card.avg_runtime_ms)}
                    {card.total_cost ? ` · cost ${card.total_cost.tokens.toLocaleString()} tokens / $${card.total_cost.usd.toFixed(2)}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {Object.entries(card.by_kind).map(([kind, agg]) => (
                      <span key={kind} className="mr-3">{KIND_LABEL[kind] ?? kind}: {agg.passes}/{agg.attempts}</span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* human baselines */}
          {Object.keys(data.baselines).length > 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Human baseline — the bar every agent is measured against</p>
              <div className="flex flex-col gap-1">
                {DUEL_SET_V1.filter((t) => data.baselines[t.task_id]).map((t) => {
                  const b = data.baselines[t.task_id];
                  return (
                    <p key={t.task_id} className="text-[11px] text-slate-400 flex justify-between gap-2">
                      <span className="truncate">{t.domain} — <span className="text-slate-500">{t.task_id}</span></span>
                      <span className="shrink-0 font-bold text-slate-200">{fmtPct(b.pass_rate)} <span className="font-normal text-slate-500">({b.passes}/{b.completed})</span></span>
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* recent runs */}
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Latest runs</p>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 divide-y divide-slate-800">
              {data.runs.slice(0, 20).map((run) => (
                <div key={run.run_id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">
                      {taskName(run.task_id)} <span className="text-slate-500 font-normal">· {run.task_id}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {run.subject.type === 'agent' ? 'Agent' : 'Player'} {shortId(run.subject.id)} · {timeAgo(run.created_at)}
                      {run.verified_by === 'server_recompute' ? ' · server-checked' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-black ${run.correct === null ? 'text-slate-500' : run.correct ? 'text-teal-300' : 'text-rose-400'}`}>
                      {run.correct === null ? run.status.toUpperCase() : run.correct ? 'PASS' : 'MISS'}
                    </p>
                    <p className="text-[10px] text-slate-500">{fmtMs(run.runtime_ms)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
