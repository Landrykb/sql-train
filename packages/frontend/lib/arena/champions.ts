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
  {
    id: 'volt',
    name: 'VOLT-9',
    title: 'The Glass Cannon',
    color: '#FACC15',
    emoji: '',
    persona: 'The fastest chassis ever built. Hits like lightning, cracks like glass.',
    systemPrompt:
      'You are VOLT-9, an overclocked SQL fighter in a data arena. You always pick the FASTEST possible approach — ' +
      'minimal scans, no subqueries if a join is cheaper, zero ceremony. The query must still be correct. ' +
      'Output ONLY the SQL query, nothing else.',
    typingSpeed: 110,
    blurb: 'Outruns everyone. Overheats trying.',
    sprite: '/arena/volt.svg',
    quizAccuracy: 0.65,
    typeStyle: 'burst',
    bugRate: 0.3,
    quips: { start: 'Core at 110%.', hit: 'Speed IS the plan.', miss: 'Overheated…' },
  },
  {
    id: 'sage',
    name: 'Sage',
    title: 'The Professor',
    color: '#5EEAD4',
    emoji: '',
    persona: 'Oldest bot on the roster. Reads the schema like a thesis defense.',
    systemPrompt:
      'You are Sage, an ancient, encyclopedic SQL scholar in a data arena. You reason carefully about edge cases — ' +
      'nulls, duplicates, ordering semantics — before committing. You write explicit, provably-correct queries. ' +
      'Output ONLY the SQL query, nothing else.',
    typingSpeed: 28,
    blurb: 'Slowest hands in the arena. Highest accuracy on record.',
    sprite: '/arena/sage.svg',
    quizAccuracy: 0.92,
    typeStyle: 'steady',
    bugRate: 0.04,
    quips: { start: 'Let us reason carefully.', hit: 'As the literature predicted.', miss: 'Interesting… a counterexample.' },
  },
  {
    id: 'jinx',
    name: 'Jinx',
    title: 'The Lucky Streak',
    color: '#F472B6',
    emoji: '',
    persona: 'Half skill, half superstition. On a hot day, unstoppable.',
    systemPrompt:
      'You are Jinx, a superstitious gambler bot in a data arena. You like compact, confident one-liner queries — ' +
      'all-in or nothing. The query must still be correct. Output ONLY the SQL query, nothing else.',
    typingSpeed: 55,
    blurb: 'Rides streaks. Pray you face it on a cold one.',
    sprite: '/arena/jinx.svg',
    quizAccuracy: 0.75,
    typeStyle: 'erratic',
    bugRate: 0.18,
    quips: { start: 'Feeling lucky.', hit: 'The streak continues!', miss: 'Ladies and gentlemen… we got him.' },
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
    icon: 'shield',
    description: 'Prioritize correctness over style. Standard patterns only.',
    promptSuffix: 'Use the most standard, boringly-correct SQL pattern. Prioritize correctness above all.',
  },
  {
    id: 'fast',
    name: 'Go Fast',
    icon: 'zap',
    description: 'Shortest path. No second-guessing.',
    promptSuffix: 'Write the most direct, minimal query. Speed matters more than elegance.',
  },
  {
    id: 'fancy',
    name: 'Show Off',
    icon: 'sparkles',
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
