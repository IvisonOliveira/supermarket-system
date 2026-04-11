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
    <div
      className={`w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
        <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-700 dark:text-gray-300">
          <tr>
            {columns.map((col, idx) => (
              <th key={String(col.key) + idx} scope="col" className="px-6 py-3 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {columns.map((col, colIndex) => (
                  <td key={String(col.key) + colIndex} className="px-6 py-4 whitespace-nowrap">
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
