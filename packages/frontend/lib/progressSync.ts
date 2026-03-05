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
  store_state?: Record<string, unknown>;
  quiz_scores?: Record<string, unknown>;
}

/** Pull progress from Supabase for the current authenticated user. */
export async function pullProgress(): Promise<ProgressData | null> {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_progress')
      .select('completed, points, achievements, store_state, quiz_scores')
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
      store_state: data.store_state || {},
      quiz_scores: data.quiz_scores || {},
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

    const payload: Record<string, unknown> = {
      user_id: user.id,
      completed: progress.completed,
      points: progress.points,
      achievements: progress.achievements,
      updated_at: new Date().toISOString(),
    };
    // Include store_state and quiz_scores if provided
    if (progress.store_state) payload.store_state = progress.store_state;
    if (progress.quiz_scores) payload.quiz_scores = progress.quiz_scores;

    const { error } = await supabase
      .from('user_progress')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      // If columns don't exist yet, retry without them
      if (error.message.includes('store_state') || error.message.includes('quiz_scores')) {
        const { error: fallbackErr } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            completed: progress.completed,
            points: progress.points,
            achievements: progress.achievements,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        if (fallbackErr) {
          console.error('[progressSync] push fallback error:', fallbackErr.message);
          return false;
        }
        return true;
      }
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

  // Merge store_state: prefer local for equipped items, union for purchased items
  const localStore = (local.store_state || {}) as Record<string, unknown>;
  const remoteStore = (remote.store_state || {}) as Record<string, unknown>;
  const mergedStore: Record<string, unknown> = { ...remoteStore, ...localStore };
  // Union array fields (purchasedTitles, purchasedBadges, unlockedTrials, skippedCases)
  for (const key of ['purchasedTitles', 'purchasedBadges', 'unlockedTrials', 'skippedCases']) {
    const localArr = Array.isArray(localStore[key]) ? localStore[key] as string[] : [];
    const remoteArr = Array.isArray(remoteStore[key]) ? remoteStore[key] as string[] : [];
    mergedStore[key] = [...new Set([...localArr, ...remoteArr])];
  }
  // Max for numeric fields
  for (const key of ['totalPointsEarned', 'totalPointsSpent']) {
    mergedStore[key] = Math.max(
      (typeof localStore[key] === 'number' ? localStore[key] as number : 0),
      (typeof remoteStore[key] === 'number' ? remoteStore[key] as number : 0),
    );
  }

  // Merge quiz_scores: keep highest score per quiz
  const localQuiz = (local.quiz_scores || {}) as Record<string, { score: number; total: number; ts: number }>;
  const remoteQuiz = (remote.quiz_scores || {}) as Record<string, { score: number; total: number; ts: number }>;
  const mergedQuiz: Record<string, { score: number; total: number; ts: number }> = { ...remoteQuiz };
  for (const [key, val] of Object.entries(localQuiz)) {
    if (!mergedQuiz[key] || val.score > mergedQuiz[key].score) {
      mergedQuiz[key] = val;
    }
  }

  return {
    completed: [...completedSet].sort(),
    points: Math.max(local.points, remote.points),
    achievements: [...achievementsSet],
    store_state: mergedStore,
    quiz_scores: mergedQuiz,
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
    merged.achievements.length !== remote.achievements.length ||
    JSON.stringify(merged.store_state) !== JSON.stringify(remote.store_state) ||
    JSON.stringify(merged.quiz_scores) !== JSON.stringify(remote.quiz_scores)
  ) {
    await pushProgress(merged);
  }
  return merged;
}

/**
 * Sync current localStorage state to Supabase.
 * Call this after awarding quiz points or updating store state.
 */
export async function syncCurrentProgress(): Promise<void> {
  if (!supabase) return;
  try {
    const completed = JSON.parse(localStorage.getItem('completedCases') || localStorage.getItem('completed') || '[]');
    const points = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
    const achievements = JSON.parse(localStorage.getItem('bleepxAchievements') || '[]');

    // Collect store state
    let store_state: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem('bleepx_store');
      if (raw) store_state = JSON.parse(raw);
    } catch { /* ignore */ }

    // Collect quiz scores
    const quiz_scores: Record<string, unknown> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('bleepx_quiz_') || key === 'bleepx_master_quiz')) {
          const val = localStorage.getItem(key);
          if (val) quiz_scores[key] = JSON.parse(val);
        }
      }
    } catch { /* ignore */ }

    await pushProgress({ completed, points, achievements, store_state, quiz_scores });
    console.log('[progressSync] Synced current progress to Supabase');
  } catch (err) {
    console.error('[progressSync] syncCurrentProgress failed:', err);
  }
}
