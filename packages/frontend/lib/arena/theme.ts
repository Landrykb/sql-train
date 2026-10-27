// Arena palette — one accent per verse so the arena reads at a glance
// which domain the fight belongs to. Soft, easy-on-the-eye tones (no neon):
// lavender (SQL), sage mint (Lab), warm peach (Cloud), on Inkberry dark.
export const VERSE_ACCENT: Record<'sql' | 'lab' | 'cloud', { hex: string; onHex: string }> = {
  sql: { hex: '#A78BFA', onHex: '#1A0B2E' },   // soft lavender — calm, not neon
  lab: { hex: '#8FD6AE', onHex: '#14241C' },   // sage mint — easy on the eyes
  cloud: { hex: '#FFB7A5', onHex: '#33200F' }, // warm peach — soft, no neon orange
};

export const ARENA_BG = '#1A0B2E'; // Inkberry — arena-only deep background accent

export function verseFromParam(v: string | undefined | null): 'sql' | 'lab' | 'cloud' | null {
  if (v === 'sql' || v === 'lab' || v === 'cloud') return v;
  return null;
}
