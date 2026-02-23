// packages/frontend/lib/compare.ts
import { runQuery } from '@/lib/sqlClient/browser';

/**
 * Normalize a cell value for comparison.
 * Rounds numbers to 2 decimal places, trims strings, lowercases.
 */
function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return '__NULL__';
  if (typeof v === 'number') return Number(v.toFixed(2)).toString();
  return String(v).trim().toLowerCase();
}

/**
 * Turn a row-object into a sorted canonical string for set-based comparison.
 */
function rowSignature(row: Record<string, unknown>): string {
  return Object.values(row).map(normalizeCell).join('|');
}

/**
 * Compare two result sets ignoring row order.
 * Returns { match, missingRows, extraRows }.
 */
function compareResultSets(
  actual: Record<string, unknown>[],
  expected: Record<string, unknown>[]
): { match: boolean; missingRows: number; extraRows: number } {
  const expectedSigs = new Map<string, number>();
  for (const row of expected) {
    const sig = rowSignature(row);
    expectedSigs.set(sig, (expectedSigs.get(sig) || 0) + 1);
  }
  let extraRows = 0;
  for (const row of actual) {
    const sig = rowSignature(row);
    const count = expectedSigs.get(sig);
    if (count && count > 0) {
      expectedSigs.set(sig, count - 1);
    } else {
      extraRows++;
    }
  }
  let missingRows = 0;
  for (const count of expectedSigs.values()) {
    missingRows += count;
  }
  return { match: missingRows === 0 && extraRows === 0, missingRows, extraRows };
}

/**
 * Flexible query validation.
 *
 * Strategy:
 * 1. If a solutionQuery exists, run it and compare result DATA against the user's results.
 *    This allows users to write different SQL that produces the same output.
 * 2. Fall back to comparing against the static expected array.
 * 3. Check required SQL skill clauses.
 */
export async function compareResults(
  grid: Record<string, string | number | null>[],
  expected: (string | number | null)[][],
  solutionQuery: string,
  userQuery: string,
  requiredSkills: string[]
): Promise<{ correct: boolean; feedback: string; alternative?: boolean }> {
  const normalize = (q: string) => q.replace(/\s+/g, ' ').trim().toUpperCase();
  const upper = normalize(userQuery);

  // --- Clause checks (only warn, don't block if data matches) ---
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

  const missingClauses: string[] = [];
  for (const skill of requiredSkills) {
    const re = clauseChecks[skill];
    if (re && !re.test(upper)) {
      missingClauses.push(skill.toUpperCase());
    }
  }

  // --- Strategy 1: Dynamic comparison against solution query output ---
  if (solutionQuery && solutionQuery.trim()) {
    try {
      const solResult = await runQuery(solutionQuery);
      const solCols = solResult?.columns ?? [];
      const solData = solResult?.data ?? [];
      const solGrid = solData.map((row: unknown[]) =>
        Object.fromEntries(solCols.map((c, i) => [c, row[i]]))
      ) as Record<string, unknown>[];

      if (solGrid.length > 0) {
        // Check if same number of columns (by value count, not name)
        const userColCount = Object.keys(grid[0] || {}).length;
        const solColCount = solCols.length;

        // Compare data values only (ignore column names)
        const userValues = grid.map((row) => {
          const vals: Record<string, unknown> = {};
          Object.values(row).forEach((v, i) => { vals[`c${i}`] = v; });
          return vals;
        });
        const solValues = solGrid.map((row) => {
          const vals: Record<string, unknown> = {};
          Object.values(row).forEach((v, i) => { vals[`c${i}`] = v; });
          return vals;
        });

        // Exact match (same order)?
        const exactMatch = userValues.length === solValues.length &&
          userValues.every((row, i) => rowSignature(row) === rowSignature(solValues[i]));

        if (exactMatch) {
          // Check if user used a different query than solution
          const isSameQuery = normalize(userQuery) === normalize(solutionQuery);
          if (!isSameQuery && missingClauses.length === 0) {
            return { correct: true, feedback: 'Correct', alternative: true };
          }
          if (missingClauses.length > 0) {
            return {
              correct: true,
              feedback: `Correct`,
              alternative: !isSameQuery,
            };
          }
          return { correct: true, feedback: 'Correct' };
        }

        // Set-based match (same data, different order)?
        if (userColCount === solColCount) {
          const setResult = compareResultSets(userValues, solValues);
          if (setResult.match) {
            const isSameQuery = normalize(userQuery) === normalize(solutionQuery);
            return { correct: true, feedback: 'Correct', alternative: !isSameQuery };
          }
        }

        // Data doesn't match solution output — provide feedback
        if (grid.length !== solGrid.length) {
          return {
            correct: false,
            feedback: `*bleep* Expected ${solGrid.length} rows, got ${grid.length}. Check your filters and conditions.`,
          };
        }
        if (userColCount !== solColCount) {
          return {
            correct: false,
            feedback: `*bleep* Expected ${solColCount} columns, got ${userColCount}. Check your SELECT clause.`,
          };
        }
        return {
          correct: false,
          feedback: `*bleep* Row count matches but the values differ. Double-check your logic and aggregations.`,
        };
      }
    } catch (err) {
      console.warn('[compare] Solution query execution failed, falling back to static expected:', err);
      // Fall through to static comparison
    }
  }

  // --- Strategy 2: Static comparison against expected array ---
  if (!expected || expected.length === 0) {
    return { correct: false, feedback: '*bleep* No expected output configured for this challenge.' };
  }

  if (grid.length === 0 && expected.length > 0) {
    return { correct: false, feedback: `*bleep* No rows returned. Expected ${expected.length}.` };
  }
  if (grid.length !== expected.length) {
    return {
      correct: false,
      feedback: `*bleep* Expected ${expected.length} rows, but got ${grid.length}.`,
    };
  }

  const cols = Object.keys(grid[0] || {});
  if (cols.length !== expected[0].length) {
    return {
      correct: false,
      feedback: `*bleep* Expected ${expected[0].length} columns, but got ${cols.length}.`,
    };
  }

  // Build actual 2D array
  const actual: (string | number | null)[][] = grid.map((row) =>
    cols.map((c) => {
      const v = row[c];
      if (v === undefined) return null;
      return typeof v === 'number' ? Number(v.toFixed(2)) : v;
    })
  );

  // Cell-by-cell comparison with tolerance
  for (let r = 0; r < expected.length; r++) {
    for (let c = 0; c < expected[r].length; c++) {
      const e = expected[r][c];
      const a = actual[r][c];
      if (e === null && a === null) continue;
      if (typeof e === 'number' && typeof a === 'number') {
        if (Math.abs(e - a) > 0.01) {
          return {
            correct: false,
            feedback: `*bleep* Row ${r + 1}, column ${c + 1}: expected ${e}, got ${a}.`,
          };
        }
        continue;
      }
      if (normalizeCell(e) !== normalizeCell(a)) {
        return {
          correct: false,
          feedback: `*bleep* Row ${r + 1}, column ${c + 1}: expected "${e}", got "${a}".`,
        };
      }
    }
  }

  // Check missing clauses — warn but still pass
  if (missingClauses.length > 0) {
    return { correct: true, feedback: 'Correct' };
  }

  return { correct: true, feedback: 'Correct' };
}