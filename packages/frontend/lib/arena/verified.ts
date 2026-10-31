// Bleepx Verified — the paid tier flag. Stored locally until checkout exists;
// the backend swaps this for a server-signed entitlement later.
// NOTE: Verified is currently a FREE PREVIEW — no charge, no checkout. The /verified
// page is labeled as such until Stripe wiring lands.

const KEY = 'bleepxVerified';

export function isVerified(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setVerified(v: boolean) {
  try {
    if (v) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

/** Perks that ship with Verified (kept in one place so locks stay consistent). */
export const VERIFIED_PERKS = [
  'Auto-rematch — your champ fights forever, not just N matches',
  'Pro + Boss duel tiers unlocked in the daily duel',
  'Gold Verified border on your champion card + match cards',
  'Unlimited signed match cards (verify links never expire)',
  'Priority queue in the arena when PvP opens',
];
