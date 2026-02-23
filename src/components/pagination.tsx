"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="p-2 rounded-md border disabled:opacity-20 hover:bg-accent transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {start > 1 && (
        <>
          <PageBtn page={1} current={currentPage} onClick={onPageChange} />
          {start > 2 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
        </>
      )}

      {pages.map((p) => (
        <PageBtn key={p} page={p} current={currentPage} onClick={onPageChange} />
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
          <PageBtn
            page={totalPages}
            current={currentPage}
            onClick={onPageChange}
          />
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="p-2 rounded-md border disabled:opacity-20 hover:bg-accent transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function PageBtn({
  page,
  current,
  onClick,
}: {
  page: number;
  current: number;
  onClick: (p: number) => void;
}) {
  return (
    <button
      onClick={() => onClick(page)}
      className={cn(
        "min-w-8 h-8 text-sm rounded-md border transition-colors",
        page === current
          ? "bg-primary text-primary-foreground font-medium"
          : "hover:bg-accent"
      )}
    >
      {page}
    </button>
  );
}
