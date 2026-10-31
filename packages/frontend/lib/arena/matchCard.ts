// Compact shareable match-card payload, encoded into a URL — no backend needed.
// The card page decodes it and re-renders the result as a standalone artifact.

export interface MatchCardData {
  c: string;   // champion id
  st: number;  // evolution stage index at match end
  v: string;   // verse name (display string)
  t: string;   // tier name (display string)
  m: string;   // 'coach' | 'tagteam'
  w: number;   // rounds won by champion
  n: number;   // total rounds
  k: number;   // correct rounds
  ms: number;  // avg solve+exec ms
  xp: number;  // xp earned
  e?: number;  // 1 = evolved this match
  b?: string;  // brain — the model powering the champion (BYOK), e.g. "Llama 3.3 70B"
}

export function encodeMatchCard(data: MatchCardData): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeMatchCard(d: string): MatchCardData | null {
  try {
    const b64 = d.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof obj !== 'object' || obj === null || typeof obj.w !== 'number' || typeof obj.n !== 'number') return null;
    return obj as MatchCardData;
  } catch {
    return null;
  }
}

export function matchCardUrl(data: MatchCardData, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/arena/card?d=${encodeMatchCard(data)}`;
}
