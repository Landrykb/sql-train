// packages/frontend/components/Table.tsx
'use client';
import React from 'react';

export default function DataGrid({ data }: { data: Record<string, any>[] }) {
  if (!data.length) return <p className="text-sm text-gray-500 dark:text-gray-400">No rows to display.</p>;

  const cols = Object.keys(data[0]);
  return (
    <div className="overflow-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} className="border border-gray-200 dark:border-gray-600 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-left text-xs text-gray-700 dark:text-gray-200">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
              {cols.map(c => (
                <td key={c} className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs text-gray-800 dark:text-gray-200">
                  {row[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}