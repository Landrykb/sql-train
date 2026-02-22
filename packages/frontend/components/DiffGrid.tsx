'use client';
import React from 'react';

interface DiffGridProps {
  actual: Record<string, any>[];
  expected: Record<string, any>[];
  expectedColumns?: string[];
}

export default function DiffGrid({ actual, expected, expectedColumns }: DiffGridProps) {
  if ((!actual || actual.length === 0) && (!expected || expected.length === 0)) {
    return <p className="text-sm text-gray-500">No data to compare.</p>;
  }

  const actCols = actual.length > 0 ? Object.keys(actual[0]) : [];
  const expCols = expectedColumns && expectedColumns.length > 0 ? expectedColumns : (expected.length > 0 ? Object.keys(expected[0]) : []);
  const allCols = Array.from(new Set([...actCols, ...expCols]));
  const missingCols = expCols.filter((c) => !actCols.includes(c));
  const extraCols = actCols.filter((c) => !expCols.includes(c));
  const maxRows = Math.max(actual.length, expected.length);

  return (
    <div className="space-y-3">
      {(missingCols.length > 0 || extraCols.length > 0) && (
        <div className="text-xs space-y-1">
          {missingCols.length > 0 && (
            <p className="text-red-600">Missing columns: <code className="bg-red-50 px-1 rounded">{missingCols.join(', ')}</code></p>
          )}
          {extraCols.length > 0 && (
            <p className="text-amber-600">Extra columns: <code className="bg-amber-50 px-1 rounded">{extraCols.join(', ')}</code></p>
          )}
        </div>
      )}
      <div className="flex gap-1 text-xs mb-1">
        <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded-sm" /> Missing/Wrong
        <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded-sm ml-2" /> Correct
        <span className="inline-block w-3 h-3 bg-amber-100 border border-amber-300 rounded-sm ml-2" /> Extra
      </div>
      <div className="overflow-auto max-h-[400px]">
        <table className="min-w-full table-auto border-collapse text-xs">
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-gray-200 text-left">#</th>
              {allCols.map((c) => (
                <th
                  key={c}
                  className={`border px-2 py-1 text-left ${
                    missingCols.includes(c) ? 'bg-red-100 text-red-800' : extraCols.includes(c) ? 'bg-amber-100 text-amber-800' : 'bg-gray-100'
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(maxRows, 20) }).map((_, i) => {
              const actRow = actual[i];
              const expRow = expected[i];
              return (
                <tr key={i}>
                  <td className="border px-2 py-1 bg-gray-50 font-mono">{i + 1}</td>
                  {allCols.map((c) => {
                    const actVal = actRow?.[c];
                    const expVal = expRow?.[c];
                    const actStr = actVal?.toString() ?? '';
                    const expStr = expVal?.toString() ?? '';
                    const isMatch = actStr === expStr;
                    const isMissingRow = !actRow && !!expRow;
                    const isExtraRow = !!actRow && !expRow;

                    let bgClass = '';
                    if (isMissingRow) bgClass = 'bg-red-50 text-red-700';
                    else if (isExtraRow) bgClass = 'bg-amber-50 text-amber-700';
                    else if (!isMatch) bgClass = 'bg-red-50';
                    else bgClass = 'bg-green-50';

                    return (
                      <td key={c} className={`border px-2 py-1 ${bgClass}`}>
                        {actRow ? (
                          <>
                            <span>{actStr || <em className="text-gray-400">null</em>}</span>
                            {!isMatch && expRow && (
                              <div className="text-[10px] text-red-500 mt-0.5">expected: {expStr || 'null'}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-red-400 italic">expected: {expStr || 'null'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {maxRows > 20 && (
          <p className="text-xs text-gray-500 mt-2">Showing first 20 of {maxRows} rows...</p>
        )}
      </div>
    </div>
  );
}
