import React from "react";
import { cn } from "../../utils/cn.js";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button.jsx";

export function Table({
  columns = [],
  data = [],
  sortKey,
  sortOrder = "asc",
  onSort,
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  isLoading = false,
  emptyMessage = "No records found.",
  caption,
  className
}) {
  const handleSort = (key) => {
    if (!onSort) return;
    if (sortKey === key) {
      onSort(key, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSort(key, "asc");
    }
  };

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border border-soc-border bg-soc-surface",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-200">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-soc-border bg-soc-dark/60 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const ariaSort = isSorted
                  ? sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={col.sortable ? ariaSort : undefined}
                    className={cn("px-4 py-3 select-none", col.headerClassName)}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1.5 hover:text-stone-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary rounded"
                        aria-label={`Sort by ${col.header}`}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />
                          ) : (
                            <ArrowDown
                              className="h-3.5 w-3.5 text-brand-accent"
                              aria-hidden="true"
                            />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-soc-border/60">
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 5) }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={`skeleton-${rIdx}-${col.key}`} className="px-4 py-3.5">
                      <div className="h-4 w-3/4 rounded bg-soc-raised" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-soc-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || row._id || `row-${rowIdx}`}
                  className="transition-colors hover:bg-soc-raised/60 focus-within:bg-soc-raised/60"
                >
                  {columns.map((col) => (
                    <td
                      key={`${row.id || rowIdx}-${col.key}`}
                      className={cn("px-4 py-3.5 text-xs sm:text-sm", col.className)}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-soc-border bg-soc-dark/40 px-4 py-3 text-xs text-soc-muted">
          <div>
            Showing <span className="font-medium text-stone-200">{startItem}</span> to{" "}
            <span className="font-medium text-stone-200">{endItem}</span> of{" "}
            <span className="font-medium text-stone-200">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              iconLeft={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
              aria-label="Previous page"
            >
              Prev
            </Button>
            <span className="px-2 font-mono text-xs text-stone-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              iconRight={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
