/**
 * Server-side result-set comparison for SQL duel attempts.
 *
 * A pure port of the comparison core of `lib/compare.ts` (normalizeCell,
 * rowSignature, compareResultSets) with NO browser imports, so Route
 * Handlers can recompute SQL verdicts from submitted result rows. The
 * semantics are deliberately identical to the in-browser checker:
 *  - numbers rounded to 2 decimal places, strings trimmed + lowercased,
 *    null/undefined → a single null sentinel;
 *  - rows compared as positional value signatures (column NAMES ignored);
 *  - order-insensitive multiset comparison (missing/extra row counts).
 *
 * One deliberate extension: YAML `expected` blocks can carry Date objects
 * (js-yaml parses unquoted dates), which the browser never sees because
 * its expected rows arrive as JSON. Dates normalize to their ISO date
 * part here so a server recompute matches what the case intended.
 *
 * Spec note (frozen spec §3a/§5 step 3): per-task `ordered`,
 * `compare_column_names` and explicit tolerance are carried on the
 * TaskSpec but NOT yet honored by this comparison — v1 compares exactly
 * like today's checker. Tightening is a later, separate step.
 */

export interface SqlVerdict {
  correct: boolean;
  missing_rows: number;
  extra_rows: number;
  error_type: string | null;
}

export function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return '__NULL__';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return Number(v.toFixed(2)).toString();
  return String(v).trim().toLowerCase();
}

export function rowSignature(row: Record<string, unknown>): string {
  return Object.values(row).map(normalizeCell).join('|');
}

export function compareResultSets(
  actual: Record<string, unknown>[],
  expected: Record<string, unknown>[],
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
 * Align expected rows to the submitted rows' shape, mirroring how
 * `lib/compare.ts` strategy 2 maps expected values through the result
 * grid's columns:
 *  - submitted rows are objects → expected values are picked BY COLUMN
 *    NAME in the submitted rows' key order (a missing column reads null);
 *  - submitted rows are arrays → both sides go positional (c0, c1, …).
 */
function alignRows(
  submitted: unknown[],
  expected: Record<string, unknown>[],
): { actual: Record<string, unknown>[]; expected: Record<string, unknown>[] } {
  const first = submitted[0];
  if (Array.isArray(first)) {
    const toPositional = (row: unknown): Record<string, unknown> => {
      const vals = Array.isArray(row) ? row : Object.values(row as Record<string, unknown>);
      const out: Record<string, unknown> = {};
      vals.forEach((v, i) => { out[`c${i}`] = v; });
      return out;
    };
    return {
      actual: submitted.map(toPositional),
      expected: expected.map(toPositional),
    };
  }
  const keys = Object.keys((first ?? {}) as Record<string, unknown>);
  return {
    actual: submitted as Record<string, unknown>[],
    expected: expected.map((row) => {
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = row?.[k] ?? null;
      return out;
    }),
  };
}

/**
 * Recompute the SQL verdict for one attempt from its submitted result
 * rows and the case's expected rows. The client's own verdict is never
 * an input here — that is the point of `verified_by: 'server_recompute'`.
 */
export function sqlVerdictForRows(submittedRows: unknown[], expectedRows: Record<string, unknown>[]): SqlVerdict {
  if (!Array.isArray(expectedRows) || expectedRows.length === 0) {
    return { correct: false, missing_rows: 0, extra_rows: 0, error_type: 'no_expected_rows' };
  }
  const { actual, expected } = alignRows(submittedRows, expectedRows);
  const { match, missingRows, extraRows } = compareResultSets(actual, expected);
  return {
    correct: match,
    missing_rows: missingRows,
    extra_rows: extraRows,
    error_type: match ? null : 'row_mismatch',
  };
}
