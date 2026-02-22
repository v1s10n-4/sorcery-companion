"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(defaultValue || "");
  const debouncedQuery = useDebounce(query, 300);

  const navigate = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      params.delete("page"); // Reset to page 1 on search
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  useEffect(() => {
    navigate(debouncedQuery);
  }, [debouncedQuery, navigate]);

  return (
    <Input
      type="search"
      placeholder="Search cards by name..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="max-w-md"
    />
  );
}
