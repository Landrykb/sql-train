// packages/frontend/components/Table.tsx
'use client';
import React from 'react';

export default function DataGrid({ data }: { data: Record<string, any>[] }) {
  if (!data.length) return <p className="text-sm text-gray-500">No rows to display.</p>;

  const cols = Object.keys(data[0]);
  return (
    <div className="overflow-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} className="border px-2 py-1 bg-gray-100 text-left text-xs">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {cols.map(c => (
                <td key={c} className="border px-2 py-1 text-xs">
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