'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCompletedCases,
  markCaseComplete as markCaseCompleteRaw,
  isUnlocked as isUnlockedRaw,
} from './progress';
import { playBleep } from './audio';
import { syncProgress, pushProgress } from './progressSync';
import { supabase } from './supabase';
import { updateTotalPointsEarned, getActivePerks } from './pointsStore';
import { CASE_TIERS } from './constants';

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

    // Recalculate correct points from completed cases using known tier data
    const correctPoints = Array.from(storedCompleted).reduce((sum, caseId) => {
      const tier = CASE_TIERS[caseId] || 1;
      return sum + tier * 10;
    }, 0);
    const storedPoints = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
    // Use the higher of stored vs recalculated (never lose points)
    const finalPoints = Math.max(correctPoints, storedPoints);
    if (finalPoints !== storedPoints) {
      localStorage.setItem('bleepxPoints', finalPoints.toString());
      console.log('[useProgress] Recalculated points:', storedPoints, '->', finalPoints);
    }
    setPoints(finalPoints);
    updateTotalPointsEarned(finalPoints);

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
        const merged = await syncProgress({ completed: localCompleted, points: localPoints, achievements: localAchievements });
        setCompleted(new Set(merged.completed));
        setPoints(merged.points);
        setAchievements(merged.achievements);
        writeLocalStorage(merged.completed, merged.points, merged.achievements);
        syncedRef.current = true;
        console.log('[useProgress] Synced with Supabase:', merged);
      } catch (err) {
        console.error('[useProgress] Supabase sync failed:', err);
      }
    };
    doSync();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event) => {
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
        if (newAchievements.length > achievements.length) {
          setAchievements(newAchievements);
          localStorage.setItem('bleepxAchievements', JSON.stringify(newAchievements));
          try {
            playBleep();
            window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: newAchievements[newAchievements.length - 1] }));
          } catch (err) {
            console.warn('Failed to play bleep sound:', err);
          }
        }

        console.log('Marking Complete:', caseId, 'New Completed:', Array.from(next), 'Points:', newPoints, 'Achievements:', newAchievements);

        // Track lifetime points (never decreases)
        updateTotalPointsEarned(newPoints);

        // Push to Supabase in background
        pushProgress({ completed: [...next], points: newPoints, achievements: newAchievements }).catch(() => {});
      }
      return next;
    });
    try {
      markCaseCompleteRaw(caseId);
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
    pushProgress({ completed: [...completed], points: newPoints, achievements }).catch(() => {});
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