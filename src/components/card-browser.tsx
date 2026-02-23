"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Search, X, CircleHelp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { CardGrid } from "@/components/card-grid";
import { FilterSheet } from "@/components/filter-sheet";
import { SortMenu } from "@/components/sort-menu";
import { ElementIcon } from "@/components/icons";
import { tokenize, matchesTokens, SEARCH_HELP } from "@/lib/search";
import type { BrowserCard, SetInfo, Filters, SortKey } from "@/lib/types";
import { ELEMENTS, RARITY_ORDER } from "@/lib/types";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 42;

interface CardBrowserProps {
  cards: BrowserCard[];
  sets: SetInfo[];
}

// ── UI filter application (separate from search tokens) ──

function applyUiFilters(cards: BrowserCard[], filters: Filters): BrowserCard[] {
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
        return (
          (b.attack ?? -1) - (a.attack ?? -1) || a.name.localeCompare(b.name)
        );
      case "defence":
        return (
          (b.defence ?? -1) - (a.defence ?? -1) || a.name.localeCompare(b.name)
        );
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

export function CardBrowser({ cards, sets }: CardBrowserProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    type: "",
    element: "",
    rarity: "",
    set: "",
  });
  const [sort, setSort] = useState<SortKey>("name");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [showHelp, setShowHelp] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 150);

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

  // Step 1: Parse search query
  const searchTokens = useMemo(
    () => tokenize(debouncedSearch),
    [debouncedSearch]
  );

  // Step 2: Apply search tokens
  const searchMatched = useMemo(
    () =>
      searchTokens.length === 0
        ? cards
        : cards.filter((c) => matchesTokens(c, searchTokens)),
    [cards, searchTokens]
  );

  // Step 3: Apply UI filters + sort
  const filtered = useMemo(
    () => sortCards(applyUiFilters(searchMatched, filters), sort),
    [searchMatched, filters, sort]
  );

  // ── Faceted counts (cross-filtered) ──

  const facetCounts = useMemo(() => {
    const base = searchMatched; // search applied, no UI filters

    const withoutType = applyUiFilters(base, { ...filters, type: "" });
    const withoutElement = applyUiFilters(base, { ...filters, element: "" });
    const withoutRarity = applyUiFilters(base, { ...filters, rarity: "" });
    const withoutSet = applyUiFilters(base, { ...filters, set: "" });

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
  }, [searchMatched, filters, types, rarities, sets]);

  // ── Infinite scroll ──

  const visibleCards = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset on filter/search/sort change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [debouncedSearch, filters, sort]);

  // IntersectionObserver for loading more
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

  // ── URL sync ──

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filters.type) params.set("type", filters.type);
    if (filters.element) params.set("element", filters.element);
    if (filters.rarity) params.set("rarity", filters.rarity);
    if (filters.set) params.set("set", filters.set);
    if (sort !== "name") params.set("sort", sort);
    const url = params.toString() ? `/?${params.toString()}` : "/";
    window.history.replaceState(null, "", url);
  }, [debouncedSearch, filters, sort]);

  // Read URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const type = params.get("type");
    const element = params.get("element");
    const rarity = params.get("rarity");
    const set = params.get("set");
    const sortParam = params.get("sort") as SortKey | null;

    if (q) setSearch(q);
    if (type || element || rarity || set) {
      setFilters({
        type: type || "",
        element: element || "",
        rarity: rarity || "",
        set: set || "",
      });
    }
    if (sortParam) setSort(sortParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter handlers ──

  const toggleFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? "" : value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ type: "", element: "", rarity: "", set: "" });
  }, []);

  const removeFilter = useCallback((key: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Active chip list
  const activeChips: { key: keyof Filters; label: string; value: string }[] =
    [];
  if (filters.element)
    activeChips.push({
      key: "element",
      label: filters.element,
      value: filters.element,
    });
  if (filters.type)
    activeChips.push({ key: "type", label: filters.type, value: filters.type });
  if (filters.rarity)
    activeChips.push({
      key: "rarity",
      label: filters.rarity,
      value: filters.rarity,
    });
  if (filters.set) {
    const setName =
      sets.find((s) => s.slug === filters.set)?.name || filters.set;
    activeChips.push({ key: "set", label: setName, value: filters.set });
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-16 h-9"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button onClick={() => setSearch("")}>
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
          filters={filters}
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
        {hasMore && (
          <span>
            {" "}
            · showing {visibleCount}
          </span>
        )}
      </p>

      {/* Card grid */}
      <CardGrid cards={visibleCards} />

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-8"
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
