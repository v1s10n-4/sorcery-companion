"use client";

import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface FilterBarProps {
  types: string[];
  elements: string[];
  rarities: string[];
  currentType?: string;
  currentElement?: string;
  currentRarity?: string;
}

export function FilterBar({
  types,
  elements,
  rarities,
  currentType,
  currentElement,
  currentRarity,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(key) === value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page"); // Reset to page 1 on filter change
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("element");
    params.delete("rarity");
    params.delete("page");
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }, [router, searchParams]);

  const hasFilters = currentType || currentElement || currentRarity;

  return (
    <div
      className={`flex flex-col gap-3 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          Type:
        </span>
        {types.map((type) => (
          <Badge
            key={type}
            variant={currentType === type ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/80 transition-colors"
            onClick={() => toggleFilter("type", type)}
          >
            {type}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          Element:
        </span>
        {elements.map((element) => (
          <Badge
            key={element}
            variant={currentElement === element ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/80 transition-colors"
            onClick={() => toggleFilter("element", element)}
          >
            {element}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          Rarity:
        </span>
        {rarities.map((rarity) => (
          <Badge
            key={rarity}
            variant={currentRarity === rarity ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/80 transition-colors"
            onClick={() => toggleFilter("rarity", rarity)}
          >
            {rarity}
          </Badge>
        ))}
      </div>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline self-start transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
