"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  // Show a window of pages around current
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      className={`flex items-center justify-center gap-2 mt-8 ${isPending ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 text-sm rounded-md border disabled:opacity-30 hover:bg-accent transition-colors"
      >
        ←
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => goToPage(1)}
            className="px-3 py-2 text-sm rounded-md border hover:bg-accent transition-colors"
          >
            1
          </button>
          {start > 2 && <span className="text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => goToPage(p)}
          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
            p === currentPage
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="text-muted-foreground">…</span>
          )}
          <button
            onClick={() => goToPage(totalPages)}
            className="px-3 py-2 text-sm rounded-md border hover:bg-accent transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 text-sm rounded-md border disabled:opacity-30 hover:bg-accent transition-colors"
      >
        →
      </button>
    </nav>
  );
}
