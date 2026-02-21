// packages/frontend/lib/compare.ts

/**
 * Compare SQL results (grid) against an expected 2D array of values.
 *
 * @param grid      Array of row‐objects coming out of runQuery()
 * @param expected  A 2D array [ [v11, v12, …], [v21, v22, …], … ]
 * @param solutionQuery  The “correct” SQL (for advanced feedback, if you want)
 * @param userQuery      The user’s SQL (for advanced feedback)
 * @param requiredSkills List of skills to check for (SELECT, WHERE, etc)
 */
export async function compareResults(
  grid: Record<string, string | number | null>[],
  expected: (string | number | null)[][],   // <-- 2D array now
  solutionQuery: string,
  userQuery: string,
  requiredSkills: string[]
): Promise<{ correct: boolean; feedback: string }> {
  // 1) Normalize SQL for clause checks
  const normalize = (q: string) => q.replace(/\s+/g, ' ').trim().toUpperCase();
  const upper = normalize(userQuery);

  const clauseChecks: Record<string, RegExp> = {
    select: /SELECT\b/,
    where: /WHERE\b/,
    order: /ORDER\s+BY\b/,
    limit: /LIMIT\s+\d+/,
    group: /GROUP\s+BY\b/,
    sum: /SUM\s*\(/,
    avg: /AVG\s*\(/,
    count: /COUNT\s*\(/,
    join: /\b(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|JOIN)\b/,
    window: /OVER\s*\(/,
    cte: /WITH\b/,
    subquery: /\(\s*SELECT\b/,
    case: /CASE\b/,
  };

  for (const skill of requiredSkills) {
    const re = clauseChecks[skill];
    if (!re) {
      console.warn(`No clause check defined for skill "${skill}"`);
      continue;
    }
    if (!re.test(upper)) {
      return {
        correct: false,
        feedback: `Query missing required ${skill.toUpperCase()} clause.`,
      };
    }
  }

  // 2) Row count
  if (grid.length === 0 && expected.length > 0) {
    return { correct: false, feedback: `No rows returned. Expected ${expected.length}.` };
  }
  if (grid.length !== expected.length) {
    return {
      correct: false,
      feedback: `Expected ${expected.length} rows, but got ${grid.length}.`,
    };
  }

  // 3) Column count
  const cols = Object.keys(grid[0] || {});
  if (cols.length !== expected[0].length) {
    return {
      correct: false,
      feedback: `Expected ${expected[0].length} columns, but got ${cols.length}.`,
    };
  }

  // 4) Build actual 2D array (aligning with cols order)
  const actual: (string | number | null)[][] = grid.map((row, ri) =>
    cols.map((c) => {
      const v = row[c];
      if (v === undefined) {
        console.warn(`Row ${ri + 1}, column "${c}" is undefined`);
        return null;
      }
      return typeof v === 'number' ? Number(v.toFixed(4)) : v;
    })
  );

  // 5) Compare cell-by-cell, but coerce to strings for any non-numeric mismatches
  for (let r = 0; r < expected.length; r++) {
    for (let c = 0; c < expected[r].length; c++) {
      const e = expected[r][c];
      const a = actual[r][c];

      // both null
      if (e === null && a === null) continue;

      // numeric tolerance
      if (typeof e === 'number' && typeof a === 'number') {
        if (Math.abs(e - a) > 0.0001) {
          return {
            correct: false,
            feedback: `Row ${r + 1}, column ${c + 1}: expected ${e}, but got ${a}.`,
          };
        }
        continue;
      }

      // otherwise coerce to string for comparison
      if (`${e}` !== `${a}`) {
        return {
          correct: false,
          feedback: `Row ${r + 1}, column ${c + 1}: expected "${e}", but got "${a}".`,
        };
      }
    }
  }

  // 6) All good!
  return { correct: true, feedback: 'Correct' };
}