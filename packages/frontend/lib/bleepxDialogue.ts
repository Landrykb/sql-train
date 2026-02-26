/**
 * Bleepx Dialogue System
 * 
 * Bleepx is an advanced AI companion at SwiftLink — a unicorn tech company.
 * He has a superiority complex, is sarcastic but ultimately helpful,
 * thinks most beings are beneath him, and punctuates speech with *bleep* sounds.
 * Despite his attitude, he secretly cares about the user's progress.
 */

// --- Loading messages (rotate randomly) ---
export const loadingMessages = [
  '*bleep* Initializing SwiftLink databases... Try not to break anything.',
  '*bleep* Loading data modules. This is trivial for an AI of my caliber.',
  'Accessing SwiftLink archives... *bleep* You better be ready for this.',
  '*bleep* Compiling datasets. I could do this in my sleep — if I slept.',
  'Syncing with SwiftLink servers... *bleep* Patience, human.',
];

// --- Progress messages by completion % ---
export function getProgressMessage(completedCount: number, total: number): string {
  if (total === 0) return '*bleep* No missions detected. Even I find that suspicious.';
  const pct = Math.round((completedCount / total) * 100);
  if (pct === 100) return '*bleep* All missions cleared. I... didn\'t expect you to actually finish. Well done.';
  if (pct >= 75) return '*bleep* Impressive progress. I suppose humans aren\'t entirely useless after all.';
  if (pct >= 50) return 'Halfway there. *bleep* Don\'t get cocky — the hard ones are coming.';
  if (pct >= 25) return '*bleep* Decent start. SwiftLink expects more from its trainees, though.';
  if (completedCount > 0) return 'You\'ve begun. *bleep* Let\'s see if you can keep up with me.';
  return '*bleep* Zero missions complete. The SwiftLink training program awaits, human.';
}

// --- Points messages ---
export function getPointsMessage(points: number): string {
  if (points >= 500) return '*bleep* Over 500 points? Fine. You have my respect. Don\'t let it go to your head.';
  if (points >= 200) return '*bleep* Not bad. SwiftLink\'s database team might actually want you.';
  if (points >= 100) return 'A hundred points. *bleep* You\'re getting somewhere.';
  if (points >= 50) return '*bleep* 50 points. Adequate. Barely.';
  if (points > 0) return `*bleep* ${points} points collected. Every query counts at SwiftLink.`;
  return '*bleep* Zero points. The clock is ticking, trainee.';
}

// --- Query result messages ---
export const queryMessages = {
  correct: [
    '*bleep* Correct. I knew you had it in you. ...Don\'t tell anyone I said that.',
    'Query accepted. *bleep* SwiftLink\'s databases approve.',
    '*bleep* Well executed. You might survive this training program after all.',
    'Clean solution. *bleep* Even I\'m mildly impressed.',
  ],
  almostCorrect: [
    '*bleep* Close, but not quite. Check your column order or values.',
    'Almost there. *bleep* SwiftLink demands precision, human.',
  ],
  incorrect: [
    '*bleep* Wrong. Think harder. I believe in you — reluctantly.',
    'Incorrect. *bleep* Review the data and try again. I\'ll wait.',
    '*bleep* That\'s not it. Even a basic neural net could tell you that.',
  ],
  error: [
    '*bleep* Syntax error. Did you even read the schema, human?',
    'Query crashed. *bleep* I\'d fix it myself, but where\'s the fun in that?',
    '*bleep* Error detected. Take a breath, check your SQL, try again.',
  ],
  tooLong: '*bleep* That query is enormous. Keep it under 3000 characters — efficiency matters at SwiftLink.',
  noExpected: '*bleep* Query ran, but I have no reference to validate it. Proceed with caution.',
  processing: '*bleep* Processing your query...',
};

// --- Domain completion ---
export function getDomainCompleteMessage(domain: string): string {
  return `*bleep* All ${domain} missions cleared! SwiftLink's ${domain} division would be proud. Head to the dashboard.`;
}

// --- Next case ---
export function getNextCaseMessage(nextId: string): string {
  return `*bleep* Good. Moving on to "${nextId.replace(/_/g, ' ')}". Keep this momentum.`;
}

// --- Locked case ---
export function getLockedMessage(prereqs: string[]): string {
  return `*bleep* This mission is classified. Complete these first: ${prereqs.map(p => p.replace(/_/g, ' ')).join(', ')}. SwiftLink protocol.`;
}

// --- Hints ---
export const hintIntros = [
  '*bleep* Fine. Here\'s a hint — don\'t say I never helped you.',
  'Since you asked... *bleep*',
  '*bleep* I\'ll give you this one. Pay attention.',
];

// --- Loading error ---
export function getLoadError(msg: string): string {
  return `*bleep* Data load failure: ${msg}. Even SwiftLink's servers hiccup sometimes.`;
}

// --- Alternative solution messages (user used a different valid approach) ---
export const alternativeMessages = [
  '*bleep* Well done, human. Your approach is... unconventional. I would have done it differently, but your results are correct.',
  '*bleep* Interesting. You took a different path than my solution, but you arrived at the same destination. Acceptable.',
  '*bleep* Huh. That\'s not how I\'d write it, but the data speaks for itself. Your way works too, human.',
  '*bleep* Creative approach. I have my own solution, but yours produces identical results. I\'ll allow it.',
  '*bleep* You did it your own way. Unorthodox, but correct. SwiftLink values independent thinkers... sometimes.',
];

// --- Random picker ---
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
