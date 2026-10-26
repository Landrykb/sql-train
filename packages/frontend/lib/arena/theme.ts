// Arena palette — one accent per verse so the arena reads at a glance
// which domain the fight belongs to. From the product palette:
// Signal Violet (SQL), Quantum lime (Lab), Neon Orange (Cloud), on Inkberry dark.
export const VERSE_ACCENT: Record<'sql' | 'lab' | 'cloud', { hex: string; onHex: string }> = {
  sql: { hex: '#7A35FF', onHex: '#FFFFFF' },
  lab: { hex: '#B6FF2E', onHex: '#0d1117' },
  cloud: { hex: '#FF6115', onHex: '#0d1117' },
};

export const ARENA_BG = '#1A0B2E'; // Inkberry — arena-only deep background accent

export function verseFromParam(v: string | undefined | null): 'sql' | 'lab' | 'cloud' | null {
  if (v === 'sql' || v === 'lab' || v === 'cloud') return v;
  return null;
}
