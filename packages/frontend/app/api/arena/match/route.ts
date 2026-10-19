import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { caseOrder, domainFolderMap } from '@/lib/constants';
import { cloudTrials } from '@/lib/cloud/trials';
import { LAB_SKILL_QUESTIONS, LAB_GENERIC_QUESTIONS } from '@/lib/lab/questions';
import { PYTHON_DUELS, CLOUD_MISSION_META } from '@/lib/arena/codeDuels';

const MAX_ROUNDS = 3;

type Tier = 'rookie' | 'pro' | 'boss';
const TIERS: Tier[] = ['rookie', 'pro', 'boss'];

// SQL verses: which slice of the domain's case order each tier plays.
const SQL_TIER_SLICES: Record<Tier, [number, number]> = {
  rookie: [0, 3],
  pro: [2, 5],
  boss: [3, 6],
};

// Quiz verses: question difficulty pools per tier.
const QUIZ_TIER_DIFFICULTY: Record<Tier, string[]> = {
  rookie: ['easy', 'medium'],
  pro: ['medium', 'hard'],
  boss: ['hard', 'expert'],
};

function pickDeterministic<T>(arr: T[], n: number, salt: string): T[] {
  // Stable per-request pick so a match's rounds are consistent.
  let h = 0;
  for (const ch of salt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(copy.splice(h % copy.length, 1)[0]);
  }
  return out;
}

async function sqlRounds(domain: string, tier: Tier) {
  const folder = domainFolderMap[domain];
  if (!folder) return null;
  const [a, b] = SQL_TIER_SLICES[tier];
  const ids = (caseOrder[domain] ?? []).slice(a, b);
  const rounds = [];
  for (const id of ids) {
    const filePath = path.join(process.cwd(), 'cases', folder, `${id}.yaml`);
    try {
      const c = load(await fs.readFile(filePath, 'utf-8')) as any;
      if (!c?.id) continue;
      rounds.push({
        type: 'sql',
        id: c.id,
        name: c.name,
        tier: c.tier,
        instructions: c.instructions,
        skills: c.skills ?? [],
        datasets: c.datasets ?? [],
        schema: (c.schema ?? []).map((t: any) => ({
          name: t.name,
          columns: (t.columns ?? []).map((col: any) => ({ name: col.name, type: col.type })),
        })),
        solutionQuery: c.solutionQuery ?? '',
        seedQuery: c.seedQuery ?? '',
      });
    } catch (err) {
      console.error(`[arena] failed to load case ${id}:`, err);
    }
  }
  return rounds;
}

function cloudRounds(tier: Tier) {
  // Single-answer questions only — quiz duels pick one option.
  const pool = cloudTrials.filter((q) => QUIZ_TIER_DIFFICULTY[tier].includes(q.difficulty) && !Array.isArray(q.answer));
  const quizzes = pickDeterministic(pool, MAX_ROUNDS - 1, `cloud-${tier}-${Date.now() / 86400000 | 0}`).map((q) => ({
    type: 'quiz',
    id: q.id,
    name: `${q.provider === 'multi' ? 'Multi-Cloud' : String(q.provider).toUpperCase()} · ${q.topic}`,
    tier: q.difficulty,
    instructions: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    hint: q.hint,
    skills: [q.topic],
  }));
  // Final round: a real build mission inside the cloud sandbox.
  const mission = pickDeterministic(CLOUD_MISSION_META, 1, `cloud-mission-${Date.now() / 86400000 | 0}`)[0];
  return [...quizzes, {
    type: 'cloud',
    id: mission.id,
    name: `⚒ Build Mission · ${mission.name}`,
    tier: 'build',
    instructions: mission.instructions,
    skills: [mission.service, 'sandbox'],
  }];
}

function labRounds(tier: Tier) {
  const pool = [
    ...Object.values(LAB_SKILL_QUESTIONS).flat(),
    ...LAB_GENERIC_QUESTIONS,
  ].filter((q) => q.type === 'multiple_choice' && q.options?.length);
  const picked = pickDeterministic(pool, MAX_ROUNDS - 1, `lab-${tier}-${Date.now() / 86400000 | 0}`);
  const quizzes = picked.map((q, i) => ({
    type: 'quiz',
    id: `lab-${i}`,
    name: 'Data Science · Lab Arena',
    tier,
    instructions: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    skills: ['python', 'data-science'],
  }));
  // Final round: a real Python coding duel executed in Pyodide.
  const duel = pickDeterministic(PYTHON_DUELS, 1, `lab-duel-${Date.now() / 86400000 | 0}`)[0];
  return [...quizzes, {
    type: 'python',
    id: duel.id,
    name: `⚒ Code Duel · ${duel.name}`,
    tier: 'build',
    instructions: duel.instructions,
    setup: duel.setup,
    solution: duel.solution,
    buggy: duel.buggy,
    check: duel.check,
    starter: duel.starter,
    skills: ['python', 'data-science'],
  }];
}

/**
 * GET /api/arena/match?verse=sql|cloud|lab&domain=business&tier=rookie|pro|boss
 * sql verse → real case rounds (SQL executed + compared).
 * cloud/lab verses → quiz duels from the existing question banks.
 */
export async function GET(req: NextRequest) {
  const verse = req.nextUrl.searchParams.get('verse') ?? 'sql';
  const domain = req.nextUrl.searchParams.get('domain') ?? 'business';
  const tierParam = req.nextUrl.searchParams.get('tier') ?? 'rookie';
  const tier = (TIERS.includes(tierParam as Tier) ? tierParam : 'rookie') as Tier;

  let rounds: any[] | null = null;
  if (verse === 'cloud') rounds = cloudRounds(tier);
  else if (verse === 'lab') rounds = labRounds(tier);
  else rounds = await sqlRounds(domain, tier);

  if (!rounds) {
    return NextResponse.json({ error: `Unknown domain "${domain}"` }, { status: 400 });
  }
  if (rounds.length === 0) {
    return NextResponse.json({ error: `No rounds found for ${verse}/${domain}/${tier}` }, { status: 404 });
  }
  return NextResponse.json({ verse, domain, tier, rounds });
}
