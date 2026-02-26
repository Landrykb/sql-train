'use client';

import React from 'react';

/**
 * Tokenize SQL into words, preserving whitespace structure.
 * Splits on word boundaries while keeping punctuation attached.
 */
function tokenize(sql: string): string[] {
  return sql.split(/(\s+|,|\(|\)|;)/).filter(Boolean);
}

/**
 * Compute LCS table for two token arrays (word-level diff).
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1].toLowerCase() === b[j - 1].toLowerCase()
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

type DiffToken = { text: string; type: 'same' | 'added' | 'removed' };

/**
 * Produce a word-level diff between userQuery and solutionQuery.
 * - 'removed' = in user query but not in solution (red strikethrough)
 * - 'added' = in solution but not in user query (green highlight)
 * - 'same' = in both
 */
function diffTokens(userSql: string, solutionSql: string): DiffToken[] {
  const a = tokenize(userSql);
  const b = tokenize(solutionSql);
  const dp = lcsTable(a, b);

  const result: DiffToken[] = [];
  let i = a.length, j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
      result.push({ text: b[j - 1], type: 'same' });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ text: b[j - 1], type: 'added' });
      j--;
    } else {
      result.push({ text: a[i - 1], type: 'removed' });
      i--;
    }
  }

  return result.reverse();
}

interface SqlDiffProps {
  userQuery: string;
  solutionQuery: string;
}

export default function SqlDiff({ userQuery, solutionQuery }: SqlDiffProps) {
  const tokens = diffTokens(userQuery.trim(), solutionQuery.trim());

  return (
    <pre className="text-sm whitespace-pre-wrap leading-relaxed" aria-label="Solution diff">
      {tokens.map((tok, i) => {
        if (tok.type === 'added') {
          return (
            <span key={i} className="bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded px-0.5">
              {tok.text}
            </span>
          );
        }
        if (tok.type === 'removed') {
          return (
            <span key={i} className="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 line-through rounded px-0.5 opacity-70">
              {tok.text}
            </span>
          );
        }
        return <span key={i} className="text-bleepx-gray">{tok.text}</span>;
      })}
    </pre>
  );
}
