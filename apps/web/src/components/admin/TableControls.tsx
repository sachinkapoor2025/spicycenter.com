"use client";

import type { SortDir } from "@/lib/admin-utils";

interface TableControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sortLabel?: string;
  sortDir?: SortDir;
  onSortToggle?: () => void;
  exportLabel?: string;
  onExport?: () => void;
  children?: React.ReactNode;
}

export function TableControls({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  sortLabel,
  sortDir,
  onSortToggle,
  exportLabel = "Export CSV",
  onExport,
  children,
}: TableControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <div className="flex flex-wrap items-center gap-2 ml-auto">
        {onSortToggle && sortLabel && (
          <button
            type="button"
            onClick={onSortToggle}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50"
          >
            Sort: {sortLabel} {sortDir === "asc" ? "↑" : "↓"}
          </button>
        )}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5"
          >
            {[...(pageSizeOptions ?? [10, 25, 50, 100, 250, 500])].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="text-sm bg-nav text-white px-3 py-1.5 rounded-lg font-medium"
          >
            {exportLabel}
          </button>
        )}
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            ←
          </button>
          <span className="px-2 whitespace-nowrap">
            {page} / {totalPages} ({total})
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
