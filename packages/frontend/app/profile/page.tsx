'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getActiveVerse, VERSE_THEMES, type Verse } from '@/lib/verse';
import { clearGitHubUser, startGitHubLogin, logoutUser, GitHubUser } from '@/lib/authClient';
import { useSupabaseUser } from '@/lib/useSupabaseUser';
import { useProgress } from '@/lib/useProgress';
import { useTheme } from '@/lib/useTheme';
import { caseOrder, fullCaseOrder } from '@/lib/constants';
import { LAB_CASE_ORDER, LAB_DOMAIN_META } from '@/lib/labConstants';
import { CLOUD_MISSIONS, CLOUD_PROVIDERS, CLOUD_PROVIDER_META, cloudMissionId } from '@/lib/cloud';
import { playBleep } from '@/lib/audio';
import { track, Events } from '@/lib/analytics';
import PointsShop from '@/components/PointsShop';
import { getStoreState, getActivePerks, TITLES, BADGES, type StoreState } from '@/lib/pointsStore';
import { BleepxHead, BleepxTrophy, BleepxLock, BleepxSpark, BleepxGitHub } from '@/components/BleepxIcons';

const DOMAINS = ['business', 'crime', 'farming', 'finance', 'healthcare', 'social', 'space', 'sports'] as const;

const domainMeta: Record<string, { icon: string; label: string }> = {
  business: { icon: '🏬', label: 'Business Retail' },
  crime: { icon: '🔍', label: 'Crime Chicago' },
  farming: { icon: '🌾', label: 'Farming NDVI' },
  finance: { icon: '📈', label: 'Finance Stocks' },
  healthcare: { icon: '🏥', label: 'Healthcare' },
  social: { icon: '💬', label: 'Social Twitter' },
  space: { icon: '🚀', label: 'Space NEO' },
  sports: { icon: '🏀', label: 'Sports NBA' },
};

interface UserProfile {
  displayName: string;
  email: string;
  authProvider: string | null;
  githubUsername: string | null;
  joinedAt: number;
  testModeEnabled: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'SQL Explorer',
  email: '',
  authProvider: null,
  githubUsername: null,
  joinedAt: Date.now(),
  testModeEnabled: false,
};

export default function ProfilePage() {
  const [verse, setVerse] = useState<Verse>('query');
  const theme = VERSE_THEMES[verse];
  const { completed, points, resetProgress } = useProgress();

  useEffect(() => {
    setVerse(getActiveVerse());
  }, []);
  const { dark, toggle: toggleDark } = useTheme();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [tab, setTab] = useState<'overview' | 'shop' | 'achievements' | 'settings'>('overview');
  const ghUser = useSupabaseUser();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [storeState, setStoreState] = useState<StoreState>(getStoreState());

  // Re-read store state whenever it changes (equip badge/title, purchase, etc.)
  const refreshStore = useCallback(() => setStoreState(getStoreState()), []);
  useEffect(() => {
    window.addEventListener('bleepx-store-changed', refreshStore);
    return () => window.removeEventListener('bleepx-store-changed', refreshStore);
  }, [refreshStore]);

  // Load profile from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bleepx_profile');
      if (saved) {
        setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
      }
    } catch { /* ignore */ }
    track(Events.PROFILE_VIEWED);
  }, []);

  // Save profile to localStorage
  const saveProfile = (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    try { localStorage.setItem('bleepx_profile', JSON.stringify(updated)); } catch { /* ignore */ }
  };

  // Compute stats
  const stats = useMemo(() => {
    const domainStats = DOMAINS.map((d) => {
      const all = fullCaseOrder[d] || [];
      const regular = caseOrder[d] || [];
      const solved = all.filter((c) => completed.has(c)).length;
      return { domain: d, total: all.length, regular: regular.length, solved, pct: all.length ? Math.round((solved / all.length) * 100) : 0 };
    });
    const totalSolved = domainStats.reduce((a, d) => a + d.solved, 0);
    const totalCases = domainStats.reduce((a, d) => a + d.total, 0);
    const completedDomains = domainStats.filter((d) => d.solved === d.total && d.total > 0).length;
    // Lab stats
    const allLabIds = Object.values(LAB_CASE_ORDER).flat();
    const labSolved = allLabIds.filter(c => completed.has(c) || completed.has(`lab_${c}`)).length;
    const labTotal = allLabIds.length;
    // Cloud stats (per provider track + totals)
    const cloudStats = CLOUD_PROVIDERS.map((p) => {
      const missions = CLOUD_MISSIONS[p] || [];
      const solved = missions.filter((m) => completed.has(cloudMissionId(p, m.slug))).length;
      return {
        provider: p,
        meta: CLOUD_PROVIDER_META[p],
        total: missions.length,
        solved,
        pct: missions.length ? Math.round((solved / missions.length) * 100) : 0,
      };
    });
    const cloudSolved = cloudStats.reduce((a, c) => a + c.solved, 0);
    const cloudTotal = cloudStats.reduce((a, c) => a + c.total, 0);
    const completedTracks = cloudStats.filter((c) => c.total > 0 && c.solved === c.total).length;
    return { domainStats, totalSolved, totalCases, totalPoints: points, completedDomains, labSolved, labTotal, cloudStats, cloudSolved, cloudTotal, completedTracks };
  }, [completed, points]);

  // Solve time stats
  const solveTimeStats = useMemo(() => {
    let totalTime = 0;
    let totalAttempts = 0;
    let count = 0;
    for (const d of DOMAINS) {
      const all = fullCaseOrder[d] || [];
      for (const caseId of all) {
        try {
          const saved = localStorage.getItem(`bleepx_solved_${d}_${caseId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.time) { totalTime += parsed.time; count++; }
            if (parsed.attempts) totalAttempts += parsed.attempts;
          }
        } catch { /* ignore */ }
      }
    }
    return { totalTime, avgTime: count > 0 ? Math.round(totalTime / count) : 0, totalAttempts, solvedWithTimer: count };
  }, [completed]);

  // Sync GitHub info into profile when user is authenticated
  useEffect(() => {
    if (ghUser) {
      const updates: Partial<UserProfile> = {
        authProvider: 'github',
        githubUsername: ghUser.login,
        displayName: ghUser.name || ghUser.login,
      };
      if (ghUser.email) updates.email = ghUser.email;
      saveProfile(updates);
    }
  }, [ghUser]);

  const handleLogout = async () => {
    playBleep();
    await logoutUser();
    saveProfile({ authProvider: null, githubUsername: null, displayName: 'SQL Explorer' });
  };

  const handleDeleteAccount = async () => {
    playBleep();
    track(Events.DELETE_ACCOUNT_CONFIRMED);
    setDeleting(true);
    try {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase');
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        alert('Could not connect to auth service');
        setDeleting(false);
        return;
      }

      const { error } = await supabase.auth.admin.deleteUser(
        (await supabase.auth.getUser()).data.user?.id || ''
      );

      if (error) {
        // If admin API fails, try client-side sign out + clear data
        await logoutUser();
        // Clear all bleepx_ localStorage items
        try {
          const keys = Object.keys(localStorage).filter(k => k.startsWith('bleepx_'));
          keys.forEach(k => localStorage.removeItem(k));
        } catch { /* ignore */ }
        window.location.href = '/';
        return;
      }

      // Clear all data
      await logoutUser();
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('bleepx_'));
        keys.forEach(k => localStorage.removeItem(k));
      } catch { /* ignore */ }
      window.location.href = '/';
    } catch (err) {
      console.error('Delete account error:', err);
      alert('Failed to delete account. Please try again or contact support.');
      setDeleting(false);
    }
  };

  const isSignedIn = !!ghUser;
  const githubUsername = ghUser?.login || profile.githubUsername;

  const fmtTime = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl shadow-lg overflow-hidden bg-bleepx-white border border-bleepx-border">
        {/* Decorative banner */}
        <div className={`relative h-28 sm:h-36 bg-gradient-to-br ${theme.gradient} overflow-hidden`}>
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-12 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
          {/* Verse pill */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold border border-white/30">
              {verse === 'lab' ? '🔬' : verse === 'cloud' ? '☁️' : '🔷'} {theme.label}
            </span>
          </div>
        </div>

        <div className="relative z-10 px-4 sm:px-6 pb-6 sm:pb-7">
          {/* Avatar pulled up into the banner */}
          <div className="flex items-end gap-4 sm:gap-5 -mt-12 sm:-mt-16">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex-shrink-0 shadow-2xl ring-4 ring-bleepx-white dark:ring-gray-900 overflow-hidden bg-gradient-to-br p-[3px] from-white/40 to-white/10">
              <div className={`w-full h-full rounded-[1.25rem] overflow-hidden bg-gradient-to-br ${theme.gradient} p-[2px]`}>
                <div className="w-full h-full rounded-[1.1rem] overflow-hidden bg-white dark:bg-gray-800">
                  {ghUser?.avatar ? (
                    <img src={ghUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <BleepxHead size={56} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Auth button aligned to avatar baseline */}
            <div className="flex-1 flex justify-end pb-1">
              {!isSignedIn ? (
                <button onClick={() => { playBleep(); startGitHubLogin(); }} className={`px-4 py-2 rounded-full text-white text-sm font-semibold shadow-md transition-colors flex items-center gap-1.5 bg-gradient-to-r ${theme.gradient} hover:opacity-90`}>
                  <BleepxGitHub size={18} />
                  Sign In
                </button>
              ) : (
                <button onClick={handleLogout} className="px-4 py-2 rounded-full border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Log Out
                </button>
              )}
            </div>
          </div>

          {/* Name + identity row, below avatar */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-bleepx-text truncate">
                {isSignedIn ? (ghUser?.name || profile.displayName) : profile.displayName}
              </h1>
              {isSignedIn && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isSignedIn && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-xs font-medium">
                  <BleepxGitHub size={14} />
                  <span>GitHub</span>
                </div>
              )}
              {githubUsername && isSignedIn && (
                <a
                  href={`https://github.com/${githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${theme.accentBg} ${theme.accentText} ${theme.accentHover}`}
                >
                  @{githubUsername}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              )}
              {!isSignedIn && (
                <span className="text-sm text-bleepx-text-secondary">*bleep* Anonymous explorer</span>
              )}
            </div>
          </div>

          {/* Row 2: Title + Badges + Points — clearly separated */}
          {(() => {
            const title = TITLES.find(t => t.id === storeState.equippedTitle);
            const badges = storeState.equippedBadges.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
            const perks = getActivePerks();
            return (
              <div className="mt-4 flex flex-col gap-2.5">
                {/* Loadout row */}
                <div className="flex flex-wrap items-center gap-2">
                  {isSignedIn && title && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                      <span className="text-sm">🏷️</span> {title.name}
                    </span>
                  )}
                  {isSignedIn && badges.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700">
                      {badges.map(b => b && <span key={b.id} className="text-base" title={b.name}>{b.emoji}</span>)}
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                    <span className="text-sm">💰</span> {points} pts
                  </span>
                </div>
                {/* Active perks row */}
                {isSignedIn && perks.perkLines.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Perks</span>
                    {perks.perkLines.map((line, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-800">{line}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sign in prompt for anonymous users */}
      {!isSignedIn && (
        <div className="rounded-xl shadow-lg p-5 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700">
          <div className="flex items-center gap-3">
            <BleepxGitHub size={32} />
            <div className="flex-1">
              <h3 className="font-bold text-white">Connect with GitHub</h3>
              <p className="text-sm text-gray-400 mt-0.5">*bleep* Sign in with your real GitHub account. Redirects to GitHub for authentication — no passwords stored here.</p>
            </div>
            <button onClick={() => { playBleep(); startGitHubLogin(); }} className="px-4 py-2 rounded-full bg-white text-gray-900 text-sm font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 flex-shrink-0">
              <BleepxGitHub size={18} />
              Sign In
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-bleepx-border">
        {(['overview', 'shop', 'achievements', 'settings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { playBleep(); setTab(t); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-bleepx-blue text-bleepx-blue'
                : 'border-transparent text-bleepx-text-secondary hover:text-bleepx-text'
            }`}
          >
            {t === 'overview' ? '📊 Overview' : t === 'shop' ? '🛒 Shop' : t === 'achievements' ? '🏆 Achievements' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'SQL Challenges', value: stats.totalSolved, sub: `of ${stats.totalCases}`, color: 'text-bleepx-blue' },
              { label: 'Lab Steps', value: stats.labSolved, sub: `of ${stats.labTotal}`, color: 'text-teal-500' },
              { label: 'Cloud Missions', value: stats.cloudSolved, sub: `of ${stats.cloudTotal}`, color: 'text-sky-500' },
              { label: 'Points Balance', value: stats.totalPoints, sub: `${storeState.totalPointsEarned || stats.totalPoints} earned`, color: 'text-amber-500' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl shadow-sm bg-bleepx-white">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs font-medium text-bleepx-text">{s.label}</p>
                <p className="text-xs text-bleepx-text-secondary">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Domain Progress */}
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text">Domain Progress</h2>
            <div className="space-y-3">
              {stats.domainStats.map((d) => (
                <Link key={d.domain} href={`/cases/${d.domain}`} className="block group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{domainMeta[d.domain]?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-medium truncate group-hover:text-bleepx-blue transition-colors text-bleepx-text">
                          {domainMeta[d.domain]?.label || d.domain}
                        </p>
                        <span className="text-xs text-bleepx-text-secondary ml-2 flex-shrink-0">{d.solved}/{d.total}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${d.pct === 100 ? 'bg-green-500' : 'bg-bleepx-blue'}`}
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Lab Progress */}
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text flex items-center gap-2">
              <span>🔬</span> BleepxLab Progress
            </h2>
            <div className="space-y-3">
              {Object.entries(LAB_CASE_ORDER).map(([domain, cases]) => {
                const solved = cases.filter(c => completed.has(c) || completed.has(`lab_${c}`)).length;
                const total = cases.length;
                const pct = total ? Math.round((solved / total) * 100) : 0;
                const meta = LAB_DOMAIN_META[domain];
                return (
                  <Link key={domain} href={`/lab/${domain}`} className="block group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{meta?.icon || '📊'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className="text-sm font-medium truncate group-hover:text-teal-500 transition-colors text-bleepx-text">
                            {meta?.name || domain}
                          </p>
                          <span className="text-xs text-bleepx-text-secondary ml-2 flex-shrink-0">{solved}/{total}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Cloud Progress */}
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text flex items-center gap-2">
              <span>☁️</span> BleepxCloud Progress
              <span className="ml-auto text-xs font-medium text-bleepx-text-secondary">{stats.completedTracks}/{stats.cloudStats.length} tracks done</span>
            </h2>
            <div className="space-y-3">
              {stats.cloudStats.map((c) => (
                <Link key={c.provider} href={`/cloud/${c.provider}`} className="block group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{c.meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-medium truncate group-hover:text-sky-500 transition-colors text-bleepx-text">
                          {c.meta.name}
                        </p>
                        <span className="text-xs text-bleepx-text-secondary ml-2 flex-shrink-0">{c.solved}/{c.total}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${c.pct === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* GitHub Connection */}
          {!isSignedIn && (
            <div className="rounded-xl shadow-lg p-4 sm:p-6 border-2 border-dashed bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <div className="flex items-start gap-3">
                <BleepxGitHub size={32} />
                <div className="flex-1">
                  <h3 className="font-bold text-bleepx-text">Connect Your GitHub</h3>
                  <p className="text-sm text-bleepx-text-secondary mt-1">
                    *bleep* Link your GitHub account to export your SQL portfolio directly. Show off your query skills to the world, human.
                  </p>
                  <button onClick={() => { playBleep(); startGitHubLogin(); }} className="mt-3 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2">
                    <BleepxGitHub size={18} />
                    Sign In with GitHub
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'shop' && <PointsShop />}

      {tab === 'achievements' && (
        <div className="space-y-6">
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text flex items-center gap-2"><BleepxTrophy size={28} /> Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'first_query', icon: '🎯', title: 'First Query', desc: 'Solve your first challenge', unlocked: stats.totalSolved >= 1 },
                { id: 'five_down', icon: '✋', title: 'High Five', desc: 'Solve 5 challenges', unlocked: stats.totalSolved >= 5 },
                { id: 'ten_solved', icon: '🔟', title: 'Double Digits', desc: 'Solve 10 challenges', unlocked: stats.totalSolved >= 10 },
                { id: 'domain_master', icon: '👑', title: 'Domain Master', desc: 'Complete an entire domain', unlocked: stats.completedDomains >= 1 },
                { id: 'multi_domain', icon: '🌐', title: 'Multi-Domain', desc: 'Solve challenges in 3+ domains', unlocked: stats.domainStats.filter(d => d.solved > 0).length >= 3 },
                { id: 'speed_demon', icon: '⚡', title: 'Speed Demon', desc: 'Average solve time under 2 min', unlocked: solveTimeStats.avgTime > 0 && solveTimeStats.avgTime < 120 },
                { id: 'persistent', icon: '💪', title: 'Persistent', desc: 'Make 50+ total attempts', unlocked: solveTimeStats.totalAttempts >= 50 },
                { id: 'all_domains', icon: '🏅', title: 'SQL Grandmaster', desc: 'Complete ALL domains', unlocked: stats.completedDomains === DOMAINS.length },
              // Lab achievements
              { id: 'lab_pioneer', icon: '🔬', title: 'Lab Pioneer', desc: 'Complete your first Lab step', unlocked: stats.labSolved >= 1 },
              { id: 'data_scientist', icon: '🧪', title: 'Data Scientist', desc: 'Complete 10 Lab steps', unlocked: stats.labSolved >= 10 },
              { id: 'lab_legend', icon: '🧬', title: 'Lab Legend', desc: 'Complete 20 Lab steps', unlocked: stats.labSolved >= 20 },
              { id: 'full_stack_ds', icon: '🎓', title: 'Full Stack Data Scientist', desc: 'Complete ALL Lab projects', unlocked: stats.labSolved === stats.labTotal && stats.labTotal > 0 },
              // Cloud achievements
              { id: 'cloud_initiate', icon: '☁️', title: 'Cloud Initiate', desc: 'Complete your first Cloud mission', unlocked: stats.cloudSolved >= 1 },
              { id: 'cloud_architect', icon: '🏗️', title: 'Cloud Architect', desc: 'Complete 10 Cloud missions', unlocked: stats.cloudSolved >= 10 },
              { id: 'multi_cloud', icon: '🌩️', title: 'Multi-Cloud', desc: 'Progress in 3+ Cloud tracks', unlocked: stats.cloudStats.filter(c => c.solved > 0).length >= 3 },
              { id: 'track_master', icon: '🛰️', title: 'Track Master', desc: 'Complete an entire Cloud track', unlocked: stats.completedTracks >= 1 },
              { id: 'cloud_overlord', icon: '🌌', title: 'Cloud Overlord', desc: 'Complete ALL Cloud missions', unlocked: stats.cloudSolved === stats.cloudTotal && stats.cloudTotal > 0 },
              // Cross-verse achievement
              { id: 'tri_verse', icon: '🔺', title: 'Tri-Verse Operative', desc: 'Make progress in Query, Lab, and Cloud', unlocked: stats.totalSolved >= 1 && stats.labSolved >= 1 && stats.cloudSolved >= 1 },
              ].map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    a.unlocked
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-50'
                  }`}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${a.unlocked ? 'text-green-800 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {a.title} {a.unlocked && '✓'}
                    </p>
                    <p className="text-xs text-bleepx-text-secondary">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6">
          {/* Appearance */}
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text">Appearance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-bleepx-text">Dark Mode</p>
                <p className="text-xs text-bleepx-text-secondary">*bleep* For those who prefer the shadows.</p>
              </div>
              <button
                onClick={toggleDark}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${dark ? 'bg-bleepx-blue' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs transition-all duration-300 ${dark ? 'translate-x-7' : 'translate-x-0.5'}`}>
                  {dark ? '🌙' : '☀️'}
                </span>
              </button>
            </div>
          </div>

          {/* GitHub Connection */}
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text">GitHub Connection</h2>
            {isSignedIn && githubUsername ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ghUser?.avatar && <img src={ghUser.avatar} alt="" className="w-8 h-8 rounded-full" />}
                  <div>
                    <p className="text-sm font-medium text-bleepx-text">Connected as <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noopener noreferrer" className="text-bleepx-blue hover:underline">@{githubUsername}</a></p>
                    <p className="text-xs text-bleepx-text-secondary">*bleep* Good. Your portfolio exports will use this account.</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">Sign Out</button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-bleepx-text-secondary mb-3">*bleep* Connect your GitHub to push portfolio projects directly.</p>
                <button onClick={() => { playBleep(); startGitHubLogin(); }} className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <BleepxGitHub size={18} />
                  Sign In with GitHub
                </button>
              </div>
            )}
          </div>

          {/* Test Mode */}
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text">Test Mode</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-bleepx-text">Enable Test Mode</p>
                <p className="text-xs text-bleepx-text-secondary">*bleep* Think you're fast? Timed challenges across both BleepxQuery (30min capstone, 1hr regular) and BleepxLab (30min–1hr based on tier).</p>
              </div>
              <button
                onClick={() => { playBleep(); saveProfile({ testModeEnabled: !profile.testModeEnabled }); }}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${profile.testModeEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs transition-all duration-300 ${profile.testModeEnabled ? 'translate-x-7' : 'translate-x-0.5'}`}>
                  {profile.testModeEnabled ? '🧪' : '⏸'}
                </span>
              </button>
            </div>
            {profile.testModeEnabled && (
              <p className="mt-3 text-xs p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                *bleep* Test mode active. Timer will auto-start on capstone and hidden challenges. Good luck, human. You'll need it.
              </p>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl shadow-lg p-4 sm:p-6 border-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
            <h2 className="text-lg font-bold mb-2 text-red-700 dark:text-red-400 flex items-center gap-2"><BleepxLock size={24} /> Danger Zone</h2>
            <p className="text-sm text-bleepx-text-secondary mb-4">
              *bleep* These actions are irreversible. Even I can't undo them.
            </p>
            <div className="border-t border-red-200 dark:border-red-800 pt-4 mb-4" />
            {!showResetConfirm ? (
              <button
                onClick={() => { track(Events.RESET_PROGRESS_CLICKED); setShowResetConfirm(true); }}
                className="px-4 py-2 rounded-full border-2 border-red-400 text-red-500 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
              >
                Reset All Progress
              </button>
            ) : (
              <div className="p-4 rounded-lg border bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                <p className="text-sm font-bold mb-2 text-red-800 dark:text-red-300">
                  *bleep* Are you absolutely sure, human? This will erase EVERYTHING.
                </p>
                <p className="text-xs text-bleepx-text-secondary mb-3">All solved challenges, points, history, and achievements will be permanently deleted.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      playBleep();
                      track(Events.RESET_PROGRESS_CONFIRMED);
                      resetProgress();
                      // Clear all bleepx_ localStorage items
                      try {
                        const keys = Object.keys(localStorage).filter(k => k.startsWith('bleepx_'));
                        keys.forEach(k => localStorage.removeItem(k));
                      } catch { /* ignore */ }
                      setShowResetConfirm(false);
                      window.location.reload();
                    }}
                    className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    Yes, Reset Everything
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 rounded-full border text-sm font-medium border-bleepx-border text-bleepx-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Delete Account */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => { track(Events.DELETE_ACCOUNT_CLICKED); setShowDeleteConfirm(true); }}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Delete Account
              </button>
            ) : (
              <div className="p-4 rounded-lg border bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                <p className="text-sm font-bold mb-2 text-red-800 dark:text-red-300">
                  ⚠️ DANGER: This will permanently delete your account
                </p>
                <p className="text-xs text-bleepx-text-secondary mb-3">
                  Your account, all progress, points, achievements, and data will be permanently deleted. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-full border text-sm font-medium border-bleepx-border text-bleepx-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
