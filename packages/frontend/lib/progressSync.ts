/**
 * Supabase progress sync layer.
 * localStorage is the fast cache; Supabase is the cross-device persistence layer.
 * On login: pull remote → merge with local → push merged back.
 * On markComplete: write to local AND push to remote.
 */
import { supabase } from './supabase';

export interface ProgressData {
  completed: string[];
  points: number;
  achievements: string[];
}

/** Pull progress from Supabase for the current authenticated user. */
export async function pullProgress(): Promise<ProgressData | null> {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_progress')
      .select('completed, points, achievements')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = row not found — that's fine for new users
      console.error('[progressSync] pull error:', error.message);
      return null;
    }
    if (!data) return null;
    return {
      completed: data.completed || [],
      points: data.points || 0,
      achievements: data.achievements || [],
    };
  } catch (err) {
    console.error('[progressSync] pull failed:', err);
    return null;
  }
}

/** Push progress to Supabase (upsert). */
export async function pushProgress(progress: ProgressData): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        completed: progress.completed,
        points: progress.points,
        achievements: progress.achievements,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[progressSync] push error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[progressSync] push failed:', err);
    return false;
  }
}

/** Merge local + remote progress (union of completed, max points, union of achievements). */
export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  const completedSet = new Set([...local.completed, ...remote.completed]);
  const achievementsSet = new Set([...local.achievements, ...remote.achievements]);
  return {
    completed: [...completedSet].sort(),
    points: Math.max(local.points, remote.points),
    achievements: [...achievementsSet],
  };
}

/** Full sync: pull remote, merge with local, push merged, return merged data. */
export async function syncProgress(local: ProgressData): Promise<ProgressData> {
  const remote = await pullProgress();
  if (!remote) {
    // No remote data — push local up (first sync or new user)
    await pushProgress(local);
    return local;
  }
  const merged = mergeProgress(local, remote);
  // Only push if merged differs from remote
  if (
    merged.completed.length !== remote.completed.length ||
    merged.points !== remote.points ||
    merged.achievements.length !== remote.achievements.length
  ) {
    await pushProgress(merged);
  }
  return merged;
}
