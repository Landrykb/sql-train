/**
 * Points Store — catalog of purchasable titles, badges, and unlockables.
 * All items are bought with earned points. Purchases persist in localStorage.
 */

// ─── Title Catalog ───────────────────────────────────────────────────────────

export interface StoreTitle {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Minimum total points ever earned (not current balance) to see this in store */
  minPointsRequired?: number;
}

export const TITLES: StoreTitle[] = [
  { id: 'sql_rookie', name: 'SQL Rookie', description: 'Just getting started.', cost: 0 },
  { id: 'data_explorer', name: 'Data Explorer', description: 'Curious minds query everything.', cost: 50 },
  { id: 'query_apprentice', name: 'Query Apprentice', description: 'Learning the craft of SQL.', cost: 100 },
  { id: 'join_master', name: 'JOIN Master', description: 'Tables fear your JOINs.', cost: 200 },
  { id: 'sql_samurai', name: 'SQL Samurai', description: 'Precision strikes with every query.', cost: 350 },
  { id: 'query_ghost', name: 'Query Ghost', description: 'Invisible. Efficient. Deadly.', cost: 500 },
  { id: 'cte_wizard', name: 'CTE Wizard', description: 'Recursive magic at your fingertips.', cost: 700 },
  { id: 'window_sensei', name: 'Window Sensei', description: 'OVER and PARTITION BY bow to you.', cost: 900 },
  { id: 'data_architect', name: 'Data Architect', description: 'You see the schema before it exists.', cost: 1200 },
  { id: 'bleepx_legend', name: 'BleepX Legend', description: '*bleep* Even I respect this one.', cost: 1500, minPointsRequired: 1000 },
];

// ─── Badge Catalog ───────────────────────────────────────────────────────────

export interface StoreBadge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  cost: number;
  minPointsRequired?: number;
}

export const BADGES: StoreBadge[] = [
  { id: 'badge_fire', emoji: '🔥', name: 'On Fire', description: 'Hot streak energy.', cost: 30 },
  { id: 'badge_brain', emoji: '🧠', name: 'Big Brain', description: 'Outsmarted the machine.', cost: 60 },
  { id: 'badge_rocket', emoji: '🚀', name: 'Launch Ready', description: 'Speed-running SQL.', cost: 100 },
  { id: 'badge_crown', emoji: '👑', name: 'Royal Query', description: 'Royalty of the database.', cost: 150 },
  { id: 'badge_diamond', emoji: '💎', name: 'Diamond Hands', description: 'Never gave up.', cost: 200 },
  { id: 'badge_ghost', emoji: '👻', name: 'Phantom', description: 'Solved it like a ghost.', cost: 300 },
  { id: 'badge_star', emoji: '⭐', name: 'Gold Star', description: 'Teacher\'s favorite.', cost: 100 },
  { id: 'badge_ninja', emoji: '🥷', name: 'SQL Ninja', description: 'Silent but effective.', cost: 250 },
  { id: 'badge_lightning', emoji: '⚡', name: 'Lightning Fast', description: 'Sub-minute solves.', cost: 350 },
  { id: 'badge_trophy', emoji: '🏆', name: 'Champion', description: 'Undisputed domain champion.', cost: 500 },
];

// ─── Trial Difficulty Gating ─────────────────────────────────────────────────

export const TRIAL_UNLOCK_COST: Record<string, number> = {
  intermediate: 0,
  advanced: 0,
  elite: 150,
  legendary: 350,
  senior_pro: 500,
};

// ─── Hint Economy ────────────────────────────────────────────────────────────

export const FREE_HINTS = 2;
export const HINT_COST = 25;

// ─── Skip Token ──────────────────────────────────────────────────────────────

export const SKIP_COST = 75;

// ─── Portfolio Flair Tiers ───────────────────────────────────────────────────

export interface FlairTier {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  features: string[];
}

export const FLAIR_TIERS: FlairTier[] = [
  { id: 'basic', name: 'Basic', description: 'SQL files only', minPoints: 0, features: ['query.sql'] },
  { id: 'standard', name: 'Standard', description: 'SQL + README + data', minPoints: 100, features: ['query.sql', 'README.md', 'data.csv'] },
  { id: 'pro', name: 'Pro', description: 'Full project with visualizations', minPoints: 300, features: ['query.sql', 'README.md', 'data.csv', 'visualize.py', 'chart.js'] },
  { id: 'elite', name: 'Elite', description: 'Styled HTML report + everything', minPoints: 600, features: ['query.sql', 'README.md', 'data.csv', 'visualize.py', 'chart.js', 'report.html'] },
];

export function getFlairTier(totalPointsEarned: number): FlairTier {
  let best = FLAIR_TIERS[0];
  for (const tier of FLAIR_TIERS) {
    if (totalPointsEarned >= tier.minPoints) best = tier;
  }
  return best;
}

// ─── Persistence (localStorage) ──────────────────────────────────────────────

const STORE_KEY = 'bleepx_store';

export interface StoreState {
  purchasedTitles: string[];
  purchasedBadges: string[];
  equippedTitle: string | null;
  equippedBadges: string[];       // max 3 equipped at once
  unlockedTrials: string[];       // difficulty ids
  skippedCases: string[];         // case ids that were skip-unlocked
  totalPointsEarned: number;      // lifetime points (never decreases)
  hintsPurchased: Record<string, number>; // caseId -> extra hints purchased count
}

const DEFAULT_STORE: StoreState = {
  purchasedTitles: ['sql_rookie'],
  purchasedBadges: [],
  equippedTitle: 'sql_rookie',
  equippedBadges: [],
  unlockedTrials: ['intermediate', 'advanced'],
  skippedCases: [],
  totalPointsEarned: 0,
  hintsPurchased: {},
};

export function getStoreState(): StoreState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STORE, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STORE };
}

export function saveStoreState(state: StoreState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}

// ─── Store Actions ───────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

export function purchaseTitle(titleId: string, currentPoints: number): PurchaseResult & { store: StoreState } {
  const store = getStoreState();
  const title = TITLES.find(t => t.id === titleId);
  if (!title) return { success: false, error: 'Title not found', store };
  if (store.purchasedTitles.includes(titleId)) return { success: false, error: 'Already owned', store };
  if (title.minPointsRequired && store.totalPointsEarned < title.minPointsRequired) {
    return { success: false, error: `Need ${title.minPointsRequired} lifetime points to unlock`, store };
  }
  if (currentPoints < title.cost) return { success: false, error: `Need ${title.cost} pts (you have ${currentPoints})`, store };

  store.purchasedTitles.push(titleId);
  const newBalance = currentPoints - title.cost;
  saveStoreState(store);
  return { success: true, newBalance, store };
}

export function purchaseBadge(badgeId: string, currentPoints: number): PurchaseResult & { store: StoreState } {
  const store = getStoreState();
  const badge = BADGES.find(b => b.id === badgeId);
  if (!badge) return { success: false, error: 'Badge not found', store };
  if (store.purchasedBadges.includes(badgeId)) return { success: false, error: 'Already owned', store };
  if (badge.minPointsRequired && store.totalPointsEarned < badge.minPointsRequired) {
    return { success: false, error: `Need ${badge.minPointsRequired} lifetime points to unlock`, store };
  }
  if (currentPoints < badge.cost) return { success: false, error: `Need ${badge.cost} pts (you have ${currentPoints})`, store };

  store.purchasedBadges.push(badgeId);
  const newBalance = currentPoints - badge.cost;
  saveStoreState(store);
  return { success: true, newBalance, store };
}

export function equipTitle(titleId: string): StoreState {
  const store = getStoreState();
  if (store.purchasedTitles.includes(titleId)) {
    store.equippedTitle = titleId;
    saveStoreState(store);
  }
  return store;
}

export function equipBadge(badgeId: string): StoreState {
  const store = getStoreState();
  if (!store.purchasedBadges.includes(badgeId)) return store;
  if (store.equippedBadges.includes(badgeId)) {
    // Unequip
    store.equippedBadges = store.equippedBadges.filter(b => b !== badgeId);
  } else if (store.equippedBadges.length < 3) {
    store.equippedBadges.push(badgeId);
  } else {
    // Replace oldest
    store.equippedBadges.shift();
    store.equippedBadges.push(badgeId);
  }
  saveStoreState(store);
  return store;
}

export function purchaseHint(caseId: string, currentPoints: number): PurchaseResult & { store: StoreState } {
  const store = getStoreState();
  if (currentPoints < HINT_COST) return { success: false, error: `Need ${HINT_COST} pts`, store };
  store.hintsPurchased[caseId] = (store.hintsPurchased[caseId] || 0) + 1;
  const newBalance = currentPoints - HINT_COST;
  saveStoreState(store);
  return { success: true, newBalance, store };
}

export function purchaseSkip(caseId: string, currentPoints: number): PurchaseResult & { store: StoreState } {
  const store = getStoreState();
  if (store.skippedCases.includes(caseId)) return { success: false, error: 'Already skipped', store };
  if (currentPoints < SKIP_COST) return { success: false, error: `Need ${SKIP_COST} pts`, store };
  store.skippedCases.push(caseId);
  const newBalance = currentPoints - SKIP_COST;
  saveStoreState(store);
  return { success: true, newBalance, store };
}

export function unlockTrial(difficulty: string, currentPoints: number): PurchaseResult & { store: StoreState } {
  const store = getStoreState();
  const cost = TRIAL_UNLOCK_COST[difficulty] ?? 0;
  if (store.unlockedTrials.includes(difficulty)) return { success: false, error: 'Already unlocked', store };
  if (currentPoints < cost) return { success: false, error: `Need ${cost} pts`, store };
  store.unlockedTrials.push(difficulty);
  const newBalance = currentPoints - cost;
  saveStoreState(store);
  return { success: true, newBalance, store };
}

export function updateTotalPointsEarned(pointsEarned: number): void {
  const store = getStoreState();
  store.totalPointsEarned = Math.max(store.totalPointsEarned, pointsEarned);
  saveStoreState(store);
}
