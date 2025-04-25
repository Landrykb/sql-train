import React from 'react';

export const DataGrid: React.FC<{ data: Record<string, any>[] }> = ({ data }) => {
  if (!data.length) return <p className="text-gray-500">No rows to display.</p>;
  const cols = Object.keys(data[0]);
  return (
    <div className="overflow-auto border rounded shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-2 py-1 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-white' : 'bg-gray-50'}>
              {cols.map((c) => (
                <td key={c} className="px-2 py-1">{row[c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
