"use client";

import { Badge } from "@/components/ui/badge";
import { ElementIcon } from "@/components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface FilterBarProps {
  types: string[];
  elements: string[];
  rarities: string[];
  sets: { name: string; slug: string; cardCount: number }[];
  currentType?: string;
  currentElement?: string;
  currentRarity?: string;
  currentSet?: string;
  currentSort?: string;
}

const RARITY_COLORS: Record<string, string> = {
  Ordinary: "border-zinc-500 text-zinc-400 hover:bg-zinc-800",
  Exceptional: "border-sky-500 text-sky-400 hover:bg-sky-950",
  Elite: "border-purple-500 text-purple-400 hover:bg-purple-950",
  Unique: "border-amber-500 text-amber-400 hover:bg-amber-950",
};

const RARITY_ACTIVE: Record<string, string> = {
  Ordinary: "bg-zinc-700 text-zinc-100",
  Exceptional: "bg-sky-800 text-sky-100",
  Elite: "bg-purple-800 text-purple-100",
  Unique: "bg-amber-800 text-amber-100",
};

const SORT_OPTIONS = [
  { value: "", label: "Name (A→Z)" },
  { value: "cost", label: "Cost ↑" },
  { value: "cost-desc", label: "Cost ↓" },
  { value: "attack", label: "Attack ↓" },
  { value: "defence", label: "Defence ↓" },
];

export function FilterBar({
  types,
  elements,
  rarities,
  sets,
  currentType,
  currentElement,
  currentRarity,
  currentSet,
  currentSort,
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
      params.delete("page");
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const setSort = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    ["type", "element", "rarity", "set", "page", "sort"].forEach((k) =>
      params.delete(k)
    );
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }, [router, searchParams]);

  const hasFilters =
    currentType || currentElement || currentRarity || currentSet || currentSort;

  return (
    <div
      className={`flex flex-col gap-3 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* Sets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
          Set
        </span>
        {sets.map((set) => (
          <Badge
            key={set.slug}
            variant={currentSet === set.slug ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/80 transition-colors text-xs"
            onClick={() => toggleFilter("set", set.slug)}
          >
            {set.name}
            <span className="ml-1 opacity-50">{set.cardCount}</span>
          </Badge>
        ))}
      </div>

      {/* Elements — icon-based */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
          Element
        </span>
        {elements.map((element) => (
          <button
            key={element}
            onClick={() => toggleFilter("element", element)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all ${
              currentElement === element
                ? "border-amber-500 bg-amber-900/30 text-amber-200"
                : "border-border hover:border-amber-700/50 hover:bg-accent/50"
            }`}
          >
            <ElementIcon element={element} size="sm" />
            {element}
          </button>
        ))}
      </div>

      {/* Types */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
          Type
        </span>
        {types.map((type) => (
          <Badge
            key={type}
            variant={currentType === type ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/80 transition-colors text-xs"
            onClick={() => toggleFilter("type", type)}
          >
            {type}
          </Badge>
        ))}
      </div>

      {/* Rarity */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
          Rarity
        </span>
        {rarities.map((rarity) => (
          <Badge
            key={rarity}
            variant="outline"
            className={`cursor-pointer transition-colors text-xs ${
              currentRarity === rarity
                ? RARITY_ACTIVE[rarity] || ""
                : RARITY_COLORS[rarity] || ""
            }`}
            onClick={() => toggleFilter("rarity", rarity)}
          >
            {rarity}
          </Badge>
        ))}
      </div>

      {/* Sort + Clear */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Sort
          </span>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  (currentSort || "") === opt.value
                    ? "border-amber-500 bg-amber-900/30 text-amber-200"
                    : "border-border hover:border-amber-700/50 text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors ml-auto"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
