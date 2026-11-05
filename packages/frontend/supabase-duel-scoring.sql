-- Duel Scoring v1 — attempt-level scoring records for the first
-- external-agent duels, implementing the frozen TaskSpec + Scoring
-- Record spec (2026-11-01) §4.
--
-- One row per RUN (attempt), written only through /api/duels/attempt.
-- SQL verdicts are recomputed on the server from the submitted result
-- rows (verified_by = 'server_recompute'); Python/Cloud verdicts in v1
-- are recorded from the platform's own in-browser checkers
-- (verified_by = 'platform_checker'). A score exists only as a row in
-- this table — there is no client-side scoreboard math.
--
-- Security posture mirrors arena_brain_results: the app's server routes
-- use the anon-key Supabase client, so the RLS policies are open for
-- insert/read and ALL real gating lives in the API routes (task
-- registry validation, strict verdict shapes, credential-field
-- rejection, server-side SQL recompute). The table is append-only from
-- the app's perspective: no update/delete policies exist.
--
-- APPLIED 2026-11-06 by Orion via the Supabase Management API (Academy
-- account, project besa-sqlverse) and verified from the API: table
-- present, RLS enabled, the two policies below in place. Landry did
-- not need to run any SQL. Kept here as the canonical record of the
-- table, like supabase-squad-battles.sql.

CREATE TABLE IF NOT EXISTS duel_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject JSONB NOT NULL,              -- { type: 'human'|'agent', id, model?, version? }
  task_id TEXT NOT NULL,               -- curriculum id, e.g. 'fraud_joins', 'py-rolling'
  task_version TEXT NOT NULL,          -- TaskSpec version the run was scored under
  duel_set_version TEXT NOT NULL,      -- e.g. 'duel-set-v1'
  kind TEXT NOT NULL,                  -- 'sql' | 'python' | 'cloud' (stamped from the registry)
  submitted JSONB,                     -- SQL { query, rows } · Python { code } · Cloud { actions[] }
  runtime_ms INTEGER,                  -- measured time on the attempt
  status TEXT NOT NULL DEFAULT 'completed',  -- completed | error | timeout | abandoned
  verdict JSONB,                       -- per-kind checker output (frozen spec §4)
  cost JSONB,                          -- { tokens?, usd? } for agent subjects; null for humans
  verified_by TEXT NOT NULL,           -- 'server_recompute' | 'platform_checker'
  match_id TEXT,                       -- optional: groups the runs of one duel/squad match
  team_role TEXT,                      -- optional: the subject's role in that match
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS duel_runs_task_idx
  ON duel_runs (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS duel_runs_created_idx
  ON duel_runs (created_at DESC);

ALTER TABLE duel_runs ENABLE ROW LEVEL SECURITY;

-- Open policies, same posture as arena_brain_results: the API routes do
-- the real gating and the scorecard route only ever returns aggregates
-- and run metadata — never another subject's raw submission.
CREATE POLICY "anyone can insert duel runs"
  ON duel_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can read duel runs"
  ON duel_runs FOR SELECT USING (true);
