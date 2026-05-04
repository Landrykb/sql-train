'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCompletedCases,
  markCaseComplete as markCaseCompleteRaw,
  isUnlocked as isUnlockedRaw,
} from './progress';
import { playBleep } from './audio';
import { syncProgress, pushProgress, syncCurrentProgress } from './progressSync';
import { supabase } from './supabase';
import { updateTotalPointsEarned, getActivePerks, getStoreState, saveStoreState } from './pointsStore';
import { CASE_TIERS } from './constants';
import { LAB_CASE_TIERS, LAB_CASE_ORDER } from './labConstants';
import { track, Events } from './analytics';

export function useProgress() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState<number>(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const syncedRef = useRef(false);

  // Helper: write merged data back to localStorage
  const writeLocalStorage = useCallback((completed: string[], pts: number, achs: string[]) => {
    try {
      localStorage.setItem('completed', JSON.stringify(completed));
      localStorage.setItem('completedCases', JSON.stringify(completed));
      localStorage.setItem('bleepxPoints', pts.toString());
      localStorage.setItem('bleepxAchievements', JSON.stringify(achs));
    } catch { /* quota */ }
  }, []);

  // Load initial state from localStorage on mount (client-side only)
  // Also recalculate points from CASE_TIERS to fix any stale bleepxPoints values
  useEffect(() => {
    const storedCompleted = getCompletedCases();
    setCompleted(storedCompleted);

    // Recalculate earned points from completed cases using known tier data (Query + Lab)
    const correctEarned = Array.from(storedCompleted).reduce((sum, caseId) => {
      const tier = CASE_TIERS[caseId] || LAB_CASE_TIERS[caseId] || 1;
      return sum + tier * 10;
    }, 0);
    const store = getStoreState();
    // One-time migration: refund accidental legendary trial unlock
    if (!localStorage.getItem('bleepx_legendary_refund') && store.unlockedTrials.includes('legendary')) {
      const legendaryCost = 350;
      store.unlockedTrials = store.unlockedTrials.filter(t => t !== 'legendary');
      store.totalPointsSpent = Math.max(0, (store.totalPointsSpent || 0) - legendaryCost);
      saveStoreState(store);
      localStorage.setItem('bleepx_legendary_refund', '1');
      console.log('[useProgress] Refunded legendary trial unlock (350 pts)');
    }
    const totalSpent = store.totalPointsSpent || 0;
    const storedPoints = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
    // Balance = earned minus spent; use max of recalculated vs stored earned
    const totalEarned = Math.max(correctEarned, storedPoints + totalSpent);
    const finalPoints = totalEarned - totalSpent;
    if (finalPoints !== storedPoints) {
      localStorage.setItem('bleepxPoints', finalPoints.toString());
      console.log('[useProgress] Recalculated points:', storedPoints, '->', finalPoints, '(earned:', totalEarned, 'spent:', totalSpent, ')');
    }
    setPoints(finalPoints);
    updateTotalPointsEarned(totalEarned);

    const storedAchievements = JSON.parse(localStorage.getItem('bleepxAchievements') || '[]');
    setAchievements(storedAchievements);
  }, []);

  // Supabase sync: merge local ↔ remote on mount & auth changes
  useEffect(() => {
    if (!supabase) return;
    const doSync = async () => {
      try {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return;
        const localCompleted = JSON.parse(localStorage.getItem('completedCases') || localStorage.getItem('completed') || '[]');
        const localPoints = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
        const localAchievements = JSON.parse(localStorage.getItem('bleepxAchievements') || '[]');

        // Collect local store state and quiz scores for sync
        let localStoreState: Record<string, unknown> = {};
        try { const raw = localStorage.getItem('bleepx_store'); if (raw) localStoreState = JSON.parse(raw); } catch { /* ignore */ }

        const localQuizScores: Record<string, unknown> = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('bleepx_quiz_') || key.startsWith('bleepx_lab_quiz_') || key === 'bleepx_master_quiz' || key === 'bleepx_master_quiz_progress')) {
              const val = localStorage.getItem(key);
              if (val) localQuizScores[key] = JSON.parse(val);
            }
          }
        } catch { /* ignore */ }

        const merged = await syncProgress({
          completed: localCompleted,
          points: localPoints,
          achievements: localAchievements,
          store_state: localStoreState,
          quiz_scores: localQuizScores,
        });
        setCompleted(new Set(merged.completed));
        setPoints(merged.points);
        setAchievements(merged.achievements);
        writeLocalStorage(merged.completed, merged.points, merged.achievements);

        // Restore store state from merged data
        if (merged.store_state && Object.keys(merged.store_state).length > 0) {
          try { localStorage.setItem('bleepx_store', JSON.stringify(merged.store_state)); } catch { /* ignore */ }
        }

        // Restore quiz scores from merged data
        if (merged.quiz_scores) {
          try {
            for (const [key, val] of Object.entries(merged.quiz_scores)) {
              localStorage.setItem(key, JSON.stringify(val));
            }
          } catch { /* ignore */ }
        }

        syncedRef.current = true;
        console.log('[useProgress] Synced with Supabase (incl. store + quiz):', merged);
      } catch (err) {
        console.error('[useProgress] Supabase sync failed:', err);
      }
    };
    doSync();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'INITIAL_SESSION') => {
      if (event === 'SIGNED_IN') doSync();
      if (event === 'SIGNED_OUT') {
        // Clear progress from UI and localStorage on logout
        setCompleted(new Set());
        setPoints(0);
        setAchievements([]);
        try {
          localStorage.removeItem('completed');
          localStorage.removeItem('completedCases');
          localStorage.removeItem('bleepxPoints');
          localStorage.removeItem('bleepxAchievements');
        } catch { /* ignore */ }
        syncedRef.current = false;
        console.log('[useProgress] Cleared progress on sign-out');
      }
    });
    return () => subscription.unsubscribe();
  }, [writeLocalStorage]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'completed') {
        try {
          const newCompleted = getCompletedCases();
          setCompleted(newCompleted);
          console.log('Progress Synced:', Array.from(newCompleted));
        } catch (err: unknown) {
          console.error('Failed to sync progress across tabs:', err);
          setError('Failed to sync progress across tabs.');
        }
      }
      if (e.key === 'bleepxPoints') {
        setPoints(parseInt(localStorage.getItem('bleepxPoints') || '0', 10));
      }
      if (e.key === 'bleepxAchievements') {
        setAchievements(JSON.parse(localStorage.getItem('bleepxAchievements') || '[]'));
      }
      if (e.key === 'completedCases') {
        try {
          const newCompleted = new Set(JSON.parse(localStorage.getItem('completedCases') || '[]') as string[]);
          setCompleted(newCompleted);
          console.log('Completed Cases Synced:', Array.from(newCompleted));
        } catch (err: unknown) {
          console.error('Failed to sync completedCases across tabs:', err);
          setError('Failed to sync completed cases.');
        }
      }
    };

    const handleProgressError = (evt: Event) => {
      if (evt instanceof CustomEvent && typeof evt.detail === 'string') {
        setError(evt.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('progress-error', handleProgressError);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('progress-error', handleProgressError);
    };
  }, []);

  const markComplete = useCallback((caseId: string, tier: number = 1) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (!next.has(caseId)) {
        next.add(caseId);
        const perks = getActivePerks();
        const pointsToAdd = Math.round(10 * tier * perks.pointMultiplier);
        const newPoints = points + pointsToAdd;
        setPoints(newPoints);
        localStorage.setItem('bleepxPoints', newPoints.toString());
        localStorage.setItem('completedCases', JSON.stringify([...next]));

        const newAchievements = [...achievements];
        const completedCount = next.size;
        if (completedCount === 1 && !newAchievements.includes('First Query')) {
          newAchievements.push('First Query');
        }
        if (completedCount >= 5 && !newAchievements.includes('SwiftLink Rookie')) {
          newAchievements.push('SwiftLink Rookie');
        }
        if (completedCount >= 10 && !newAchievements.includes('Ghost Query Master')) {
          newAchievements.push('Ghost Query Master');
        }
        if (caseId.startsWith('hidden_') && !newAchievements.includes('Hidden Master')) {
          newAchievements.push('Hidden Master');
        }
        const hiddenCompleted = Array.from(next).filter((id) => id.startsWith('hidden_')).length;
        if (hiddenCompleted >= 5 && !newAchievements.includes('Business Case Expert')) {
          newAchievements.push('Business Case Expert');
        }
        if (hiddenCompleted >= 8 && !newAchievements.includes('Real-World SQL Legend')) {
          newAchievements.push('Real-World SQL Legend');
        }
        const domain = caseId.split('-')[0];
        const domainCases = Array.from(next).filter((id) => id.startsWith(domain));
        if (domainCases.length >= 5 && !newAchievements.includes(`Tokyo Query Pro: ${domain}`)) {
          newAchievements.push(`Tokyo Query Pro: ${domain}`);
        }

        // Lab-specific achievements
        const allLabIds = Object.values(LAB_CASE_ORDER).flat();
        const labCompleted = Array.from(next).filter((id) => allLabIds.includes(id));
        if (labCompleted.length >= 1 && !newAchievements.includes('Lab Pioneer')) {
          newAchievements.push('Lab Pioneer');
        }
        if (labCompleted.length >= 10 && !newAchievements.includes('Data Scientist')) {
          newAchievements.push('Data Scientist');
        }
        if (labCompleted.length >= 20 && !newAchievements.includes('Lab Legend')) {
          newAchievements.push('Lab Legend');
        }
        // Check if any Lab domain is fully completed
        for (const [labDomain, labCases] of Object.entries(LAB_CASE_ORDER)) {
          const allDone = labCases.every((lc) => next.has(lc));
          if (allDone && !newAchievements.includes(`Lab Master: ${labDomain}`)) {
            newAchievements.push(`Lab Master: ${labDomain}`);
          }
        }
        // Full Lab completion
        const allLabDone = allLabIds.every((id) => next.has(id));
        if (allLabDone && !newAchievements.includes('Full Stack Data Scientist')) {
          newAchievements.push('Full Stack Data Scientist');
        }
        if (newAchievements.length > achievements.length) {
          const newAchievement = newAchievements[newAchievements.length - 1];
          setAchievements(newAchievements);
          localStorage.setItem('bleepxAchievements', JSON.stringify(newAchievements));
          track(Events.ACHIEVEMENT_UNLOCKED, { achievement_id: newAchievement, achievement_name: newAchievement, total_achievements: newAchievements.length });
          try {
            playBleep();
            window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: newAchievement }));
          } catch (err) {
            console.warn('Failed to play bleep sound:', err);
          }
        }

        console.log('Marking Complete:', caseId, 'New Completed:', Array.from(next), 'Points:', newPoints, 'Achievements:', newAchievements);

        // Track lifetime points (never decreases)
        updateTotalPointsEarned(newPoints);

        // Push full state to Supabase (incl. store state + quiz scores)
        syncCurrentProgress().catch(() => {});
      }
      return next;
    });
    try {
      markCaseCompleteRaw(caseId);
      track(Events.CASE_SOLVED, { case_id: caseId, points_earned: newPoints, total_points: newPoints });
    } catch (e: unknown) {
      console.error('Failed to mark case complete:', e);
      setError('Failed to save progress.');
    }
  }, [points, achievements]);

  /** Spend points (for store purchases, hints, skips). Returns false if insufficient. */
  const spendPoints = useCallback((amount: number): boolean => {
    if (points < amount) return false;
    const newPoints = points - amount;
    setPoints(newPoints);
    localStorage.setItem('bleepxPoints', newPoints.toString());
    // Track cumulative spending so recalculation on mount doesn't reset balance
    const store = getStoreState();
    store.totalPointsSpent = (store.totalPointsSpent || 0) + amount;
    saveStoreState(store);
    // Sync full state including store purchases to Supabase
    syncCurrentProgress().catch(() => {});
    return true;
  }, [points, completed, achievements]);

  const isUnlocked = useCallback((prereqs: string[]) => {
    try {
      const unlocked = isUnlockedRaw(prereqs);
      console.log('Checking Unlock:', { prereqs, unlocked, completed: Array.from(completed) });
      return unlocked;
    } catch {
      return false;
    }
  }, [completed]);

  const resetProgress = useCallback(() => {
    setCompleted(new Set());
    setPoints(0);
    setAchievements([]);
    try {
      localStorage.removeItem('completed');
      localStorage.removeItem('bleepxPoints');
      localStorage.removeItem('bleepxAchievements');
      localStorage.removeItem('completedCases');
      console.log('Progress Reset');
    } catch (e: unknown) {
      console.error('Failed to reset progress:', e);
      setError('Failed to reset progress.');
    }
    // Clear remote too
    pushProgress({ completed: [], points: 0, achievements: [] }).catch(() => {});
  }, []);

  return { completed, points, achievements, markComplete, spendPoints, isUnlocked, error, resetProgress };
}