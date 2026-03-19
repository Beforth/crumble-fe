"use client";

import { cn } from '@/lib/utils';

interface DataTableProps {
  columns: string[];
  data: any[];
  renderRow: (item: any) => React.ReactNode;
  loading?: boolean;
}

export default function DataTable({ columns, data, renderRow, loading }: DataTableProps) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-surface-2 rounded-md w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-text-muted text-sm italic">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-surface-2/50 transition-colors group">
                  {renderRow(item)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
