-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates the user_progress table for cross-device progress sync.

CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed TEXT[] DEFAULT '{}',
  points INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  store_state JSONB DEFAULT '{}',
  quiz_scores JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- If table already exists, add new columns:
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS store_state JSONB DEFAULT '{}';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS quiz_scores JSONB DEFAULT '{}';

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own row
CREATE POLICY "Users can read own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
