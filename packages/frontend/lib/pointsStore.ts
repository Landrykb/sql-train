/**
 * Points Store — catalog of purchasable titles, badges, and unlockables.
 * All items are bought with earned points. Purchases persist in localStorage.
 */
import { track, Events } from './analytics';

// ─── Title Catalog ───────────────────────────────────────────────────────────

export interface TitlePerks {
  pointMultiplier: number;    // e.g. 1.2 = +20% points on case completion
  extraFreeHints: number;     // additional free hints per case
  trialTimeBonus: number;     // extra seconds added to trial timer
}

export interface StoreTitle {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Minimum total points ever earned (not current balance) to see this in store */
  minPointsRequired?: number;
  perks: TitlePerks;
}

export const TITLES: StoreTitle[] = [
  { id: 'sql_rookie',        name: 'SQL Rookie',       description: 'Just getting started.',                  cost: 0,    perks: { pointMultiplier: 1.0,  extraFreeHints: 0, trialTimeBonus: 0 } },
  { id: 'data_explorer',     name: 'Data Explorer',    description: 'Curious minds query everything.',        cost: 50,   perks: { pointMultiplier: 1.05, extraFreeHints: 0, trialTimeBonus: 0 } },
  { id: 'query_apprentice',  name: 'Query Apprentice', description: 'Learning the craft of SQL.',             cost: 100,  perks: { pointMultiplier: 1.1,  extraFreeHints: 1, trialTimeBonus: 0 } },
  { id: 'join_master',       name: 'JOIN Master',      description: 'Tables fear your JOINs.',                cost: 200,  perks: { pointMultiplier: 1.15, extraFreeHints: 1, trialTimeBonus: 60 } },
  { id: 'sql_samurai',       name: 'SQL Samurai',      description: 'Precision strikes with every query.',    cost: 350,  perks: { pointMultiplier: 1.2,  extraFreeHints: 1, trialTimeBonus: 90 } },
  { id: 'query_ghost',       name: 'Query Ghost',      description: 'Invisible. Efficient. Deadly.',          cost: 500,  perks: { pointMultiplier: 1.3,  extraFreeHints: 2, trialTimeBonus: 120 } },
  { id: 'cte_wizard',        name: 'CTE Wizard',       description: 'Recursive magic at your fingertips.',    cost: 700,  perks: { pointMultiplier: 1.4,  extraFreeHints: 2, trialTimeBonus: 150 } },
  { id: 'window_sensei',     name: 'Window Sensei',    description: 'OVER and PARTITION BY bow to you.',      cost: 900,  perks: { pointMultiplier: 1.5,  extraFreeHints: 3, trialTimeBonus: 180 } },
  { id: 'data_architect',    name: 'Data Architect',   description: 'You see the schema before it exists.',   cost: 1200, perks: { pointMultiplier: 1.75, extraFreeHints: 3, trialTimeBonus: 240 } },
  // ── BleepxLab titles ──
  { id: 'notebook_novice',   name: 'Notebook Novice',  description: 'First steps in the data lab.',           cost: 120,  perks: { pointMultiplier: 1.1,  extraFreeHints: 1, trialTimeBonus: 60 } },
  { id: 'model_whisperer',   name: 'Model Whisperer',  description: 'Your models actually converge.',         cost: 450,  perks: { pointMultiplier: 1.25, extraFreeHints: 2, trialTimeBonus: 120 } },
  { id: 'ml_engineer',       name: 'ML Engineer',      description: 'From notebook to production pipeline.',  cost: 850,  perks: { pointMultiplier: 1.45, extraFreeHints: 3, trialTimeBonus: 180 } },
  // ── BleepxCloud titles ──
  { id: 'cloud_practitioner', name: 'Cloud Practitioner', description: 'Provisioning your first resources.',   cost: 120,  perks: { pointMultiplier: 1.1,  extraFreeHints: 1, trialTimeBonus: 60 } },
  { id: 'solutions_architect', name: 'Solutions Architect', description: 'You design for scale and cost.',     cost: 700,  perks: { pointMultiplier: 1.4,  extraFreeHints: 2, trialTimeBonus: 180 } },
  { id: 'cloud_overlord',    name: 'Cloud Overlord',   description: 'Multi-cloud bends to your will.',        cost: 1300, perks: { pointMultiplier: 1.8,  extraFreeHints: 3, trialTimeBonus: 240 } },
  { id: 'bleepx_legend',     name: 'BleepX Legend',    description: '*bleep* Even I respect this one.',       cost: 1500, minPointsRequired: 1000, perks: { pointMultiplier: 2.0, extraFreeHints: 4, trialTimeBonus: 300 } },
];

// ─── Badge Catalog ───────────────────────────────────────────────────────────

export interface BadgePerks {
  pointMultiplier: number;    // stacks additively, e.g. 0.05 = +5%
  hintDiscount: number;       // flat pts off hint cost, e.g. 5 = hints cost 5 less
  skipDiscount: number;       // flat pts off skip cost
}

export interface StoreBadge {
  id: string;
  name: string;
  description: string;
  cost: number;
  minPointsRequired?: number;
  perks: BadgePerks;
}

export const BADGES: StoreBadge[] = [
  { id: 'badge_fire',      name: 'On Fire',        description: 'Hot streak energy.',           cost: 30,  perks: { pointMultiplier: 0.03, hintDiscount: 0,  skipDiscount: 0 } },
  { id: 'badge_brain',     name: 'Big Brain',      description: 'Outsmarted the machine.',      cost: 60,  perks: { pointMultiplier: 0.05, hintDiscount: 3,  skipDiscount: 0 } },
  { id: 'badge_rocket',    name: 'Launch Ready',   description: 'Speed-running SQL.',           cost: 100, perks: { pointMultiplier: 0.05, hintDiscount: 0,  skipDiscount: 10 } },
  { id: 'badge_crown',     name: 'Royal Query',    description: 'Royalty of the database.',     cost: 150, perks: { pointMultiplier: 0.07, hintDiscount: 5,  skipDiscount: 0 } },
  { id: 'badge_diamond',   name: 'Diamond Hands',  description: 'Never gave up.',               cost: 200, perks: { pointMultiplier: 0.08, hintDiscount: 0,  skipDiscount: 15 } },
  { id: 'badge_ghost',     name: 'Phantom',        description: 'Solved it like a ghost.',      cost: 300, perks: { pointMultiplier: 0.10, hintDiscount: 5,  skipDiscount: 10 } },
  { id: 'badge_star',      name: 'Gold Star',      description: 'Teacher\'s favorite.',         cost: 100, perks: { pointMultiplier: 0.05, hintDiscount: 3,  skipDiscount: 5 } },
  { id: 'badge_ninja',     name: 'SQL Ninja',      description: 'Silent but effective.',        cost: 250, perks: { pointMultiplier: 0.08, hintDiscount: 5,  skipDiscount: 10 } },
  { id: 'badge_lightning',  name: 'Lightning Fast', description: 'Sub-minute solves.',           cost: 350, perks: { pointMultiplier: 0.12, hintDiscount: 5,  skipDiscount: 15 } },
  { id: 'badge_trophy',    name: 'Champion',       description: 'Undisputed domain champion.',  cost: 500, perks: { pointMultiplier: 0.15, hintDiscount: 8,  skipDiscount: 20 } },
  // ── BleepxLab badges ──
  { id: 'badge_flask',     name: 'Lab Coat',       description: 'Experiments in progress.',     cost: 80,  perks: { pointMultiplier: 0.05, hintDiscount: 3,  skipDiscount: 0 } },
  { id: 'badge_dna',       name: 'Data Scientist', description: 'Models, metrics, mastery.',    cost: 220, perks: { pointMultiplier: 0.09, hintDiscount: 5,  skipDiscount: 10 } },
  // ── BleepxCloud badges ──
  { id: 'badge_cloud',     name: 'Cloud Native',   description: 'Born in the data center.',     cost: 80,  perks: { pointMultiplier: 0.05, hintDiscount: 3,  skipDiscount: 0 } },
  { id: 'badge_satellite', name: 'Architect',      description: 'Designs that scale to infinity.', cost: 280, perks: { pointMultiplier: 0.10, hintDiscount: 5,  skipDiscount: 12 } },
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

// ─── Report Generation ─────────────────────────────────────────────────────────

export interface ReportGenerationPerks {
  /** Whether user can generate AI-powered reports */
  canGenerateReports: boolean;
  /** Maximum number of reports that can be generated */
  maxReports: number;
  /** Whether reports include auto-generated graphs */
  includeGraphs: boolean;
  /** Whether reports can be exported to multiple formats */
  multipleFormats: boolean;
}

export interface ReportGenerationTier {
  id: string;
  name: string;
  description: string;
  cost: number;
  minPointsRequired?: number;
  perks: ReportGenerationPerks;
}

export const REPORT_GENERATION_TIERS: ReportGenerationTier[] = [
  {
    id: 'report_basic',
    name: 'Basic Report Generator',
    description: 'Generate simple text reports with context-aware hints',
    cost: 100,
    perks: {
      canGenerateReports: true,
      maxReports: 3,
      includeGraphs: false,
      multipleFormats: false
    }
  },
  {
    id: 'report_pro',
    name: 'Pro Report Generator',
    description: 'Generate full reports with graphs and visualizations',
    cost: 300,
    minPointsRequired: 200,
    perks: {
      canGenerateReports: true,
      maxReports: 10,
      includeGraphs: true,
      multipleFormats: false
    }
  },
  {
    id: 'report_elite',
    name: 'Elite Report Generator',
    description: 'Unlimited reports with graphs, multiple export formats, and AI suggestions',
    cost: 600,
    minPointsRequired: 500,
    perks: {
      canGenerateReports: true,
      maxReports: Infinity,
      includeGraphs: true,
      multipleFormats: true
    }
  }
];

export function getReportGenerationTier(): ReportGenerationTier | null {
  const store = getStoreState();
  // Find the highest tier the user has purchased
  let bestTier: ReportGenerationTier | null = null;
  for (const tier of REPORT_GENERATION_TIERS) {
    if (store.purchasedTitles.includes(tier.id)) {
      bestTier = tier;
    }
  }
  return bestTier;
}

export function canGenerateReports(): boolean {
  const tier = getReportGenerationTier();
  return tier?.perks.canGenerateReports || false;
}

export function purchaseReportTier(tierId: string, currentPoints: number): PurchaseResult & { store: StoreState } {
  const store = getStoreState();
  const tier = REPORT_GENERATION_TIERS.find(t => t.id === tierId);
  if (!tier) return { success: false, error: 'Report tier not found', store };
  if (store.purchasedTitles.includes(tierId)) return { success: false, error: 'Already owned', store };
  if (tier.minPointsRequired && store.totalPointsEarned < tier.minPointsRequired) {
    return { success: false, error: `Need ${tier.minPointsRequired} lifetime points to unlock`, store };
  }
  if (currentPoints < tier.cost) return { success: false, error: `Need ${tier.cost} pts (you have ${currentPoints})`, store };

  store.purchasedTitles.push(tierId);
  const newBalance = currentPoints - tier.cost;
  saveStoreState(store);
  return { success: true, newBalance, store };
}

export function useReportGeneration(itemId: string): { allowed: boolean; remaining: number; error?: string } {
  const store = getStoreState();
  const tier = getReportGenerationTier();
  
  if (!tier || !tier.perks.canGenerateReports) {
    return { allowed: false, remaining: 0, error: 'Purchase a report generation tier first' };
  }
  
  const used = store.reportsGenerated[itemId] || 0;
  const remaining = tier.perks.maxReports === Infinity ? Infinity : tier.perks.maxReports - used;
  
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, error: 'Report generation limit reached for this item' };
  }
  
  return { allowed: true, remaining };
}

export function recordReportGeneration(itemId: string): void {
  const store = getStoreState();
  store.reportsGenerated[itemId] = (store.reportsGenerated[itemId] || 0) + 1;
  saveStoreState(store);
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
  totalPointsSpent: number;        // cumulative points spent (purchases, hints, skips, unlocks)
  hintsPurchased: Record<string, number>; // caseId -> extra hints purchased count
  reportsGenerated: Record<string, number>; // itemId -> count of reports generated
}

const DEFAULT_STORE: StoreState = {
  purchasedTitles: ['sql_rookie'],
  purchasedBadges: [],
  equippedTitle: 'sql_rookie',
  equippedBadges: [],
  unlockedTrials: ['intermediate', 'advanced'],
  skippedCases: [],
  totalPointsEarned: 0,
  totalPointsSpent: 0,
  hintsPurchased: {},
  reportsGenerated: {},
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
    // Notify other components that store changed
    window.dispatchEvent(new CustomEvent('bleepx-store-changed'));
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
  track(Events.HINT_PURCHASED, { case_id: caseId, cost: HINT_COST, current_balance: newBalance });
  return { success: true, newBalance, store };
}

export function purchaseSkip(caseId: string, currentPoints: number): PurchaseResult & { store: StoreState } {
  const store = getStoreState();
  if (store.skippedCases.includes(caseId)) return { success: false, error: 'Already skipped', store };
  if (currentPoints < SKIP_COST) return { success: false, error: `Need ${SKIP_COST} pts`, store };
  store.skippedCases.push(caseId);
  const newBalance = currentPoints - SKIP_COST;
  saveStoreState(store);
  track(Events.SKIP_PURCHASED, { case_id: caseId, cost: SKIP_COST, current_balance: newBalance });
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
  track(Events.TRIAL_UNLOCKED, { difficulty, cost, current_balance: newBalance });
  return { success: true, newBalance, store };
}

export function updateTotalPointsEarned(pointsEarned: number): void {
  const store = getStoreState();
  store.totalPointsEarned = Math.max(store.totalPointsEarned, pointsEarned);
  saveStoreState(store);
}

// ─── Active Perks (combined from equipped title + badges) ───────────────────

export interface ActivePerks {
  pointMultiplier: number;    // final multiplier, e.g. 1.35
  totalFreeHints: number;     // FREE_HINTS + title bonus
  effectiveHintCost: number;  // HINT_COST - badge discounts (min 5)
  effectiveSkipCost: number;  // SKIP_COST - badge discounts (min 10)
  trialTimeBonus: number;     // extra seconds on trials
  /** Human-readable perk lines for UI display */
  perkLines: string[];
}

export function getActivePerks(): ActivePerks {
  const store = getStoreState();

  // Title perks (only one equipped)
  const title = TITLES.find(t => t.id === store.equippedTitle);
  const titlePerks = title?.perks ?? { pointMultiplier: 1.0, extraFreeHints: 0, trialTimeBonus: 0 };

  // Badge perks (up to 3 equipped, stack additively)
  let badgePointBonus = 0;
  let badgeHintDiscount = 0;
  let badgeSkipDiscount = 0;
  for (const bid of store.equippedBadges) {
    const badge = BADGES.find(b => b.id === bid);
    if (badge) {
      badgePointBonus += badge.perks.pointMultiplier;
      badgeHintDiscount += badge.perks.hintDiscount;
      badgeSkipDiscount += badge.perks.skipDiscount;
    }
  }

  // Combined values
  const pointMultiplier = Math.round((titlePerks.pointMultiplier + badgePointBonus) * 100) / 100;
  const totalFreeHints = FREE_HINTS + titlePerks.extraFreeHints;
  const effectiveHintCost = Math.max(5, HINT_COST - badgeHintDiscount);
  const effectiveSkipCost = Math.max(10, SKIP_COST - badgeSkipDiscount);
  const trialTimeBonus = titlePerks.trialTimeBonus;

  // Build human-readable perk lines
  const perkLines: string[] = [];
  if (pointMultiplier > 1) perkLines.push(`${pointMultiplier}x point multiplier`);
  if (totalFreeHints > FREE_HINTS) perkLines.push(`${totalFreeHints} free hints per case (base: ${FREE_HINTS})`);
  if (effectiveHintCost < HINT_COST) perkLines.push(`Hints cost ${effectiveHintCost} pts (base: ${HINT_COST})`);
  if (effectiveSkipCost < SKIP_COST) perkLines.push(`Skips cost ${effectiveSkipCost} pts (base: ${SKIP_COST})`);
  if (trialTimeBonus > 0) perkLines.push(`+${Math.floor(trialTimeBonus / 60)}m bonus trial time`);

  return { pointMultiplier, totalFreeHints, effectiveHintCost, effectiveSkipCost, trialTimeBonus, perkLines };
}
