"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { CardGrid } from "@/components/card-grid";
import { Pagination } from "@/components/pagination";
import { FilterSheet } from "@/components/filter-sheet";
import { SortMenu } from "@/components/sort-menu";
import { ElementIcon } from "@/components/icons";
import type { BrowserCard, SetInfo, Filters, SortKey } from "@/lib/types";

const PAGE_SIZE = 42; // 7 cols × 6 rows on XL

interface CardBrowserProps {
  cards: BrowserCard[];
  sets: SetInfo[];
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
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 150);

  // Derive filter options from data
  const types = useMemo(
    () => [...new Set(cards.map((c) => c.type))].sort(),
    [cards]
  );

  const rarities = useMemo(
    () =>
      [...new Set(cards.map((c) => c.rarity).filter(Boolean))].sort() as string[],
    [cards]
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let result = cards;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.rulesText?.toLowerCase().includes(q)
      );
    }

    if (filters.type) result = result.filter((c) => c.type === filters.type);
    if (filters.element)
      result = result.filter((c) => c.elements.includes(filters.element));
    if (filters.rarity)
      result = result.filter((c) => c.rarity === filters.rarity);
    if (filters.set)
      result = result.filter((c) => c.setSlugs.includes(filters.set));

    // Sort
    return [...result].sort((a, b) => {
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
  }, [cards, debouncedSearch, filters, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageCards = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Reset page on filter/search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, sort]);

  // Sync state to URL (no navigation, just history.replaceState)
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filters.type) params.set("type", filters.type);
    if (filters.element) params.set("element", filters.element);
    if (filters.rarity) params.set("rarity", filters.rarity);
    if (filters.set) params.set("set", filters.set);
    if (sort !== "name") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const url = params.toString() ? `/?${params.toString()}` : "/";
    window.history.replaceState(null, "", url);
  }, [debouncedSearch, filters, sort, page]);

  // Read initial state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const type = params.get("type");
    const element = params.get("element");
    const rarity = params.get("rarity");
    const set = params.get("set");
    const sortParam = params.get("sort") as SortKey | null;
    const pageParam = params.get("page");

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
    if (pageParam) setPage(Math.max(1, parseInt(pageParam, 10)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Build active chip list
  const activeChips: { key: keyof Filters; label: string; value: string }[] =
    [];
  if (filters.element)
    activeChips.push({
      key: "element",
      label: filters.element,
      value: filters.element,
    });
  if (filters.type)
    activeChips.push({
      key: "type",
      label: filters.type,
      value: filters.type,
    });
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
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        <FilterSheet
          types={types}
          rarities={rarities}
          sets={sets}
          filters={filters}
          onToggle={toggleFilter}
          onClear={clearFilters}
          activeCount={activeFilterCount}
        />

        <SortMenu sort={sort} onSort={setSort} />
      </div>

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
      </p>

      {/* Card grid */}
      <CardGrid cards={pageCards} />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
