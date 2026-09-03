'use client'
import React, { useEffect } from 'react'

export function DataGrid({ data }: { data: Record<string, any>[] }) {
  useEffect(() => {
    if (data && data.length > 0) {
      console.log('[DataGrid] cols:', Object.keys(data[0]), 'rows:', data.length, 'first:', data[0]);
    }
  }, [data]);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-bleepx-text-secondary">No rows to display.</p>
  }
  const cols = Object.keys(data[0])
  if (cols.length === 0) {
    return <p className="text-sm text-bleepx-text-secondary">Query returned {data.length} row(s) but no columns were found.</p>
  }
  return (
    <div className="overflow-x-auto max-w-full max-h-[400px]">
      <table className="w-full min-w-max table-auto border-collapse text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead className="sticky top-0 z-10">
          <tr>
            {cols.map(c => (
              <th key={c} className="px-3 py-2 text-left text-xs font-semibold border border-bleepx-border bg-bleepx-bg text-bleepx-gray whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-bleepx-white' : 'bg-bleepx-bg'}>
              {cols.map(c => (
                <td key={c} className="px-3 py-1.5 text-xs border border-bleepx-border text-bleepx-text whitespace-nowrap">
                  {row[c] != null ? String(row[c]) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataGrid