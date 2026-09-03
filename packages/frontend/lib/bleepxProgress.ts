/**
 * Bleepx Progress — a single source of truth for "what has this user done, and
 * what should they do next" across all three verses (SQL/BleepxQuery,
 * BleepxLab, BleepxCloud). Used by the Dashboard page and by the Bleepx
 * chat assistant so both give the same, personalized recommendation.
 */
import { caseOrder, fullCaseOrder } from './constants';
import { LAB_CASE_ORDER, LAB_DOMAIN_META } from './labConstants';
import { CLOUD_MISSIONS, CLOUD_PROVIDER_META, cloudMissionId, type CloudProvider } from './cloud';

const SQL_DOMAINS = Object.keys(caseOrder);
const JOURNEY_STORAGE = 'bleepx-journey';

export interface NextStep {
  title: string;
  href: string;
  verse: string;
  pct: number;
}

export interface VerseStats {
  total: number;
  done: number;
  pct: number;
  next: NextStep | null;
}

export interface ProgressSnapshot {
  sql: VerseStats;
  lab: VerseStats;
  cloud: VerseStats;
  recommended: NextStep;
  journeyGoals: string[] | null;
}

export function domainLabel(domain: string): string {
  const labels: Record<string, string> = {
    business: 'Business',
    crime: 'Crime',
    farming: 'Farming',
    finance: 'Finance',
    healthcare: 'Healthcare',
    social: 'Social',
    space: 'Space',
    sports: 'Sports',
  };
  return labels[domain] || domain;
}

function readJourney(): { plan?: { suggested?: string[]; totalTime?: string } } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Compute per-verse completion stats + a single best "what's next" recommendation. */
export function getProgressSnapshot(completed: Set<string>): ProgressSnapshot {
  // ── SQL ──
  let sqlTotal = 0;
  let sqlDone = 0;
  let nextSQL: NextStep | null = null;
  SQL_DOMAINS.forEach((d) => {
    const cases = fullCaseOrder[d] || [];
    sqlTotal += cases.length;
    cases.forEach((c) => { if (completed.has(c)) sqlDone++; });
    if (!nextSQL) {
      const firstUnsolved = cases.find((c) => !completed.has(c));
      if (firstUnsolved) nextSQL = { title: `${domainLabel(d)} — ${firstUnsolved}`, href: `/cases/${d}/${firstUnsolved}`, verse: 'BleepxQuery', pct: 0 };
    }
  });

  // ── Lab ──
  const labDomains = Object.keys(LAB_CASE_ORDER);
  let labTotal = 0;
  let labDone = 0;
  let nextLab: NextStep | null = null;
  labDomains.forEach((d) => {
    const cases = LAB_CASE_ORDER[d];
    labTotal += cases.length;
    cases.forEach((c) => { if (completed.has(c) || completed.has(`lab_${c}`)) labDone++; });
    if (!nextLab) {
      const firstUnsolved = cases.find((c) => !completed.has(c) && !completed.has(`lab_${c}`));
      if (firstUnsolved) nextLab = { title: `${LAB_DOMAIN_META[d]?.name || d} — ${firstUnsolved}`, href: `/lab/${d}/${firstUnsolved}`, verse: 'BleepxLab', pct: 0 };
    }
  });

  // ── Cloud ──
  let cloudTotal = 0;
  let cloudDone = 0;
  let nextCloud: NextStep | null = null;
  (Object.keys(CLOUD_MISSIONS) as CloudProvider[]).forEach((p) => {
    const missions = CLOUD_MISSIONS[p] || [];
    cloudTotal += missions.length;
    missions.forEach((m) => {
      if (completed.has(cloudMissionId(p, m.slug))) cloudDone++;
      else if (!nextCloud) nextCloud = { title: `${CLOUD_PROVIDER_META[p].short} — ${m.title}`, href: `/cloud/${p}/${m.slug}`, verse: 'BleepxCloud', pct: 0 };
    });
  });

  const sql: VerseStats = { total: sqlTotal, done: sqlDone, pct: sqlTotal ? Math.round((sqlDone / sqlTotal) * 100) : 0, next: nextSQL };
  const lab: VerseStats = { total: labTotal, done: labDone, pct: labTotal ? Math.round((labDone / labTotal) * 100) : 0, next: nextLab };
  const cloud: VerseStats = { total: cloudTotal, done: cloudDone, pct: cloudTotal ? Math.round((cloudDone / cloudTotal) * 100) : 0, next: nextCloud };

  const journey = readJourney();
  const journeyGoals = journey?.plan?.suggested ?? null;

  let recommended: NextStep;
  if (!journeyGoals || journeyGoals.length === 0) {
    if (sql.pct < 25) recommended = sql.next || { title: 'Start with SQL basics', href: '/cases/business/basics_select', verse: 'BleepxQuery', pct: 0 };
    else if (lab.pct < 25) recommended = lab.next || { title: 'Try a BleepxLab project', href: '/lab/churn/churn_explore', verse: 'BleepxLab', pct: 0 };
    else if (cloud.pct < 25) recommended = cloud.next || { title: 'Open the Cloud Sandbox', href: '/cloud/sandbox', verse: 'BleepxCloud', pct: 0 };
    else recommended = sql.next || lab.next || cloud.next || { title: 'Pick your next goal', href: '/journey', verse: 'Journey', pct: 0 };
  } else {
    const goal = journeyGoals[0];
    if (goal === 'sql') recommended = sql.next || { title: 'SQL practice', href: '/cases', verse: 'BleepxQuery', pct: 0 };
    else if (goal === 'python' || goal === 'datascience' || goal === 'machine-learning' || goal === 'carbon') recommended = lab.next || { title: 'BleepxLab', href: '/lab', verse: 'BleepxLab', pct: 0 };
    else if (goal === 'cloud' || goal === 'saa') recommended = cloud.next || { title: 'Cloud Sandbox', href: '/cloud/sandbox', verse: 'BleepxCloud', pct: 0 };
    else if (goal === 'llm') recommended = { title: 'LLM & AI track — start at Hugging Face datasets', href: '/journey', verse: 'AI/LLM', pct: 0 };
    else recommended = sql.next || { title: 'Start your journey', href: '/journey', verse: 'Journey', pct: 0 };
  }

  return { sql, lab, cloud, recommended, journeyGoals };
}

/** Compact, LLM-friendly summary of the user's progress (used as context for the /api/bleepx route). */
export function formatProgressForPrompt(snap: ProgressSnapshot, points: number): string {
  const lines = [
    `SQL (BleepxQuery): ${snap.sql.done}/${snap.sql.total} solved (${snap.sql.pct}%)`,
    `Data Science (BleepxLab): ${snap.lab.done}/${snap.lab.total} solved (${snap.lab.pct}%)`,
    `Cloud (BleepxCloud): ${snap.cloud.done}/${snap.cloud.total} solved (${snap.cloud.pct}%)`,
    `Points balance: ${points}`,
  ];
  if (snap.journeyGoals?.length) lines.push(`Journey goals selected: ${snap.journeyGoals.join(', ')}`);
  lines.push(`Best next step suggestion: "${snap.recommended.title}" at ${snap.recommended.href}`);
  return lines.join('\n');
}

/** A short, human-readable personalized status line for chat bubbles. */
export function formatProgressChat(snap: ProgressSnapshot, points: number, name?: string | null): string {
  const who = name ? `${name}, ` : '';
  const parts: string[] = [];
  parts.push(`${who}here's where you stand: SQL ${snap.sql.done}/${snap.sql.total} (${snap.sql.pct}%), Lab ${snap.lab.done}/${snap.lab.total} (${snap.lab.pct}%), Cloud ${snap.cloud.done}/${snap.cloud.total} (${snap.cloud.pct}%), ${points} pts banked.`);
  if (snap.journeyGoals?.length) {
    parts.push(`Your journey plan is focused on ${snap.journeyGoals.join(', ')}.`);
  }
  parts.push(`My pick for what to do next: **${snap.recommended.title}**.`);
  return parts.join(' ');
}
