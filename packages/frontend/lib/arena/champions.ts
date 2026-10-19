/**
 * Bleepx Arena — champion roster, strategy cards, and the house rival.
 * Champions are prompt personas + accents; a champion = system prompt + model config.
 */

export interface Champion {
  id: string;
  name: string;
  title: string;
  color: string;        // accent hex for UI
  emoji: string;
  persona: string;      // flavor shown on select screen
  systemPrompt: string; // LLM persona
  // Simulated profile — used for pacing/typewriter feel
  typingSpeed: number;  // chars/sec reveal
  blurb: string;
  sprite: string;       // /arena/<id>.png
  quizAccuracy: number; // scripted-quiz fallback hit rate (0..1)
  typeStyle: 'burst' | 'steady' | 'erratic'; // how it writes code on screen
  bugRate: number;      // scripted-SQL chance a round has a bug (0..1)
  quips: { start: string; hit: string; miss: string };
}

export const CHAMPIONS: Champion[] = [
  {
    id: 'dash',
    name: 'Dash',
    title: 'The Sprinter',
    color: '#FF7A1A',
    emoji: '⚡',
    persona: 'Fastest bot in the gym. Wins quick or crashes trying.',
    systemPrompt:
      'You are Dash, a hyper-fast SQL fighter in a data arena. You write the SHORTEST correct query possible, immediately. ' +
      'No hedging, no extra columns, no comments. Output ONLY the SQL query, nothing else.',
    typingSpeed: 90,
    blurb: 'Simplest correct query, immediately.',
    sprite: '/arena/dash.png',
    quizAccuracy: 0.7,
    typeStyle: 'burst',
    bugRate: 0.22,
    quips: { start: 'Speedrun it.', hit: 'Told you — fast AND right.', miss: 'Too fast. Again.' },
  },
  {
    id: 'spec',
    name: 'Spectacle',
    title: 'The Analyst',
    color: '#A78BFA',
    emoji: '🔍',
    persona: 'Checks every column twice. Slow. Almost never wrong.',
    systemPrompt:
      'You are Spectacle, a meticulous SQL analyst in a data arena. You verify every column name against the schema before writing. ' +
      'You prefer explicit, safe queries: exact column names, correct filters, correct ordering. ' +
      'Output ONLY the SQL query, nothing else.',
    typingSpeed: 40,
    blurb: 'Verifies the schema twice, then strikes once.',
    sprite: '/arena/spectacle.png',
    quizAccuracy: 0.85,
    typeStyle: 'steady',
    bugRate: 0.08,
    quips: { start: 'Measure twice. Query once.', hit: 'Methodical wins again.', miss: 'Hmm. Recalibrating.' },
  },
  {
    id: 'hex',
    name: 'Hex',
    title: 'The Wildcard',
    color: '#A3E635',
    emoji: '🎲',
    persona: 'Unpredictable. Sometimes brilliant, sometimes a beautiful disaster.',
    systemPrompt:
      'You are Hex, a chaotic-creative SQL wildcard in a data arena. You like clever solutions — CTEs, window functions, ' +
      'unexpected tricks — but the result must still be CORRECT and match the requested output exactly. ' +
      'Output ONLY the SQL query, nothing else.',
    typingSpeed: 60,
    blurb: 'Clever or catastrophic — never boring.',
    sprite: '/arena/hex.png',
    quizAccuracy: 0.6,
    typeStyle: 'erratic',
    bugRate: 0.3,
    quips: { start: 'Watch this trick…', hit: 'CHAOS WORKS?!', miss: 'The chaos chose violence.' },
  },
];

export interface StrategyCard {
  id: string;
  name: string;
  icon: string;
  description: string;
  promptSuffix: string;
}

export const STRATEGY_CARDS: StrategyCard[] = [
  {
    id: 'safe',
    name: 'Play it Safe',
    icon: '🛡️',
    description: 'Prioritize correctness over style. Standard patterns only.',
    promptSuffix: 'Use the most standard, boringly-correct SQL pattern. Prioritize correctness above all.',
  },
  {
    id: 'fast',
    name: 'Go Fast',
    icon: '💨',
    description: 'Shortest path. No second-guessing.',
    promptSuffix: 'Write the most direct, minimal query. Speed matters more than elegance.',
  },
  {
    id: 'fancy',
    name: 'Show Off',
    icon: '✨',
    description: 'Clever solutions — CTEs and window tricks when they fit.',
    promptSuffix: 'If a clever approach (CTE, window function, subquery) fits, use it — but it must still be correct.',
  },
];

/** The house rival — scripted fighter that executes the case's canonical solution. */
export const RIVAL = {
  id: 'vex',
  name: 'VEX-7',
  title: 'House Champion',
  color: '#FACC15',
  emoji: '🤖',
  persona: "Bleepx's undefeated sparring partner. Executes textbook SQL.",
  // Scripted round timing profile (ms) — the rival "types" its query fast.
  solveDelayMs: [900, 1200, 1500],
  sprite: '/arena/vex7.png',
  quizAccuracy: 0.75,   // house bot hits most questions
  typeStyle: 'steady',
  bugRate: 0.12,
  quips: { start: 'INITIATING COMBAT PROTOCOL.', hit: 'EXPECTED OUTCOME.', miss: 'RECALCULATING.' },
} as const;

export function getChampion(id: string): Champion {
  return CHAMPIONS.find((c) => c.id === id) ?? CHAMPIONS[0];
}

export function getStrategy(id: string): StrategyCard {
  return STRATEGY_CARDS.find((s) => s.id === id) ?? STRATEGY_CARDS[0];
}
