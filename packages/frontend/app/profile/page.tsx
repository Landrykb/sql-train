'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useProgress } from '@/lib/useProgress';
import { useTheme } from '@/lib/useTheme';
import { caseOrder, fullCaseOrder } from '@/lib/constants';
import { playBleep } from '@/lib/audio';

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
  const { completed, resetProgress } = useProgress();
  const { dark, toggle: toggleDark } = useTheme();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [tab, setTab] = useState<'overview' | 'settings' | 'achievements'>('overview');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showGitHubPrompt, setShowGitHubPrompt] = useState(false);
  const [authStep, setAuthStep] = useState<'choose' | 'github' | 'google' | 'email' | 'verify'>('choose');
  const [authInput, setAuthInput] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

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
    const totalPoints = Array.from(completed).reduce((sum, caseId) => {
      try {
        for (const d of DOMAINS) {
          const all = fullCaseOrder[d] || [];
          if (all.includes(caseId)) {
            const saved = localStorage.getItem(`bleepx_solved_${d}_${caseId}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              return sum + (parsed.tier ? parsed.tier * 10 : 10);
            }
            return sum + 10;
          }
        }
      } catch { /* ignore */ }
      return sum + 10;
    }, 0);
    const completedDomains = domainStats.filter((d) => d.solved === d.total && d.total > 0).length;
    return { domainStats, totalSolved, totalCases, totalPoints, completedDomains };
  }, [completed]);

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

  const handleSignIn = (provider: string) => {
    playBleep();
    setAuthInput('');
    setAuthCode('');
    if (provider === 'github') {
      setAuthStep('github');
    } else if (provider === 'google') {
      setAuthStep('google');
    } else if (provider === 'email') {
      setAuthStep('email');
    }
  };

  const completeGitHub = () => {
    if (!authInput.trim()) return;
    playBleep();
    saveProfile({ authProvider: 'github', githubUsername: authInput.trim(), displayName: authInput.trim() });
    setShowSignIn(false);
    setAuthStep('choose');
    setAuthInput('');
  };

  const completeGoogle = () => {
    if (!authInput.trim() || !authInput.includes('@')) return;
    playBleep();
    saveProfile({ authProvider: 'google', email: authInput.trim(), displayName: authInput.split('@')[0] });
    setShowSignIn(false);
    setAuthStep('choose');
    setAuthInput('');
  };

  const sendEmailCode = () => {
    if (!authInput.trim() || !authInput.includes('@')) return;
    playBleep();
    setPendingEmail(authInput.trim());
    setAuthStep('verify');
    setAuthCode('');
  };

  const verifyEmailCode = () => {
    if (authCode.length < 4) return;
    playBleep();
    saveProfile({ authProvider: 'email', email: pendingEmail, displayName: pendingEmail.split('@')[0] });
    setShowSignIn(false);
    setAuthStep('choose');
    setAuthInput('');
    setAuthCode('');
    setPendingEmail('');
  };

  const handleLogout = () => {
    playBleep();
    setProfile(DEFAULT_PROFILE);
    try { localStorage.removeItem('bleepx_profile'); } catch { /* ignore */ }
  };

  const handleConnectGitHub = () => {
    playBleep();
    setAuthInput('');
    setShowGitHubPrompt(true);
  };

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
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 -mt-10 sm:-mt-12">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center text-3xl sm:text-4xl bg-gray-100 dark:bg-gray-700 border-white dark:border-gray-800">
              {profile.authProvider === 'github' ? '🐙' : profile.authProvider ? '👤' : '🤖'}
            </div>
            <div className="flex-1 mb-1">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { saveProfile({ displayName: nameInput || profile.displayName }); setEditingName(false); } }}
                      className="text-lg sm:text-xl font-bold px-2 py-1 rounded border bg-bleepx-white border-bleepx-border text-bleepx-text"
                      autoFocus
                    />
                    <button onClick={() => { saveProfile({ displayName: nameInput || profile.displayName }); setEditingName(false); }} className="text-xs text-bleepx-blue">Save</button>
                  </div>
                ) : (
                  <h1 className="text-lg sm:text-xl font-bold text-bleepx-text">
                    {profile.displayName}
                    <button onClick={() => { setNameInput(profile.displayName); setEditingName(true); }} className="ml-2 text-xs text-bleepx-text-secondary hover:text-bleepx-blue">✏️</button>
                  </h1>
                )}
              </div>
              <p className="text-sm text-bleepx-text-secondary">
                {profile.authProvider ? `Signed in via ${profile.authProvider}` : '*bleep* Anonymous explorer'}
                {profile.githubUsername && <span className="ml-2">· <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer" className="text-bleepx-blue hover:underline">@{profile.githubUsername}</a></span>}
              </p>
            </div>
            <div className="flex gap-2">
              {!profile.authProvider ? (
                <button onClick={() => setShowSignIn(true)} className="px-3 py-1.5 rounded-full bg-bleepx-blue text-white text-sm font-medium hover:bg-bleepx-blue-hover transition-colors">
                  Sign In
                </button>
              ) : (
                <button onClick={handleLogout} className="px-3 py-1.5 rounded-full border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Log Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowSignIn(false); setAuthStep('choose'); }}>
          <div className="mx-4 w-full max-w-md rounded-xl shadow-2xl p-6 bg-bleepx-white" onClick={(e) => e.stopPropagation()}>
            {authStep === 'choose' && (
              <>
                <h2 className="text-lg font-bold mb-1 text-bleepx-text">*bleep* Identify yourself, human.</h2>
                <p className="text-sm text-bleepx-text-secondary mb-5">Sign in to save your progress across devices and export to GitHub.</p>
                <div className="space-y-3">
                  <button onClick={() => handleSignIn('github')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    <span className="font-medium text-bleepx-text">Continue with GitHub</span>
                    <span className="ml-auto text-xs text-green-500">Recommended</span>
                  </button>
                  <button onClick={() => handleSignIn('google')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span className="font-medium text-bleepx-text">Continue with Google</span>
                  </button>
                  <button onClick={() => handleSignIn('email')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <span className="text-xl">📧</span>
                    <span className="font-medium text-bleepx-text">Continue with Email</span>
                  </button>
                </div>
                <p className="text-xs text-bleepx-text-secondary mt-4 text-center">
                  *bleep* Don&apos;t worry, I won&apos;t sell your data. I&apos;m too busy judging your SQL.
                </p>
              </>
            )}

            {authStep === 'github' && (
              <>
                <button onClick={() => setAuthStep('choose')} className="text-xs text-bleepx-text-secondary hover:text-bleepx-blue mb-3">← Back</button>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  <h2 className="text-lg font-bold text-bleepx-text">Connect GitHub</h2>
                </div>
                <p className="text-sm text-bleepx-text-secondary mb-4">*bleep* Enter your GitHub username to link your account.</p>
                <input
                  value={authInput}
                  onChange={(e) => setAuthInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') completeGitHub(); }}
                  placeholder="e.g. octocat"
                  className="w-full px-4 py-3 rounded-lg border border-bleepx-border bg-bleepx-bg text-bleepx-text placeholder-gray-400 focus:ring-2 focus:ring-bleepx-blue focus:border-transparent outline-none"
                  autoFocus
                />
                <button onClick={completeGitHub} disabled={!authInput.trim()} className="w-full mt-3 px-4 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Connect @{authInput || '...'}
                </button>
              </>
            )}

            {authStep === 'google' && (
              <>
                <button onClick={() => setAuthStep('choose')} className="text-xs text-bleepx-text-secondary hover:text-bleepx-blue mb-3">← Back</button>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <h2 className="text-lg font-bold text-bleepx-text">Google Sign In</h2>
                </div>
                <p className="text-sm text-bleepx-text-secondary mb-4">*bleep* Enter your Google email address.</p>
                <input
                  type="email"
                  value={authInput}
                  onChange={(e) => setAuthInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') completeGoogle(); }}
                  placeholder="you@gmail.com"
                  className="w-full px-4 py-3 rounded-lg border border-bleepx-border bg-bleepx-bg text-bleepx-text placeholder-gray-400 focus:ring-2 focus:ring-bleepx-blue focus:border-transparent outline-none"
                  autoFocus
                />
                <button onClick={completeGoogle} disabled={!authInput.includes('@')} className="w-full mt-3 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue
                </button>
              </>
            )}

            {authStep === 'email' && (
              <>
                <button onClick={() => setAuthStep('choose')} className="text-xs text-bleepx-text-secondary hover:text-bleepx-blue mb-3">← Back</button>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📧</span>
                  <h2 className="text-lg font-bold text-bleepx-text">Email Sign In</h2>
                </div>
                <p className="text-sm text-bleepx-text-secondary mb-4">*bleep* Enter your email. We&apos;ll send a verification code.</p>
                <input
                  type="email"
                  value={authInput}
                  onChange={(e) => setAuthInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendEmailCode(); }}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-bleepx-border bg-bleepx-bg text-bleepx-text placeholder-gray-400 focus:ring-2 focus:ring-bleepx-blue focus:border-transparent outline-none"
                  autoFocus
                />
                <button onClick={sendEmailCode} disabled={!authInput.includes('@')} className="w-full mt-3 px-4 py-3 rounded-lg bg-bleepx-blue text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Send Code
                </button>
              </>
            )}

            {authStep === 'verify' && (
              <>
                <button onClick={() => setAuthStep('email')} className="text-xs text-bleepx-text-secondary hover:text-bleepx-blue mb-3">← Back</button>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔑</span>
                  <h2 className="text-lg font-bold text-bleepx-text">Verify Code</h2>
                </div>
                <p className="text-sm text-bleepx-text-secondary mb-2">*bleep* Code sent to <strong className="text-bleepx-text">{pendingEmail}</strong></p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">Demo mode: enter any 4+ digit code to verify.</p>
                <input
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === 'Enter') verifyEmailCode(); }}
                  placeholder="Enter code"
                  className="w-full px-4 py-3 rounded-lg border border-bleepx-border bg-bleepx-bg text-bleepx-text placeholder-gray-400 focus:ring-2 focus:ring-bleepx-blue focus:border-transparent outline-none text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                  maxLength={6}
                />
                <button onClick={verifyEmailCode} disabled={authCode.length < 4} className="w-full mt-3 px-4 py-3 rounded-lg bg-bleepx-blue text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Verify & Sign In
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* GitHub Connect Prompt */}
      {showGitHubPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGitHubPrompt(false)}>
          <div className="mx-4 w-full max-w-sm rounded-xl shadow-2xl p-6 bg-bleepx-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <h2 className="text-lg font-bold text-bleepx-text">Connect GitHub</h2>
            </div>
            <p className="text-sm text-bleepx-text-secondary mb-4">*bleep* Enter your GitHub username to connect your account.</p>
            <input
              value={authInput}
              onChange={(e) => setAuthInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && authInput.trim()) { saveProfile({ githubUsername: authInput.trim() }); setShowGitHubPrompt(false); setAuthInput(''); } }}
              placeholder="e.g. octocat"
              className="w-full px-4 py-3 rounded-lg border border-bleepx-border bg-bleepx-bg text-bleepx-text placeholder-gray-400 focus:ring-2 focus:ring-bleepx-blue focus:border-transparent outline-none"
              autoFocus
            />
            <button
              onClick={() => { if (authInput.trim()) { saveProfile({ githubUsername: authInput.trim() }); setShowGitHubPrompt(false); setAuthInput(''); } }}
              disabled={!authInput.trim()}
              className="w-full mt-3 px-4 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Connect @{authInput || '...'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-bleepx-border">
        {(['overview', 'achievements', 'settings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { playBleep(); setTab(t); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-bleepx-blue text-bleepx-blue'
                : 'border-transparent text-bleepx-text-secondary hover:text-bleepx-text'
            }`}
          >
            {t === 'overview' ? '📊 Overview' : t === 'achievements' ? '🏆 Achievements' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Challenges Solved', value: stats.totalSolved, sub: `of ${stats.totalCases}`, color: 'text-bleepx-blue' },
              { label: 'Domains Completed', value: stats.completedDomains, sub: `of ${DOMAINS.length}`, color: 'text-green-500' },
              { label: 'Total Points', value: stats.totalPoints, sub: 'earned', color: 'text-amber-500' },
              { label: 'Avg Solve Time', value: fmtTime(solveTimeStats.avgTime), sub: `${solveTimeStats.totalAttempts} attempts`, color: 'text-purple-500' },
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

          {/* GitHub Connection */}
          {!profile.githubUsername && (
            <div className="rounded-xl shadow-lg p-4 sm:p-6 border-2 border-dashed bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🐙</span>
                <div className="flex-1">
                  <h3 className="font-bold text-bleepx-text">Connect Your GitHub</h3>
                  <p className="text-sm text-bleepx-text-secondary mt-1">
                    *bleep* Link your GitHub account to export your SQL portfolio directly. Show off your query skills to the world, human.
                  </p>
                  <button onClick={handleConnectGitHub} className="mt-3 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors">
                    Connect GitHub
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'achievements' && (
        <div className="space-y-6">
          <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
            <h2 className="text-lg font-bold mb-4 text-bleepx-text">🏆 Achievements</h2>
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
            {profile.githubUsername ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐙</span>
                  <div>
                    <p className="text-sm font-medium text-bleepx-text">Connected as <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer" className="text-bleepx-blue hover:underline">@{profile.githubUsername}</a></p>
                    <p className="text-xs text-bleepx-text-secondary">*bleep* Good. Your portfolio exports will use this account.</p>
                  </div>
                </div>
                <button onClick={() => saveProfile({ githubUsername: null })} className="text-xs text-red-500 hover:underline">Disconnect</button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-bleepx-text-secondary mb-3">*bleep* Connect your GitHub to push portfolio projects directly.</p>
                <button onClick={handleConnectGitHub} className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  Connect GitHub
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
                <p className="text-xs text-bleepx-text-secondary">*bleep* Think you're fast? Timed challenges: 30min for capstone, 1hr for hidden cases. Toggle on any applicable challenge.</p>
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
            <h2 className="text-lg font-bold mb-2 text-red-700 dark:text-red-400">⚠️ Danger Zone</h2>
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
