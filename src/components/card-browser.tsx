"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { Search, X, CircleHelp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";
import { CardGrid } from "@/components/card-grid";
import { FilterSheet } from "@/components/filter-sheet";
import { SortMenu } from "@/components/sort-menu";
import {
  tokenize,
  matchesTokens,
  extractFilters,
  countWithout,
  SEARCH_HELP,
} from "@/lib/search";
import type { BrowserCard, SetInfo, SortKey } from "@/lib/types";
import { ELEMENTS, RARITY_ORDER, SORT_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 42;
const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);

interface CardBrowserProps {
  cards: BrowserCard[];
  sets: SetInfo[];
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

export function CardBrowser({ cards, sets }: CardBrowserProps) {
  // Single URL state for search + all filters
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({
      shallow: true,
      throttleMs: 150,
      clearOnDefault: true,
    })
  );

  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_KEYS)
      .withDefault("name")
      .withOptions({ shallow: true, clearOnDefault: true })
  );

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [showHelp, setShowHelp] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedQ = useDebounce(q, 150);

  // Derive unique filter options from data
  const allTypes = useMemo(
    () => [...new Set(cards.map((c) => c.type))].sort(),
    [cards]
  );
  const allRarities = useMemo(() => {
    const present = new Set(cards.map((c) => c.rarity).filter(Boolean));
    return RARITY_ORDER.filter((r) => present.has(r)) as string[];
  }, [cards]);
  const allSubtypes = useMemo(() => {
    const counts = new Map<string, number>();
    cards.forEach((c) =>
      c.subTypes.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1))
    );
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [cards]);
  const allKeywords = useMemo(() => {
    const counts = new Map<string, number>();
    cards.forEach((c) =>
      c.keywords.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1))
    );
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [cards]);

  // ── Search + Filter pipeline ──

  const tokens = useMemo(() => tokenize(debouncedQ), [debouncedQ]);
  const activeFilters = useMemo(() => extractFilters(tokens), [tokens]);

  const filtered = useMemo(() => {
    const matched =
      tokens.length === 0
        ? cards
        : cards.filter((c) => matchesTokens(c, tokens));
    return sortCards(matched, sort);
  }, [cards, tokens, sort]);

  // ── Faceted counts ──

  const facetCounts = useMemo(() => {
    const woElement = countWithout(cards, tokens, "element");
    const woType = countWithout(cards, tokens, "type");
    const woRarity = countWithout(cards, tokens, "rarity");
    const woSet = countWithout(cards, tokens, "set");
    const woSubtype = countWithout(cards, tokens, "subtype");
    const woKeyword = countWithout(cards, tokens, "keyword");

    return {
      elements: Object.fromEntries(
        ELEMENTS.map((e) => [
          e,
          woElement.filter((c) => c.elements.includes(e)).length,
        ])
      ),
      types: Object.fromEntries(
        allTypes.map((t) => [t, woType.filter((c) => c.type === t).length])
      ),
      rarities: Object.fromEntries(
        allRarities.map((r) => [
          r,
          woRarity.filter((c) => c.rarity === r).length,
        ])
      ),
      sets: Object.fromEntries(
        sets.map((s) => [
          s.slug,
          woSet.filter((c) => c.setSlugs.includes(s.slug)).length,
        ])
      ),
      subtypes: Object.fromEntries(
        allSubtypes.map((s) => [
          s,
          woSubtype.filter((c) => c.subTypes.includes(s)).length,
        ])
      ),
      keywords: Object.fromEntries(
        allKeywords.map((k) => [
          k,
          woKeyword.filter((c) => c.keywords.includes(k)).length,
        ])
      ),
    };
  }, [cards, tokens, allTypes, allRarities, allSubtypes, allKeywords, sets]);

  // ── Infinite scroll ──

  const visibleCards = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [debouncedQ, sort]);

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

  // ── Query modification handler (passed to Sheet) ──

  const updateQuery = useCallback(
    (newQ: string) => {
      setQ(newQ || null);
    },
    [setQ]
  );

  // Active filter count for Sheet badge
  const activeFieldCount = useMemo(() => {
    return tokens.filter((t) => t.kind === "field" && !t.negated).length;
  }, [tokens]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search + Filter + Sort */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder='Search cards... (try t:minion e:fire c:>3)'
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
          query={q}
          onQueryChange={updateQuery}
          activeFilters={activeFilters}
          activeCount={activeFieldCount}
          types={allTypes}
          rarities={allRarities}
          sets={sets}
          subtypes={allSubtypes}
          keywords={allKeywords}
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
