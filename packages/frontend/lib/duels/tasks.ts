/**
 * Duel task registry — the TaskSpec set for the first external-agent duels.
 *
 * Implements the frozen TaskSpec + Scoring Record spec (2026-11-01) for one
 * concrete duel set: DUEL_SET_V1. Every task is drawn from the shipped
 * curriculum — SQL cases in `cases/`, Python duels and Cloud missions in
 * `lib/arena/codeDuels.ts` — nothing here is invented content.
 *
 * The set is DATA, versioned as a whole (`DUEL_SET_VERSION`) and per task
 * (`version`). Scores are only comparable within the same task version.
 * Changing the set later means adding DUEL_SET_V2 — never editing V1 in
 * place, or old scores would silently change meaning.
 *
 * Verification levels (honest, per kind):
 *  - SQL: verdicts are recomputed on the server from submitted result rows
 *    against the case's expected rows (`verified_by: 'server_recompute'`).
 *  - Python / Cloud: v1 records the verdict of the platform's existing
 *    in-browser checkers (`verified_by: 'platform_checker'`). A server-side
 *    execution runner for external attempts is the named next improvement —
 *    until it exists, no Python/Cloud score claims server verification.
 */

export type DuelTaskKind = 'sql' | 'python' | 'cloud';

export type DuelChecker =
  | {
      type: 'result-set';
      /** Where the expected rows live — a reference, never the rows themselves. */
      expected_ref: string;
      ordered: boolean;
      compare_column_names: boolean;
      /** Numeric tolerance for the result-set comparison (spec §3a). */
      tolerance: number;
    }
  | { type: 'assert-script'; check_ref: string }
  | { type: 'state-validation'; check_ref: string };

export interface DuelTaskSpec {
  task_id: string;
  /** Spec/content version of this task. Scores compare only within a version. */
  version: string;
  kind: DuelTaskKind;
  /** Display domain as the curriculum names it, e.g. 'Finance Stocks'. */
  domain: string;
  /** Curriculum key: SQL case folder / cloud service / lab track. */
  domain_key: string;
  skills: string[];
  /** Curriculum difficulty tier where the curriculum has one (SQL cases). */
  tier: number | null;
  /** Instructions shown to the attempter. */
  prompt: string;
  /** Where the task content lives in the repo. */
  source: { type: 'case' | 'python-duel' | 'cloud-mission'; ref: string };
  checker: DuelChecker;
  /**
   * Attempt time budget. v1 records it as metadata only — enforcement
   * belongs to a runner, and no runner exists yet.
   */
  limits: { time_ms: number };
}

export const DUEL_SET_VERSION = 'duel-set-v1';

const SQL_TIME_MS = 10 * 60 * 1000;
const CODE_TIME_MS = 5 * 60 * 1000;

export const DUEL_SET_V1: DuelTaskSpec[] = [
  // ─── SQL — result-set checker, server-recomputed ─────────────────────────
  // Mid-tier (tier 3 of 7): real joins/aggregation, not the tier-1 select
  // cases and not capstones/hidden cases. Small expected sets keep the
  // submitted-rows payload (and the recompute) cheap.
  {
    task_id: 'fraud_joins',
    version: '1',
    kind: 'sql',
    domain: 'Finance Stocks',
    domain_key: 'finance',
    skills: ['joins', 'aggregation'],
    tier: 3,
    prompt: 'Join stocks and market index, flag transactions with high volatility, order by date',
    source: { type: 'case', ref: 'cases/finance/fraud_joins.yaml' },
    checker: {
      type: 'result-set',
      expected_ref: 'cases/finance/fraud_joins.yaml#expected',
      ordered: false,
      compare_column_names: false,
      tolerance: 0.01,
    },
    limits: { time_ms: SQL_TIME_MS },
  },
  {
    task_id: 'admission_trend',
    version: '1',
    kind: 'sql',
    domain: 'Healthcare Covid',
    domain_key: 'healthcare',
    skills: ['aggregation', 'date_functions'],
    tier: 3,
    prompt: 'Count admissions by month, order by month',
    source: { type: 'case', ref: 'cases/healthcare/admission_trend.yaml' },
    checker: {
      type: 'result-set',
      expected_ref: 'cases/healthcare/admission_trend.yaml#expected',
      ordered: false,
      compare_column_names: false,
      tolerance: 0.01,
    },
    limits: { time_ms: SQL_TIME_MS },
  },
  {
    task_id: 'user_joins',
    version: '1',
    kind: 'sql',
    domain: 'Social Twitter',
    domain_key: 'social',
    skills: ['joins', 'aggregation'],
    tier: 3,
    prompt: 'Count tweets per user, order by count',
    source: { type: 'case', ref: 'cases/social/user_joins.yaml' },
    checker: {
      type: 'result-set',
      expected_ref: 'cases/social/user_joins.yaml#expected',
      ordered: false,
      compare_column_names: false,
      tolerance: 0.01,
    },
    limits: { time_ms: SQL_TIME_MS },
  },

  // ─── Python — assert-script checker (platform checker in v1) ─────────────
  // Three distinct pandas skills from PYTHON_DUELS: groupby+sort, rolling
  // window, pivot. The duel format carries no per-task tier — tier is null
  // rather than invented.
  {
    task_id: 'py-top-products',
    version: '1',
    kind: 'python',
    domain: 'Lab — Python duels',
    domain_key: 'python-duels',
    skills: ['pandas', 'groupby', 'sorting'],
    tier: null,
    prompt: 'Group sales by product, sum revenue, and put the top 3 into a frame called `top3` (highest first, column named `revenue`).',
    source: { type: 'python-duel', ref: 'lib/arena/codeDuels.ts#PYTHON_DUELS/py-top-products' },
    checker: { type: 'assert-script', check_ref: 'lib/arena/codeDuels.ts#PYTHON_DUELS/py-top-products.check' },
    limits: { time_ms: CODE_TIME_MS },
  },
  {
    task_id: 'py-rolling',
    version: '1',
    kind: 'python',
    domain: 'Lab — Python duels',
    domain_key: 'python-duels',
    skills: ['pandas', 'rolling-window'],
    tier: null,
    prompt: 'Add column `ma3` to df: the 3-day rolling mean of `sales` (window=3, min_periods=1).',
    source: { type: 'python-duel', ref: 'lib/arena/codeDuels.ts#PYTHON_DUELS/py-rolling' },
    checker: { type: 'assert-script', check_ref: 'lib/arena/codeDuels.ts#PYTHON_DUELS/py-rolling.check' },
    limits: { time_ms: CODE_TIME_MS },
  },
  {
    task_id: 'py-pivot',
    version: '1',
    kind: 'python',
    domain: 'Lab — Python duels',
    domain_key: 'python-duels',
    skills: ['pandas', 'pivot'],
    tier: null,
    prompt: 'Build `piv`: pivot df so rows are `region`, columns are `product`, values are `revenue` summed.',
    source: { type: 'python-duel', ref: 'lib/arena/codeDuels.ts#PYTHON_DUELS/py-pivot' },
    checker: { type: 'assert-script', check_ref: 'lib/arena/codeDuels.ts#PYTHON_DUELS/py-pivot.check' },
    limits: { time_ms: CODE_TIME_MS },
  },

  // ─── Cloud — state-validation checker (platform checker in v1) ───────────
  // Three different AWS services: S3 security, EC2 provisioning, IAM policy.
  {
    task_id: 'cl-secure-vault',
    version: '1',
    kind: 'cloud',
    domain: 'AWS S3',
    domain_key: 'S3',
    skills: ['s3', 'encryption', 'public-access'],
    tier: null,
    prompt: "Create a bucket 'arena-vault', block ALL public access, and encrypt it with AES256.",
    source: { type: 'cloud-mission', ref: 'lib/arena/codeDuels.ts#CLOUD_MISSIONS/cl-secure-vault' },
    checker: { type: 'state-validation', check_ref: 'lib/arena/codeDuels.ts#CLOUD_MISSIONS/cl-secure-vault.check' },
    limits: { time_ms: CODE_TIME_MS },
  },
  {
    task_id: 'cl-web-tier',
    version: '1',
    kind: 'cloud',
    domain: 'AWS EC2',
    domain_key: 'EC2',
    skills: ['ec2', 'provisioning'],
    tier: null,
    prompt: "Launch a t3.micro instance named 'web-1' on the Amazon Linux 2023 AMI.",
    source: { type: 'cloud-mission', ref: 'lib/arena/codeDuels.ts#CLOUD_MISSIONS/cl-web-tier' },
    checker: { type: 'state-validation', check_ref: 'lib/arena/codeDuels.ts#CLOUD_MISSIONS/cl-web-tier.check' },
    limits: { time_ms: CODE_TIME_MS },
  },
  {
    task_id: 'cl-least-privilege',
    version: '1',
    kind: 'cloud',
    domain: 'AWS IAM',
    domain_key: 'IAM',
    skills: ['iam', 'least-privilege', 'policies'],
    tier: null,
    prompt: "Create user 'analyst', a policy 'read-metrics' allowing s3:GetObject on 'data-lake/*', and attach it.",
    source: { type: 'cloud-mission', ref: 'lib/arena/codeDuels.ts#CLOUD_MISSIONS/cl-least-privilege' },
    checker: { type: 'state-validation', check_ref: 'lib/arena/codeDuels.ts#CLOUD_MISSIONS/cl-least-privilege.check' },
    limits: { time_ms: CODE_TIME_MS },
  },
];

const BY_ID = new Map(DUEL_SET_V1.map((t) => [t.task_id, t]));

export function duelTaskById(task_id: string): DuelTaskSpec | undefined {
  return BY_ID.get(task_id);
}

export function isDuelTask(task_id: string | null | undefined): boolean {
  return !!task_id && BY_ID.has(task_id);
}

/**
 * The public view of a task: prompt + metadata only. Checker internals
 * (expected-row locations, assert scripts, state validators) stay
 * server-side — an attempter never receives the answer key's address.
 */
export interface PublicDuelTaskSpec {
  task_id: string;
  version: string;
  kind: DuelTaskKind;
  domain: string;
  skills: string[];
  tier: number | null;
  prompt: string;
  checker_type: DuelChecker['type'];
  limits: { time_ms: number };
}

export function publicTaskSpec(t: DuelTaskSpec): PublicDuelTaskSpec {
  return {
    task_id: t.task_id,
    version: t.version,
    kind: t.kind,
    domain: t.domain,
    skills: t.skills,
    tier: t.tier,
    prompt: t.prompt,
    checker_type: t.checker.type,
    limits: t.limits,
  };
}
