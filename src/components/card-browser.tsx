"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  X,
  CircleHelp,
  Loader2,
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
import { CardImage } from "@/components/card-image";
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

const SelectionActionBar = dynamic(
  () => import("@/components/selection-action-bar").then((m) => m.SelectionActionBar),
  { ssr: false }
);

const BATCH_SIZE = 42;
const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);
const LONG_PRESS_MS = 400;

export interface CardOverlayEntry {
  cardId: string;
  quantity: number;
  marketPrice: number | null;
  purchasePrice: number | null;
}

export type BrowserContext = "browse" | "collection" | "deck";

export interface CardBrowserProps {
  cards: BrowserCard[];
  sets: SetInfo[];
  header?: React.ReactNode;
  overlay?: CardOverlayEntry[];
  showOwnedToggle?: boolean;
  defaultOwnedOnly?: boolean;
  selectable?: boolean;
  userDecks?: { id: string; name: string }[];
  toolbarSlot?: React.ReactNode;
  searchPlaceholder?: string;
  /** Context determines which actions the selection bar shows */
  context?: BrowserContext;
  /** Current deck ID if in deck context */
  deckId?: string;
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

export function CardBrowser({
  cards,
  sets,
  header,
  overlay,
  showOwnedToggle = false,
  defaultOwnedOnly = true,
  selectable = false,
  userDecks,
  toolbarSlot,
  searchPlaceholder = 'Search cards... (try t:minion e:fire c:>3)',
  context = "browse",
  deckId,
}: CardBrowserProps) {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault("").withOptions({ shallow: true, throttleMs: 150, clearOnDefault: true }));
  const [sort, setSort] = useQueryState("sort", parseAsStringLiteral(SORT_KEYS).withDefault("name").withOptions({ shallow: true, clearOnDefault: true }));

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [showHelp, setShowHelp] = useState(false);
  const [showOwnedOnly, setShowOwnedOnly] = useState(defaultOwnedOnly && !!overlay);
  // Selection: Map<cardId, quantity>
  const [selection, setSelection] = useState<Map<string, number>>(new Map());
  const [selectMode, setSelectMode] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
        map.set(e.cardId, { qty: e.quantity, market: (e.marketPrice ?? 0) * e.quantity, cost: (e.purchasePrice ?? 0) * e.quantity });
      }
    }
    return map;
  }, [overlay]);

  const ownedCardIds = useMemo(() => (overlayMap ? new Set(overlayMap.keys()) : null), [overlayMap]);

  const allTypes = useMemo(() => [...new Set(cards.map((c) => c.type))].sort(), [cards]);
  const allRarities = useMemo(() => {
    const present = new Set(cards.map((c) => c.rarity).filter(Boolean));
    return RARITY_ORDER.filter((r) => present.has(r)) as string[];
  }, [cards]);
  const allSubtypes = useMemo(() => {
    const counts = new Map<string, number>();
    cards.forEach((c) => c.subTypes.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [cards]);
  const allKeywords = useMemo(() => {
    const counts = new Map<string, number>();
    cards.forEach((c) => c.keywords.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [cards]);

  const tokens = useMemo(() => tokenize(debouncedQ), [debouncedQ]);
  const activeFilters = useMemo(() => extractFilters(tokens), [tokens]);

  const filtered = useMemo(() => {
    let result = tokens.length === 0 ? cards : cards.filter((c) => matchesTokens(c, tokens));
    if (showOwnedOnly && ownedCardIds) result = result.filter((c) => ownedCardIds.has(c.id));
    return sortCards(result, sort);
  }, [cards, tokens, sort, showOwnedOnly, ownedCardIds]);

  const facetCounts = useMemo(() => {
    const base = showOwnedOnly && ownedCardIds ? cards.filter((c) => ownedCardIds.has(c.id)) : cards;
    const woElement = countWithout(base, tokens, "element");
    const woType = countWithout(base, tokens, "type");
    const woRarity = countWithout(base, tokens, "rarity");
    const woSet = countWithout(base, tokens, "set");
    const woSubtype = countWithout(base, tokens, "subtype");
    const woKeyword = countWithout(base, tokens, "keyword");
    return {
      elements: Object.fromEntries(ELEMENTS.map((e) => [e, woElement.filter((c) => c.elements.includes(e)).length])),
      types: Object.fromEntries(allTypes.map((t) => [t, woType.filter((c) => c.type === t).length])),
      rarities: Object.fromEntries(allRarities.map((r) => [r, woRarity.filter((c) => c.rarity === r).length])),
      sets: Object.fromEntries(sets.map((s) => [s.slug, woSet.filter((c) => c.setSlugs.includes(s.slug)).length])),
      subtypes: Object.fromEntries(allSubtypes.map((s) => [s, woSubtype.filter((c) => c.subTypes.includes(s)).length])),
      keywords: Object.fromEntries(allKeywords.map((k) => [k, woKeyword.filter((c) => c.keywords.includes(k)).length])),
    };
  }, [cards, tokens, allTypes, allRarities, allSubtypes, allKeywords, sets, showOwnedOnly, ownedCardIds]);

  const visibleCards = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => { setVisibleCount(BATCH_SIZE); window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [debouncedQ, sort]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length)); }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  const updateQuery = useCallback((newQ: string) => { setQ(newQ || null); }, [setQ]);
  const activeFieldCount = useMemo(() => tokens.filter((t) => t.kind === "field").length, [tokens]);
  const statRanges = useMemo(() => {
    let costMax = 0, atkMax = 0, defMax = 0;
    for (const c of cards) {
      if (c.cost != null && c.cost > costMax) costMax = c.cost;
      if (c.attack != null && c.attack > atkMax) atkMax = c.attack;
      if (c.defence != null && c.defence > defMax) defMax = c.defence;
    }
    return { cost: { min: 0, max: costMax }, attack: { min: 0, max: atkMax }, defence: { min: 0, max: defMax } };
  }, [cards]);

  // Selection handlers
  const addToSelection = useCallback((cardId: string) => {
    setSelection((prev) => {
      const next = new Map(prev);
      next.set(cardId, (next.get(cardId) ?? 0) + 1);
      return next;
    });
  }, []);

  const removeFromSelection = useCallback((cardId: string) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const current = next.get(cardId) ?? 0;
      if (current <= 1) next.delete(cardId);
      else next.set(cardId, current - 1);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(new Map());
    setSelectMode(false);
  }, []);

  const toggleSelectMode = useCallback(() => {
    if (selectMode) clearSelection();
    else setSelectMode(true);
  }, [selectMode, clearSelection]);

  const totalSelected = useMemo(() => {
    let sum = 0;
    for (const qty of selection.values()) sum += qty;
    return sum;
  }, [selection]);

  // Long press handler ref
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTriggered = useRef(false);

  const handlePointerDown = useCallback((cardId: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (!selectMode) setSelectMode(true);
      setSelection((prev) => {
        const next = new Map(prev);
        if (!next.has(cardId)) next.set(cardId, 1);
        return next;
      });
    }, LONG_PRESS_MS);
  }, [selectMode]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handlePointerCancel = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

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
              className={cn("p-0.5 rounded transition-colors", showHelp ? "text-amber-400" : "text-muted-foreground hover:text-foreground")}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Select mode toggle */}
        {selectable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-1.5", selectMode && "border-amber-500/50 text-amber-200 bg-amber-950/20")}
                onClick={toggleSelectMode}
              >
                <MousePointerClick className="h-4 w-4" />
                <span className="hidden sm:inline">Select</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectMode ? "Exit selection mode" : "Enter selection mode (or long-press a card)"}
            </TooltipContent>
          </Tooltip>
        )}

        {showOwnedToggle && overlayMap && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-1.5", showOwnedOnly && "border-amber-500/50 text-amber-200")}
                onClick={() => setShowOwnedOnly(!showOwnedOnly)}
              >
                {showOwnedOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="hidden sm:inline">{showOwnedOnly ? "Owned" : "All"}</span>
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
                <code className="text-amber-300 whitespace-nowrap font-mono">{h.syntax}</code>
                <span className="text-muted-foreground">{h.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} card{filtered.length !== 1 ? "s" : ""}
        {hasMore && <span> · showing {visibleCount}</span>}
        {totalSelected > 0 && (
          <span className="text-amber-300 ml-2">· {selection.size} cards ({totalSelected} total) selected</span>
        )}
      </p>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No cards found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-2",
          overlay
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
            : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
        )}>
          {visibleCards.map((card) => {
            const overlayData = overlayMap?.get(card.id);
            const selectedQty = selection.get(card.id) ?? 0;
            const priceDiff = card.marketPrice != null && card.previousPrice != null && card.previousPrice > 0
              ? ((card.marketPrice - card.previousPrice) / card.previousPrice) * 100 : null;
            const perfPct = overlayData && overlayData.cost > 0
              ? ((overlayData.market - overlayData.cost) / overlayData.cost) * 100 : null;
            const perfAbs = overlayData && overlayData.cost > 0
              ? overlayData.market - overlayData.cost : null;

            const handleCardClick = (e: React.MouseEvent) => {
              if (!selectMode) return; // let Link navigate
              e.preventDefault();
              e.stopPropagation();

              // Determine top/bottom half
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const isTopHalf = y < rect.height / 2;

              if (isTopHalf) {
                addToSelection(card.id);
              } else {
                removeFromSelection(card.id);
              }
            };

            return (
              <div
                key={card.id}
                className="group relative"
                onPointerDown={() => selectable && handlePointerDown(card.id)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(e) => { if (selectable) e.preventDefault(); }}
              >
                {/* Desktop hover checkbox (only when not in select mode) */}
                {selectable && !selectMode && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectMode(true);
                      addToSelection(card.id);
                    }}
                    className="absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded border-2 border-white/40 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 3v6M3 6h6" />
                    </svg>
                  </button>
                )}

                {/* Selection quantity badge */}
                {selectedQty > 0 && (
                  <div className="absolute top-1.5 left-1.5 z-10 bg-amber-500 text-black text-[11px] font-bold h-6 min-w-[24px] px-1 rounded flex items-center justify-center">
                    {selectedQty}
                  </div>
                )}

                {/* Card image — in select mode, click is intercepted */}
                <div
                  onClick={selectMode ? handleCardClick : undefined}
                  className={cn(selectMode && "cursor-pointer")}
                >
                  {selectMode ? (
                    <div className={cn(
                      "relative overflow-hidden rounded-lg bg-muted/30",
                      selectedQty > 0 && "ring-2 ring-amber-500"
                    )}>
                      {card.variantSlug ? (
                        <CardImage
                          slug={card.variantSlug}
                          name={card.name}
                          width={260}
                          height={364}
                          blurDataUrl={card.blurDataUrl}
                          className={cn("w-full h-auto", overlay && !overlayData && "opacity-40")}
                        />
                      ) : (
                        <div className="aspect-[5/7] flex items-center justify-center text-xs text-muted-foreground">No image</div>
                      )}
                      {/* Top/bottom half indicators */}
                      <div className="absolute inset-0 flex flex-col pointer-events-none">
                        <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-green-500/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">+1</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-red-500/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">−1</span>
                        </div>
                      </div>
                      {overlayData && (
                        <>
                          <div className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center">{overlayData.qty}</div>
                          {overlayData.market > 0 && (
                            <div className="absolute bottom-1.5 right-1.5 bg-black/75 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">${overlayData.market.toFixed(2)}</div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <Link href={`/cards/${card.id}`} prefetch={false}>
                      <div className={cn("relative overflow-hidden rounded-lg bg-muted/30", selectedQty > 0 && "ring-2 ring-amber-500")}>
                        {card.variantSlug ? (
                          <CardImage
                            slug={card.variantSlug}
                            name={card.name}
                            width={260}
                            height={364}
                            blurDataUrl={card.blurDataUrl}
                            className={cn("w-full h-auto transition-transform duration-200 group-hover:scale-105", overlay && !overlayData && "opacity-40")}
                          />
                        ) : (
                          <div className="aspect-[5/7] flex items-center justify-center text-xs text-muted-foreground">No image</div>
                        )}
                        {overlayData && (
                          <>
                            <div className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center">{overlayData.qty}</div>
                            {overlayData.market > 0 && (
                              <div className="absolute bottom-1.5 right-1.5 bg-black/75 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">${overlayData.market.toFixed(2)}</div>
                            )}
                          </>
                        )}
                      </div>
                    </Link>
                  )}
                </div>

                {/* Info below image */}
                <div className="mt-1 px-0.5 flex items-center justify-between gap-1">
                  <p className="text-[11px] truncate text-muted-foreground group-hover:text-foreground transition-colors flex-1 min-w-0">
                    {card.name}
                  </p>
                  {overlay && overlayData && perfPct !== null ? (
                    <span className={cn("text-[10px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-0.5", perfPct >= 0 ? "text-green-400" : "text-red-400")}>
                      {perfPct >= 0 ? "+" : ""}{perfAbs!.toFixed(2)}
                      <span className="text-[9px] opacity-75">({perfPct >= 0 ? "+" : ""}{perfPct.toFixed(0)}%)</span>
                    </span>
                  ) : card.marketPrice != null ? (
                    <span className="text-[10px] whitespace-nowrap shrink-0 flex items-center gap-1">
                      <span className="text-amber-300">${card.marketPrice.toFixed(2)}</span>
                      {priceDiff !== null && priceDiff !== 0 ? (
                        <span className={cn("font-semibold", priceDiff > 0 ? "text-green-400" : "text-red-400")}>
                          {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">0%</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap shrink-0">N/A</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Selection action bar */}
      {selectable && selection.size > 0 && (
        <SelectionActionBar
          selection={selection}
          cards={cards}
          userDecks={userDecks ?? []}
          context={context}
          deckId={deckId}
          onClear={clearSelection}
          onUpdateQty={(cardId, qty) => {
            setSelection((prev) => {
              const next = new Map(prev);
              if (qty <= 0) { next.delete(cardId); if (next.size === 0) setSelectMode(false); }
              else next.set(cardId, qty);
              return next;
            });
          }}
          onRemoveCard={(cardId) => {
            setSelection((prev) => {
              const next = new Map(prev);
              next.delete(cardId);
              if (next.size === 0) setSelectMode(false);
              return next;
            });
          }}
        />
      )}
    </div>
  );
}
