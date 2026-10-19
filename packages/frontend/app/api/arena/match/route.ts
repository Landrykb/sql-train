import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { caseOrder, domainFolderMap } from '@/lib/constants';

const MAX_ROUNDS = 3;

/**
 * GET /api/arena/match?domain=business
 * Returns the first MAX_ROUNDS cases of a domain as an arena match card:
 * instructions, datasets, schema, and the canonical solutionQuery
 * (same data the playground already ships to the client for validation).
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain') ?? 'business';
  const folder = domainFolderMap[domain];
  if (!folder) {
    return NextResponse.json({ error: `Unknown domain "${domain}"` }, { status: 400 });
  }

  const ids = (caseOrder[domain] ?? []).slice(0, MAX_ROUNDS);
  const rounds = [];

  for (const id of ids) {
    const filePath = path.join(process.cwd(), 'cases', folder, `${id}.yaml`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const c = load(raw) as any;
      if (!c?.id) continue;
      rounds.push({
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

  if (rounds.length === 0) {
    return NextResponse.json({ error: `No cases found for domain "${domain}"` }, { status: 404 });
  }

  return NextResponse.json({ domain, rounds });
}
