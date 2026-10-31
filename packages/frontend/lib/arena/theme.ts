// Arena palette — one accent per verse so the arena reads at a glance
// which domain the fight belongs to. Each accent matches its verse's
// training palette (see VERSE_THEMES in lib/verse.ts):
// lavender (BleepxQuery), sage mint (BleepxLab), sky (BleepxCloud), on Inkberry dark.
export const VERSE_ACCENT: Record<'sql' | 'lab' | 'cloud', { hex: string; onHex: string }> = {
  sql: { hex: '#A78BFA', onHex: '#1A0B2E' },   // soft lavender — matches bleepx blue/indigo
  lab: { hex: '#8FD6AE', onHex: '#14241C' },   // sage mint — matches lab teal/emerald
  cloud: { hex: '#38BDF8', onHex: '#082F49' }, // sky — matches BleepxCloud sky/blue palette
};

export const ARENA_BG = '#1A0B2E'; // Inkberry — arena-only deep background accent

export function verseFromParam(v: string | undefined | null): 'sql' | 'lab' | 'cloud' | null {
  if (v === 'sql' || v === 'lab' || v === 'cloud') return v;
  return null;
}
