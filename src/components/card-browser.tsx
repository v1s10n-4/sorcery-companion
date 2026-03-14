"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import {
  Search,
  X,
  CircleHelp,
  Eye,
  EyeOff,
  MousePointerClick,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";
import { CardCell } from "@/components/card-cell";
import { FilterSheet } from "@/components/filter-sheet";
import { SortMenu } from "@/components/sort-menu";
import {
  tokenize,
  matchesTokens,
  extractFilters,
  countWithout,
  SEARCH_HELP,
} from "@/lib/search";
import { useSelectionStore } from "@/stores/selection-store";
import type { BrowserCard, SetInfo, SortKey } from "@/lib/types";
import { ELEMENTS, RARITY_ORDER, SORT_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);

export interface CardOverlayEntry {
  cardId: string;
  quantity: number;
  marketPrice: number | null;
  purchasePrice: number | null;
}

export interface CardBrowserProps {
  cards: BrowserCard[];
  sets: SetInfo[];
  header?: React.ReactNode;
  overlay?: CardOverlayEntry[];
  showOwnedToggle?: boolean;
  defaultOwnedOnly?: boolean;
  toolbarSlot?: React.ReactNode;
  searchPlaceholder?: string;
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

/** Responsive column count — mirrors the Tailwind grid breakpoints */
function useColumnCount(hasOverlay: boolean) {
  const [cols, setCols] = useState(hasOverlay ? 2 : 3);
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (hasOverlay) {
        if (w >= 1280) setCols(6);
        else if (w >= 1024) setCols(5);
        else if (w >= 768) setCols(4);
        else if (w >= 640) setCols(3);
        else setCols(2);
      } else {
        if (w >= 1280) setCols(7);
        else if (w >= 1024) setCols(6);
        else if (w >= 768) setCols(5);
        else if (w >= 640) setCols(4);
        else setCols(3);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [hasOverlay]);
  return cols;
}

export function CardBrowser({
  cards,
  sets,
  header,
  overlay,
  showOwnedToggle = false,
  defaultOwnedOnly = true,
  toolbarSlot,
  searchPlaceholder = "Search cards... (try t:minion e:fire c:>3)",
}: CardBrowserProps) {
  const [q, setQ] = useQueryState(
    "q",
    parseAsString
      .withDefault("")
      .withOptions({ shallow: true, throttleMs: 150, clearOnDefault: true })
  );
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_KEYS)
      .withDefault("name")
      .withOptions({ shallow: true, clearOnDefault: true })
  );

  const [showHelp, setShowHelp] = useState(false);
  const [showOwnedOnly, setShowOwnedOnly] = useState(
    defaultOwnedOnly && !!overlay
  );

  // Selection store
  const selectActive = useSelectionStore((s) => s.active);
  const selectionSize = useSelectionStore((s) => s.items.size);
  const selectionTotal = useSelectionStore((s) => s.total());
  const toggle = useSelectionStore((s) => s.toggle);

  const debouncedQ = useDebounce(q, 150);

  // Build overlay lookup
  const overlayMap = useMemo(() => {
    if (!overlay) return null;
    const map = new Map<string, { qty: number; market: number; cost: number }>();
    for (const e of overlay) {
      const existing = map.get(e.cardId);
      if (existing) {
        existing.qty += e.quantity;
        existing.market += (e.marketPrice ?? 0) * e.quantity;
        existing.cost += (e.purchasePrice ?? 0) * e.quantity;
      } else {
        map.set(e.cardId, {
          qty: e.quantity,
          market: (e.marketPrice ?? 0) * e.quantity,
          cost: (e.purchasePrice ?? 0) * e.quantity,
        });
      }
    }
    return map;
  }, [overlay]);

  const ownedCardIds = useMemo(
    () => (overlayMap ? new Set(overlayMap.keys()) : null),
    [overlayMap]
  );

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
  const allArtists = useMemo(() => {
    const counts = new Map<string, number>();
    cards.forEach((c) =>
      (c.artists ?? []).forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1))
    );
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [cards]);

  const tokens = useMemo(() => tokenize(debouncedQ), [debouncedQ]);
  const activeFilters = useMemo(() => extractFilters(tokens), [tokens]);

  const filtered = useMemo(() => {
    let result =
      tokens.length === 0
        ? cards
        : cards.filter((c) => matchesTokens(c, tokens));
    if (showOwnedOnly && ownedCardIds)
      result = result.filter((c) => ownedCardIds.has(c.id));
    return sortCards(result, sort);
  }, [cards, tokens, sort, showOwnedOnly, ownedCardIds]);

  const facetCounts = useMemo(() => {
    const base =
      showOwnedOnly && ownedCardIds
        ? cards.filter((c) => ownedCardIds.has(c.id))
        : cards;
    const woElement = countWithout(base, tokens, "element");
    const woType = countWithout(base, tokens, "type");
    const woRarity = countWithout(base, tokens, "rarity");
    const woSet = countWithout(base, tokens, "set");
    const woSubtype = countWithout(base, tokens, "subtype");
    const woKeyword = countWithout(base, tokens, "keyword");
    const woArtist = countWithout(base, tokens, "artist");
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
      artists: Object.fromEntries(
        allArtists.map((a) => [
          a,
          woArtist.filter((c) => (c.artists ?? []).includes(a)).length,
        ])
      ),
    };
  }, [
    cards,
    tokens,
    allTypes,
    allRarities,
    allSubtypes,
    allKeywords,
    allArtists,
    sets,
    showOwnedOnly,
    ownedCardIds,
  ]);

  // Scroll to top on search/sort change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [debouncedQ, sort]);

  const updateQuery = useCallback(
    (newQ: string) => {
      setQ(newQ || null);
    },
    [setQ]
  );
  const activeFieldCount = useMemo(
    () => tokens.filter((t) => t.kind === "field").length,
    [tokens]
  );
  const statRanges = useMemo(() => {
    let costMax = 0,
      atkMax = 0,
      defMax = 0;
    for (const c of cards) {
      if (c.cost != null && c.cost > costMax) costMax = c.cost;
      if (c.attack != null && c.attack > atkMax) atkMax = c.attack;
      if (c.defence != null && c.defence > defMax) defMax = c.defence;
    }
    return {
      cost: { min: 0, max: costMax },
      attack: { min: 0, max: atkMax },
      defence: { min: 0, max: defMax },
    };
  }, [cards]);

  // ── Virtual grid ─────────────────────────────────────────────────────────
  const colCount = useColumnCount(!!overlay);
  const rows = useMemo(() => {
    const result: BrowserCard[][] = [];
    for (let i = 0; i < filtered.length; i += colCount) {
      result.push(filtered.slice(i, i + colCount));
    }
    return result;
  }, [filtered, colCount]);

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Re-measure listRef.offsetTop after every render so scrollMargin stays accurate
  useEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
  });

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 220,
    overscan: 3,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  const gridClass = overlay
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
    : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2";
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {header}

      {/* Search + Filter + Sort */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
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

        {/* Select mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5",
                selectActive &&
                  "border-amber-500/50 text-amber-200 bg-amber-950/20"
              )}
              onClick={toggle}
            >
              <MousePointerClick className="h-4 w-4" />
              <span className="hidden sm:inline">Select</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {selectActive
              ? "Exit selection mode"
              : "Enter selection mode (or long-press a card)"}
          </TooltipContent>
        </Tooltip>

        {showOwnedToggle && overlayMap && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5",
                  showOwnedOnly && "border-amber-500/50 text-amber-200"
                )}
                onClick={() => setShowOwnedOnly(!showOwnedOnly)}
              >
                {showOwnedOnly ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {showOwnedOnly ? "Owned" : "All"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showOwnedOnly ? "Showing owned only" : "Showing all cards"}
            </TooltipContent>
          </Tooltip>
        )}

        {toolbarSlot}

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
          artists={allArtists}
          facetCounts={facetCounts}
          statRanges={statRanges}
        />

        <SortMenu sort={sort} onSort={setSort} />
      </div>

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

      <p className="text-xs text-muted-foreground">
        {filtered.length} card{filtered.length !== 1 ? "s" : ""}
        {selectionTotal > 0 && (
          <span className="text-amber-300 ml-2">
            · {selectionSize} cards ({selectionTotal} total) selected
          </span>
        )}
      </p>

      {/* Virtual card grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No cards found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div ref={listRef}>
          <div style={{ height: totalHeight, position: "relative" }}>
            {virtualItems.map((virtualRow) => {
              const rowCards = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <div className={cn(gridClass, "pb-2")}>
                    {rowCards.map((card, colIndex) => {
                      const globalIndex =
                        virtualRow.index * colCount + colIndex;
                      return (
                        <CardCell
                          key={card.id}
                          card={card}
                          index={globalIndex}
                          overlayData={overlayMap?.get(card.id) ?? null}
                          hasOverlay={!!overlay}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
