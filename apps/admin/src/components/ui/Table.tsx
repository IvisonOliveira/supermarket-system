import type { ReactNode } from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  emptyMessage = 'Nenhum registro encontrado',
  className = '',
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-slate-200 ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={String(col.key) + idx}
                scope="col"
                className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-10 text-center text-sm text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50/70 transition-colors">
                {columns.map((col, colIndex) => (
                  <td
                    key={String(col.key) + colIndex}
                    className="px-5 py-3.5 whitespace-nowrap text-slate-700"
                  >
                    {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
