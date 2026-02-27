'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useProgress } from '@/lib/useProgress';
import {
  TITLES, BADGES, TRIAL_UNLOCK_COST, FLAIR_TIERS,
  getStoreState, getActivePerks, purchaseTitle, purchaseBadge, equipTitle, equipBadge, unlockTrial, getFlairTier,
  type StoreState, type StoreTitle, type StoreBadge,
} from '@/lib/pointsStore';
import { playBleep } from '@/lib/audio';

export default function PointsShop() {
  const { points, spendPoints } = useProgress();
  const [store, setStore] = useState<StoreState>(getStoreState());
  const [shopTab, setShopTab] = useState<'titles' | 'badges' | 'trials' | 'flair'>('titles');
  const [toast, setToast] = useState<string | null>(null);

  // Refresh store state
  const refreshStore = useCallback(() => setStore(getStoreState()), []);

  useEffect(() => {
    refreshStore();
    window.addEventListener('bleepx-store-changed', refreshStore);
    return () => window.removeEventListener('bleepx-store-changed', refreshStore);
  }, [refreshStore]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleBuyTitle = (title: StoreTitle) => {
    if (!window.confirm(`Buy "${title.name}" for ${title.cost} pts?\n\nYour balance: ${points} pts → ${points - title.cost} pts`)) return;
    playBleep();
    const result = purchaseTitle(title.id, points);
    if (result.success && result.newBalance !== undefined) {
      spendPoints(title.cost);
      refreshStore();
      showToast(`Unlocked "${title.name}"!`);
    } else {
      showToast(result.error || 'Purchase failed');
    }
  };

  const handleEquipTitle = (titleId: string) => {
    playBleep();
    const updated = equipTitle(titleId);
    setStore(updated);
  };

  const handleBuyBadge = (badge: StoreBadge) => {
    if (!window.confirm(`Buy "${badge.name}" for ${badge.cost} pts?\n\nYour balance: ${points} pts → ${points - badge.cost} pts`)) return;
    playBleep();
    const result = purchaseBadge(badge.id, points);
    if (result.success && result.newBalance !== undefined) {
      spendPoints(badge.cost);
      refreshStore();
      showToast(`Unlocked "${badge.name}"!`);
    } else {
      showToast(result.error || 'Purchase failed');
    }
  };

  const handleEquipBadge = (badgeId: string) => {
    playBleep();
    const updated = equipBadge(badgeId);
    setStore(updated);
  };

  const handleUnlockTrial = (difficulty: string) => {
    const cost = TRIAL_UNLOCK_COST[difficulty] ?? 0;
    if (cost > 0 && !window.confirm(`Unlock ${difficulty} trials for ${cost} pts?\n\nYour balance: ${points} pts → ${points - cost} pts`)) return;
    playBleep();
    const result = unlockTrial(difficulty, points);
    if (result.success && result.newBalance !== undefined) {
      spendPoints(cost);
      refreshStore();
      showToast(`Unlocked ${difficulty} trials!`);
    } else {
      showToast(result.error || 'Unlock failed');
    }
  };

  const currentFlair = getFlairTier(store.totalPointsEarned);
  const equippedTitleObj = TITLES.find(t => t.id === store.equippedTitle);
  const equippedBadgeObjs = store.equippedBadges.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
  const activePerks = getActivePerks();

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg bg-bleepx-blue text-white text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Current Equipped */}
      <div className="rounded-xl shadow-lg p-4 sm:p-6 bg-bleepx-white">
        <h2 className="text-lg font-bold mb-3 text-bleepx-text">Your Loadout</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span className="text-xs text-bleepx-text-secondary">Title:</span>
            <span className="font-bold text-amber-700 dark:text-amber-300 text-sm">{equippedTitleObj?.name || 'None'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <span className="text-xs text-bleepx-text-secondary">Badges:</span>
            {equippedBadgeObjs.length > 0 ? (
              equippedBadgeObjs.map(b => b && (
                <span key={b.id} className="text-lg" title={b.name}>{b.emoji}</span>
              ))
            ) : (
              <span className="text-xs text-bleepx-text-secondary italic">None equipped</span>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <span className="text-xs text-bleepx-text-secondary">Balance:</span>
            <span className="font-bold text-bleepx-blue text-sm">{points} pts</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <span className="text-xs text-bleepx-text-secondary">Portfolio:</span>
            <span className="font-bold text-green-700 dark:text-green-300 text-sm">{currentFlair.name}</span>
          </div>
        </div>
        {activePerks.perkLines.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">⚡ Active Perks</p>
            <div className="flex flex-wrap gap-2">
              {activePerks.perkLines.map((line, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 font-medium">{line}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shop Tabs */}
      <div className="rounded-xl shadow-lg overflow-hidden bg-bleepx-white">
        <div className="flex border-b border-bleepx-border">
          {(['titles', 'badges', 'trials', 'flair'] as const).map(t => (
            <button
              key={t}
              onClick={() => { playBleep(); setShopTab(t); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px ${
                shopTab === t ? 'border-bleepx-blue text-bleepx-blue' : 'border-transparent text-bleepx-text-secondary hover:text-bleepx-text'
              }`}
            >
              {t === 'titles' ? '🏷️ Titles' : t === 'badges' ? '🎖️ Badges' : t === 'trials' ? '⚔️ Trials' : '✨ Portfolio'}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* Titles Shop */}
          {shopTab === 'titles' && (
            <div className="space-y-3">
              <p className="text-xs text-bleepx-text-secondary mb-3">Titles grant passive bonuses. Equip one at a time — higher titles = better perks.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TITLES.map(title => {
                  const owned = store.purchasedTitles.includes(title.id);
                  const equipped = store.equippedTitle === title.id;
                  const canAfford = points >= title.cost;
                  const locked = title.minPointsRequired ? store.totalPointsEarned < title.minPointsRequired : false;
                  return (
                    <div
                      key={title.id}
                      className={`p-3 rounded-lg border transition-all ${
                        equipped ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/20 ring-1 ring-amber-300'
                        : owned ? 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10'
                        : locked ? 'border-gray-200 dark:border-gray-700 opacity-50'
                        : 'border-bleepx-border hover:border-bleepx-blue/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-bleepx-text">{title.name}</p>
                          <p className="text-xs text-bleepx-text-secondary mt-0.5">{title.description}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {title.perks.pointMultiplier > 1 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">{title.perks.pointMultiplier}x pts</span>}
                            {title.perks.extraFreeHints > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">+{title.perks.extraFreeHints} free hints</span>}
                            {title.perks.trialTimeBonus > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">+{Math.floor(title.perks.trialTimeBonus / 60)}m trial time</span>}
                          </div>
                        </div>
                        {!owned && !locked && (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2">{title.cost} pts</span>
                        )}
                        {locked && (
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">🔒 {title.minPointsRequired} pts</span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        {equipped ? (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">✓ Equipped</span>
                        ) : owned ? (
                          <button onClick={() => handleEquipTitle(title.id)} className="px-3 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors font-medium">
                            Equip
                          </button>
                        ) : !locked ? (
                          <button
                            onClick={() => handleBuyTitle(title)}
                            disabled={!canAfford}
                            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                              canAfford ? 'bg-bleepx-blue text-white hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {canAfford ? 'Buy' : 'Not enough pts'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Badges Shop */}
          {shopTab === 'badges' && (
            <div className="space-y-3">
              <p className="text-xs text-bleepx-text-secondary mb-3">Badges grant stacking micro-perks. Equip up to 3 — their bonuses combine!</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BADGES.map(badge => {
                  const owned = store.purchasedBadges.includes(badge.id);
                  const equipped = store.equippedBadges.includes(badge.id);
                  const canAfford = points >= badge.cost;
                  const locked = badge.minPointsRequired ? store.totalPointsEarned < badge.minPointsRequired : false;
                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-lg border transition-all ${
                        equipped ? 'border-purple-400 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-900/20 ring-1 ring-purple-300'
                        : owned ? 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10'
                        : locked ? 'border-gray-200 dark:border-gray-700 opacity-50'
                        : 'border-bleepx-border hover:border-bleepx-blue/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{badge.emoji}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-sm text-bleepx-text">{badge.name}</p>
                            {!owned && !locked && (
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">{badge.cost} pts</span>
                            )}
                            {locked && (
                              <span className="text-xs text-gray-400 ml-2">🔒</span>
                            )}
                          </div>
                          <p className="text-xs text-bleepx-text-secondary">{badge.description}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {badge.perks.pointMultiplier > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">+{Math.round(badge.perks.pointMultiplier * 100)}% pts</span>}
                            {badge.perks.hintDiscount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">-{badge.perks.hintDiscount} hint cost</span>}
                            {badge.perks.skipDiscount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">-{badge.perks.skipDiscount} skip cost</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {equipped ? (
                          <button onClick={() => handleEquipBadge(badge.id)} className="px-3 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors font-medium">
                            ✓ Equipped — tap to unequip
                          </button>
                        ) : owned ? (
                          <button onClick={() => handleEquipBadge(badge.id)} className="px-3 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors font-medium">
                            Equip
                          </button>
                        ) : !locked ? (
                          <button
                            onClick={() => handleBuyBadge(badge)}
                            disabled={!canAfford}
                            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                              canAfford ? 'bg-bleepx-blue text-white hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {canAfford ? 'Buy' : 'Not enough pts'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trials Unlock */}
          {shopTab === 'trials' && (
            <div className="space-y-3">
              <p className="text-xs text-bleepx-text-secondary mb-3">Unlock harder trial difficulties to test your skills under pressure.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(TRIAL_UNLOCK_COST).map(([diff, cost]) => {
                  const unlocked = store.unlockedTrials.includes(diff);
                  const canAfford = points >= cost;
                  const colors: Record<string, string> = { easy: 'green', medium: 'blue', hard: 'orange', expert: 'red' };
                  const c = colors[diff] || 'gray';
                  return (
                    <div key={diff} className={`p-4 rounded-lg border transition-all ${unlocked ? `border-${c}-300 dark:border-${c}-700 bg-${c}-50/30 dark:bg-${c}-900/10` : 'border-bleepx-border'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm capitalize text-bleepx-text">{diff}</p>
                          <p className="text-xs text-bleepx-text-secondary mt-0.5">
                            {diff === 'easy' ? 'Relaxed pace, no pressure' : diff === 'medium' ? 'Standard challenge' : diff === 'hard' ? 'Tight time limits' : 'Expert-level pressure'}
                          </p>
                        </div>
                        {unlocked ? (
                          <span className="text-xs font-bold text-green-600">✓ Unlocked</span>
                        ) : (
                          <button
                            onClick={() => handleUnlockTrial(diff)}
                            disabled={!canAfford}
                            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                              canAfford ? 'bg-bleepx-blue text-white hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {cost === 0 ? 'Free' : `${cost} pts`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Portfolio Flair */}
          {shopTab === 'flair' && (
            <div className="space-y-3">
              <p className="text-xs text-bleepx-text-secondary mb-3">Your portfolio flair unlocks automatically as you earn more lifetime points. Push richer content to GitHub!</p>
              <div className="space-y-3">
                {FLAIR_TIERS.map(tier => {
                  const active = currentFlair.id === tier.id;
                  const unlocked = store.totalPointsEarned >= tier.minPoints;
                  return (
                    <div key={tier.id} className={`p-4 rounded-lg border transition-all ${active ? 'border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/20 ring-1 ring-green-300' : unlocked ? 'border-bleepx-border' : 'border-gray-200 dark:border-gray-700 opacity-60'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-bleepx-text">{tier.name}</p>
                            {active && <span className="text-xs font-bold text-green-600 dark:text-green-400">← Current</span>}
                          </div>
                          <p className="text-xs text-bleepx-text-secondary mt-0.5">{tier.description}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {tier.features.map(f => (
                              <span key={f} className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-bleepx-text-secondary">{f}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{tier.minPoints} pts</p>
                          <p className="text-[10px] text-bleepx-text-secondary">lifetime</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
