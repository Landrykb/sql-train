'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getGitHubUser, setGitHubUser, clearGitHubUser, startGitHubLogin, logoutUser, GitHubUser } from '@/lib/authClient';
import { useProgress } from '@/lib/useProgress';
import { useTheme } from '@/lib/useTheme';
import { caseOrder, fullCaseOrder } from '@/lib/constants';
import { LAB_CASE_ORDER, LAB_DOMAIN_META } from '@/lib/labConstants';
import { playBleep } from '@/lib/audio';
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
  const { completed, points, resetProgress } = useProgress();
  const { dark, toggle: toggleDark } = useTheme();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [tab, setTab] = useState<'overview' | 'shop' | 'achievements' | 'settings'>('overview');
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
    return { domainStats, totalSolved, totalCases, totalPoints: points, completedDomains, labSolved, labTotal };
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

  // Load GitHub user from authClient + sync profile
  useEffect(() => {
    // Check for auth success from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth_success');
    if (authSuccess === 'true') {
      // Sync user data from OAuth callback to localStorage
      const email = urlParams.get('email') || '';
      const name = urlParams.get('name') || '';
      const avatar = urlParams.get('avatar') || '';
      const login = urlParams.get('login') || '';
      if (email && login) {
        const userData = { login, name, avatar, email };
        setGitHubUser(userData);
        setGhUser(userData);
        // Sync GitHub info into profile
        const updates: Partial<UserProfile> = {
          authProvider: 'github',
          githubUsername: login,
          displayName: name || login,
        };
        if (email) updates.email = email;
        saveProfile(updates);
        // Clean up URL params
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
    }

    const gh = getGitHubUser();
    if (gh) {
      setGhUser(gh);
      // Sync GitHub info into profile
      const updates: Partial<UserProfile> = {
        authProvider: 'github',
        githubUsername: gh.login,
        displayName: gh.name || gh.login,
      };
      if (gh.email) updates.email = gh.email;
      saveProfile(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    playBleep();
    await logoutUser();
    setGhUser(null);
    saveProfile({ authProvider: null, githubUsername: null, displayName: 'SQL Explorer' });
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
      <div className="rounded-xl shadow-lg overflow-hidden bg-bleepx-white">
        <div className="bg-gradient-to-r from-bleepx-blue to-bleepx-pink h-24 sm:h-32" />
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 -mt-10 sm:-mt-12">
          {/* Row 1: Avatar + Name + Auth button */}
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-700 border-white dark:border-gray-800 relative flex-shrink-0">
              {ghUser?.avatar ? (
                <img src={ghUser.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <BleepxHead size={56} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 mb-1">
              <h1 className="text-lg sm:text-xl font-bold text-bleepx-text truncate">
                {isSignedIn ? (ghUser?.name || profile.displayName) : profile.displayName}
              </h1>
              <p className="text-sm text-bleepx-text-secondary">
                {isSignedIn ? 'Signed in via GitHub' : '*bleep* Anonymous explorer'}
                {githubUsername && isSignedIn && <span className="ml-1">· <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noopener noreferrer" className="text-bleepx-blue hover:underline">@{githubUsername}</a></span>}
              </p>
            </div>
            <div className="flex-shrink-0 mb-1">
              {!isSignedIn ? (
                <button onClick={() => { playBleep(); startGitHubLogin(); }} className="px-3 py-1.5 rounded-full bg-bleepx-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                  <BleepxGitHub size={18} />
                  Sign In
                </button>
              ) : (
                <button onClick={handleLogout} className="px-3 py-1.5 rounded-full border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Log Out
                </button>
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
                  {title && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                      <span className="text-sm">🏷️</span> {title.name}
                    </span>
                  )}
                  {badges.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700">
                      {badges.map(b => b && <span key={b.id} className="text-base" title={b.name}>{b.emoji}</span>)}
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                    <span className="text-sm">💰</span> {points} pts
                  </span>
                </div>
                {/* Active perks row */}
                {perks.perkLines.length > 0 && (
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
              { label: 'Points Balance', value: stats.totalPoints, sub: `${storeState.totalPointsEarned || stats.totalPoints} earned`, color: 'text-amber-500' },
              { label: 'Domains Done', value: stats.completedDomains, sub: `of ${DOMAINS.length} SQL`, color: 'text-green-500' },
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
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
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
          </div>
        </div>
      )}
    </div>
  );
}
