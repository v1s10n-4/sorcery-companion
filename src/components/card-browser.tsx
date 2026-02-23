"use client";

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { Search, X, CircleHelp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQueryState, useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";
import { CardGrid } from "@/components/card-grid";
import { FilterSheet } from "@/components/filter-sheet";
import { SortMenu } from "@/components/sort-menu";
import { ElementIcon } from "@/components/icons";
import { tokenize, matchesTokens, SEARCH_HELP } from "@/lib/search";
import type { BrowserCard, SetInfo, SortKey } from "@/lib/types";
import { ELEMENTS, RARITY_ORDER, SORT_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 42;
const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);

interface CardBrowserProps {
  cards: BrowserCard[];
  sets: SetInfo[];
}

// ── Helpers ──

function applyUiFilters(
  cards: BrowserCard[],
  filters: { type: string; element: string; rarity: string; set: string }
): BrowserCard[] {
  let result = cards;
  if (filters.type) result = result.filter((c) => c.type === filters.type);
  if (filters.element)
    result = result.filter((c) => c.elements.includes(filters.element));
  if (filters.rarity)
    result = result.filter((c) => c.rarity === filters.rarity);
  if (filters.set)
    result = result.filter((c) => c.setSlugs.includes(filters.set));
  return result;
}

function sortCards(cards: BrowserCard[], sort: SortKey): BrowserCard[] {
  return [...cards].sort((a, b) => {
    switch (sort) {
      case "cost-asc":
        return (a.cost ?? 99) - (b.cost ?? 99) || a.name.localeCompare(b.name);
      case "cost-desc":
        return (b.cost ?? -1) - (a.cost ?? -1) || a.name.localeCompare(b.name);
      case "attack":
        return (b.attack ?? -1) - (a.attack ?? -1) || a.name.localeCompare(b.name);
      case "defence":
        return (b.defence ?? -1) - (a.defence ?? -1) || a.name.localeCompare(b.name);
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

// ── Component ──

export function CardBrowser({ cards, sets }: CardBrowserProps) {
  // URL state via nuqs (shallow — no server round-trips)
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({
      shallow: true,
      throttleMs: 150,
      clearOnDefault: true,
    })
  );

  const [filterState, setFilterState] = useQueryStates(
    {
      type: parseAsString.withDefault(""),
      element: parseAsString.withDefault(""),
      rarity: parseAsString.withDefault(""),
      set: parseAsString.withDefault(""),
    },
    { shallow: true, clearOnDefault: true }
  );

  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_KEYS)
      .withDefault("name")
      .withOptions({ shallow: true, clearOnDefault: true })
  );

  // Local UI state
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [showHelp, setShowHelp] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search for filtering (input stays responsive via nuqs)
  const debouncedSearch = useDebounce(q, 150);

  // Derive filter options
  const types = useMemo(
    () => [...new Set(cards.map((c) => c.type))].sort(),
    [cards]
  );
  const rarities = useMemo(() => {
    const present = new Set(cards.map((c) => c.rarity).filter(Boolean));
    return RARITY_ORDER.filter((r) => present.has(r)) as string[];
  }, [cards]);

  // ── Search + Filter pipeline ──

  const searchTokens = useMemo(
    () => tokenize(debouncedSearch),
    [debouncedSearch]
  );

  const searchMatched = useMemo(
    () =>
      searchTokens.length === 0
        ? cards
        : cards.filter((c) => matchesTokens(c, searchTokens)),
    [cards, searchTokens]
  );

  const filtered = useMemo(
    () => sortCards(applyUiFilters(searchMatched, filterState), sort),
    [searchMatched, filterState, sort]
  );

  // ── Faceted counts ──

  const facetCounts = useMemo(() => {
    const base = searchMatched;
    const withoutType = applyUiFilters(base, { ...filterState, type: "" });
    const withoutElement = applyUiFilters(base, { ...filterState, element: "" });
    const withoutRarity = applyUiFilters(base, { ...filterState, rarity: "" });
    const withoutSet = applyUiFilters(base, { ...filterState, set: "" });

    return {
      types: Object.fromEntries(
        types.map((t) => [t, withoutType.filter((c) => c.type === t).length])
      ),
      elements: Object.fromEntries(
        ELEMENTS.map((e) => [
          e,
          withoutElement.filter((c) => c.elements.includes(e)).length,
        ])
      ),
      rarities: Object.fromEntries(
        rarities.map((r) => [
          r,
          withoutRarity.filter((c) => c.rarity === r).length,
        ])
      ),
      sets: Object.fromEntries(
        sets.map((s) => [
          s.slug,
          withoutSet.filter((c) => c.setSlugs.includes(s.slug)).length,
        ])
      ),
    };
  }, [searchMatched, filterState, types, rarities, sets]);

  // ── Infinite scroll ──

  const visibleCards = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [debouncedSearch, filterState, sort]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + BATCH_SIZE, filtered.length)
          );
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  // ── Filter handlers ──

  const toggleFilter = useCallback(
    (key: keyof typeof filterState, value: string) => {
      setFilterState((prev) => ({
        [key]: prev[key] === value ? null : value,
      }));
    },
    [setFilterState]
  );

  const clearFilters = useCallback(() => {
    setFilterState({ type: null, element: null, rarity: null, set: null });
  }, [setFilterState]);

  const removeFilter = useCallback(
    (key: keyof typeof filterState) => {
      setFilterState({ [key]: null });
    },
    [setFilterState]
  );

  const activeFilterCount = Object.values(filterState).filter(Boolean).length;

  // Active chip list
  const activeChips: {
    key: keyof typeof filterState;
    label: string;
    value: string;
  }[] = [];
  if (filterState.element)
    activeChips.push({
      key: "element",
      label: filterState.element,
      value: filterState.element,
    });
  if (filterState.type)
    activeChips.push({
      key: "type",
      label: filterState.type,
      value: filterState.type,
    });
  if (filterState.rarity)
    activeChips.push({
      key: "rarity",
      label: filterState.rarity,
      value: filterState.rarity,
    });
  if (filterState.set) {
    const setName =
      sets.find((s) => s.slug === filterState.set)?.name || filterState.set;
    activeChips.push({ key: "set", label: setName, value: filterState.set });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search + Filter + Sort */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder='Search cards... (try type:minion e:fire c:>3)'
            value={q}
            onChange={(e) => setQ(e.target.value || null)}
            className="pl-9 pr-16 h-9"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {q && (
              <button onClick={() => setQ(null)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            )}
            <button
              onClick={() => setShowHelp((v) => !v)}
              className={cn(
                "p-0.5 rounded transition-colors",
                showHelp
                  ? "text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </div>

        <FilterSheet
          types={types}
          rarities={rarities}
          sets={sets}
          filters={filterState}
          onToggle={toggleFilter}
          onClear={clearFilters}
          activeCount={activeFilterCount}
          facetCounts={facetCounts}
        />

        <SortMenu sort={sort} onSort={setSort} />
      </div>

      {/* Search syntax help */}
      {showHelp && (
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {SEARCH_HELP.map((h) => (
              <div key={h.syntax} className="flex gap-2">
                <code className="text-amber-300 whitespace-nowrap font-mono">
                  {h.syntax}
                </code>
                <span className="text-muted-foreground">{h.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => removeFilter(chip.key)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              {chip.key === "element" && (
                <ElementIcon element={chip.value} size="xs" />
              )}
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {activeChips.length > 1 && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} card{filtered.length !== 1 ? "s" : ""}
        {hasMore && <span> · showing {visibleCount}</span>}
      </p>

      {/* Card grid */}
      <CardGrid cards={visibleCards} />

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
