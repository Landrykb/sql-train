/**
 * Client-side duel-attempt recording (Duel Scoring v1).
 *
 * Fire-and-forget: recording must NEVER break play. Every call is wrapped
 * and swallowed — if the scoring API is offline, the game continues and
 * the run simply isn't on the scorecard. Mirrors the brain-result
 * reporting pattern in `lib/arena/byok.ts`.
 *
 * Only tasks in DUEL_SET_V1 are recorded. The subject for in-browser play
 * is the human: the signed-in account uid when there is one
 * (`bleepx_progress_owner`), otherwise a persistent per-browser guest id —
 * human baselines accumulate from day one, per the spec's baseline-first
 * rule.
 */
import { duelTaskById, DUEL_SET_VERSION } from './tasks';
import { track, Events } from '@/lib/analytics';

export interface DuelSubject {
  type: 'human' | 'agent';
  id: string;
  model?: string;
  version?: string;
}

const GUEST_SUBJECT_KEY = 'bleepx_duel_subject';

export function getHumanSubject(): DuelSubject {
  try {
    const owner = localStorage.getItem('bleepx_progress_owner');
    if (owner) return { type: 'human', id: owner };
    let gid = localStorage.getItem(GUEST_SUBJECT_KEY);
    if (!gid) {
      gid = `guest-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(GUEST_SUBJECT_KEY, gid);
    }
    return { type: 'human', id: gid };
  } catch {
    return { type: 'human', id: 'guest-unknown' };
  }
}

export interface DuelAttemptInput {
  task_id: string;
  subject?: DuelSubject;
  /** Per kind: SQL { query, rows } · Python { code } · Cloud { actions: string[] } */
  submission: Record<string, unknown>;
  runtime_ms?: number;
  status?: 'completed' | 'error' | 'timeout' | 'abandoned';
  /** Python/Cloud only — SQL verdicts are always recomputed server-side. */
  verdict?: Record<string, unknown>;
  cost?: { tokens?: number; usd?: number } | null;
  match_id?: string;
  team_role?: string;
}

export function recordDuelAttempt(input: DuelAttemptInput): void {
  try {
    const task = duelTaskById(input.task_id);
    if (!task) return; // not a duel-set task — nothing to record
    track(Events.DUEL_ATTEMPT, { task_id: task.task_id, kind: task.kind, set: DUEL_SET_VERSION });
    fetch('/api/duels/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: input.subject ?? getHumanSubject(),
        task_id: input.task_id,
        submission: input.submission,
        runtime_ms: input.runtime_ms,
        status: input.status ?? 'completed',
        verdict: input.verdict,
        cost: input.cost ?? undefined,
        match_id: input.match_id,
        team_role: input.team_role,
      }),
    }).catch(() => { /* scorecard offline — play continues */ });
  } catch { /* recording never breaks play */ }
}

/** Map an Arena Python round result to the spec's Python verdict shape. */
export function pythonVerdict(result: { correct: boolean | null; error?: string }): Record<string, unknown> {
  const correct = result.correct === true;
  const err = result.error?.trim();
  return {
    correct,
    failed_assertions: !correct && err ? [err.slice(0, 300)] : [],
    error_type: correct ? null : err && /assert/i.test(err) ? 'assertion' : err ? 'runtime' : 'unknown',
  };
}

/** Map an Arena Cloud round result to the spec's Cloud verdict shape. */
export function cloudVerdict(result: { correct: boolean | null; error?: string }): Record<string, unknown> {
  const correct = result.correct === true;
  const err = result.error?.trim();
  return {
    correct,
    unmet_state: !correct && err ? [err.slice(0, 300)] : [],
    error_type: correct ? null : 'state_mismatch',
  };
}
