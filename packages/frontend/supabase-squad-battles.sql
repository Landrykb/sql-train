-- Squad Battle — Arena's community mode: one person + their agent vs
-- another person + theirs, on the same fixed duel set, played whenever
-- each side has time (challenge-link, asynchronous).
--
-- This file ships with the Squad Battle PR. APPLIED 2026-11-06 by
-- Orion via the Supabase Management API (Academy account, project
-- besa-sqlverse) and verified from the API: table present with 22
-- columns, RLS enabled, the three policies below in place. Landry did
-- not need to run any SQL. Kept here as the canonical record of the
-- table, like supabase-migration.sql.
--
-- Security posture mirrors arena_brain_results: the app's server routes
-- use the anon-key Supabase client, so RLS policies are open — BUT the
-- per-side secret tokens are stored ONLY as SHA-256 hashes. Reading a
-- row never reveals a usable token, and results are accepted only
-- through /api/arena/squad/submit, which validates the token hash and
-- recomputes the score (and the winner) server-side.

CREATE TABLE IF NOT EXISTS arena_squad_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,               -- short share code, e.g. 'K7QX2M'
  verse TEXT NOT NULL,                     -- 'sql' | 'cloud' | 'lab'
  domain TEXT NOT NULL,                    -- verse category (domain / track / topic)
  tier TEXT NOT NULL,                      -- 'rookie' | 'pro' | 'boss'
  listed BOOLEAN NOT NULL DEFAULT false,   -- "Post publicly" → Open challenges
  status TEXT NOT NULL DEFAULT 'waiting',  -- 'waiting' | 'active' | 'complete'
  creator_name TEXT NOT NULL,
  creator_brain_id TEXT NOT NULL,          -- champion id, or 'byok'
  creator_brain_label TEXT NOT NULL,       -- display name of the brain
  creator_token_hash TEXT NOT NULL,        -- SHA-256 of the creator's side token
  creator_result JSONB,                    -- SquadSideResult once played
  creator_submitted_at TIMESTAMPTZ,
  joiner_name TEXT,
  joiner_brain_id TEXT,
  joiner_brain_label TEXT,
  joiner_token_hash TEXT,
  joiner_result JSONB,
  joiner_submitted_at TIMESTAMPTZ,
  winner TEXT,                             -- 'creator' | 'joiner' | 'draw' once complete
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_squad_battles_open_idx
  ON arena_squad_battles (status, listed, created_at DESC);

ALTER TABLE arena_squad_battles ENABLE ROW LEVEL SECURITY;

-- Open policies, same posture as arena_brain_results: the API routes do
-- the real gating (token hashes + server-side score recompute) and only
-- ever return sanitized rows without the token hash columns.
CREATE POLICY "anyone can read squad battles"
  ON arena_squad_battles FOR SELECT USING (true);
CREATE POLICY "anyone can insert squad battles"
  ON arena_squad_battles FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update squad battles"
  ON arena_squad_battles FOR UPDATE USING (true) WITH CHECK (true);
