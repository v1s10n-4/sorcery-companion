"use client";

import { useMemo, useEffect, useRef, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Loader2,
  Upload,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Package,
  Pencil,
  Check,
  Minus,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/lib/search";
import type { BrowserCard, SetInfo, SortKey } from "@/lib/types";
import { ELEMENTS, RARITY_ORDER, SORT_OPTIONS, RARITY_COLORS } from "@/lib/types";
import { removeFromCollection, updateCollectionCard } from "@/lib/actions/collection";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 42;
const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);
const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"];

export interface CollectionEntry {
  id: string; // CollectionCard id
  variantId: string;
  cardId: string;
  quantity: number;
  condition: string;
  purchasePrice: number | null;
  marketPrice: number | null;
  finish: string;
  variantSlug: string;
}

interface CollectionStats {
  uniqueCards: number;
  totalCards: number;
  totalMarketValue: number;
  totalCostBasis: number;
}

interface CollectionBrowserProps {
  cards: BrowserCard[];
  sets: SetInfo[];
  collectionEntries: CollectionEntry[];
  stats: CollectionStats;
  collectionId: string;
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

export function CollectionBrowser({
  cards,
  sets,
  collectionEntries,
  stats,
  collectionId,
}: CollectionBrowserProps) {
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

  const [showOwnedOnly, setShowOwnedOnly] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedQ = useDebounce(q, 150);

  // Build lookup: cardId → CollectionEntry[]
  const ownedMap = useMemo(() => {
    const map = new Map<string, CollectionEntry[]>();
    for (const entry of collectionEntries) {
      const existing = map.get(entry.cardId) ?? [];
      existing.push(entry);
      map.set(entry.cardId, existing);
    }
    return map;
  }, [collectionEntries]);

  const ownedCardIds = useMemo(() => new Set(ownedMap.keys()), [ownedMap]);

  // Filter options
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

  const tokens = useMemo(() => tokenize(debouncedQ), [debouncedQ]);
  const activeFilters = useMemo(() => extractFilters(tokens), [tokens]);

  const filtered = useMemo(() => {
    let result = tokens.length === 0 ? cards : cards.filter((c) => matchesTokens(c, tokens));
    if (showOwnedOnly) {
      result = result.filter((c) => ownedCardIds.has(c.id));
    }
    return sortCards(result, sort);
  }, [cards, tokens, sort, showOwnedOnly, ownedCardIds]);

  const facetCounts = useMemo(() => {
    const base = showOwnedOnly ? cards.filter((c) => ownedCardIds.has(c.id)) : cards;
    const woElement = countWithout(base, tokens, "element");
    const woType = countWithout(base, tokens, "type");
    const woRarity = countWithout(base, tokens, "rarity");
    const woSet = countWithout(base, tokens, "set");
    const woSubtype = countWithout(base, tokens, "subtype");
    const woKeyword = countWithout(base, tokens, "keyword");

    return {
      elements: Object.fromEntries(
        ELEMENTS.map((e) => [e, woElement.filter((c) => c.elements.includes(e)).length])
      ),
      types: Object.fromEntries(
        allTypes.map((t) => [t, woType.filter((c) => c.type === t).length])
      ),
      rarities: Object.fromEntries(
        allRarities.map((r) => [r, woRarity.filter((c) => c.rarity === r).length])
      ),
      sets: Object.fromEntries(
        sets.map((s) => [s.slug, woSet.filter((c) => c.setSlugs.includes(s.slug)).length])
      ),
      subtypes: Object.fromEntries(
        allSubtypes.map((s) => [s, woSubtype.filter((c) => c.subTypes.includes(s)).length])
      ),
      keywords: Object.fromEntries(
        allKeywords.map((k) => [k, woKeyword.filter((c) => c.keywords.includes(k)).length])
      ),
    };
  }, [cards, tokens, allTypes, allRarities, allSubtypes, allKeywords, sets, showOwnedOnly, ownedCardIds]);

  const visibleCards = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [debouncedQ, sort, showOwnedOnly]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  const updateQuery = useCallback(
    (newQ: string) => { setQ(newQ || null); },
    [setQ]
  );

  const activeFieldCount = useMemo(
    () => tokens.filter((t) => t.kind === "field").length,
    [tokens]
  );

  const statRanges = useMemo(() => {
    let costMax = 0, atkMax = 0, defMax = 0;
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

  const roi =
    stats.totalCostBasis > 0
      ? ((stats.totalMarketValue - stats.totalCostBasis) / stats.totalCostBasis) * 100
      : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif text-amber-100">
          My Collection
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/collection/stats">
            <Button variant="outline" size="sm" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stats</span>
            </Button>
          </Link>
          <Link href="/collection/import">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          </Link>
          <Link href="/collection/export">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Cards"
          value={`${stats.totalCards}`}
          sub={`${stats.uniqueCards} unique`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Market Value"
          value={`$${stats.totalMarketValue.toFixed(2)}`}
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Cost Basis"
          value={stats.totalCostBasis > 0 ? `$${stats.totalCostBasis.toFixed(2)}` : "—"}
        />
        <StatCard
          icon={
            roi !== null && roi >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : roi !== null ? (
              <TrendingDown className="h-4 w-4 text-red-400" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )
          }
          label="ROI"
          value={roi !== null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"}
          valueClass={roi !== null ? (roi >= 0 ? "text-green-400" : "text-red-400") : ""}
        />
      </div>

      {/* Search + Filters + Sort */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder='Search collection...'
            value={q}
            onChange={(e) => setQ(e.target.value || null)}
            className="pl-9 pr-10 h-9"
          />
          {q && (
            <button
              onClick={() => setQ(null)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

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
            {showOwnedOnly ? "Showing owned cards only — click to show all" : "Showing all cards — click to filter to owned"}
          </TooltipContent>
        </Tooltip>

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

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} card{filtered.length !== 1 ? "s" : ""}
        {hasMore && <span> · showing {visibleCount}</span>}
      </p>

      {/* Card grid with collection overlay */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h2 className="text-lg font-serif text-muted-foreground mb-1">
            {showOwnedOnly ? "No cards in collection yet" : "No cards found"}
          </h2>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {showOwnedOnly
              ? "Browse cards and add them from their detail page."
              : "Try adjusting your search or filters"}
          </p>
          {showOwnedOnly && (
            <Button variant="outline" size="sm" onClick={() => setShowOwnedOnly(false)}>
              Browse all cards
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {visibleCards.map((card) => {
            const entries = ownedMap.get(card.id);
            const totalQty = entries?.reduce((s, e) => s + e.quantity, 0) ?? 0;
            const totalMarket = entries?.reduce((s, e) => s + (e.marketPrice ?? 0) * e.quantity, 0) ?? 0;
            const totalCost = entries?.reduce((s, e) => s + (e.purchasePrice ?? 0) * e.quantity, 0) ?? 0;
            const perfPct = totalCost > 0 ? ((totalMarket - totalCost) / totalCost) * 100 : null;
            const perfAbs = totalCost > 0 ? totalMarket - totalCost : null;

            return (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                prefetch={false}
                className="group"
              >
                {/* Card image */}
                <div className="relative overflow-hidden rounded-lg bg-muted/30">
                  {card.variantSlug ? (
                    <CardImage
                      slug={card.variantSlug}
                      name={card.name}
                      width={260}
                      height={364}
                      blurDataUrl={card.blurDataUrl}
                      className={cn(
                        "w-full h-auto transition-transform duration-200 group-hover:scale-105",
                        !entries && "opacity-40"
                      )}
                    />
                  ) : (
                    <div className="aspect-[5/7] flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}

                  {/* Quantity badge — bottom left of image */}
                  {entries && totalQty > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center">
                      {totalQty}
                    </div>
                  )}

                  {/* Price badge — bottom right of image */}
                  {entries && totalMarket > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/75 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      ${totalMarket.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Info below image — Manabox style */}
                <div className="mt-1.5 px-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] truncate text-muted-foreground group-hover:text-foreground transition-colors flex-1 min-w-0">
                      {card.name}
                    </p>
                    {entries && perfPct !== null && (
                      <span className={cn(
                        "text-[10px] font-semibold whitespace-nowrap flex items-center gap-0.5 shrink-0",
                        perfPct >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {perfPct >= 0 ? "+" : ""}{perfAbs!.toFixed(2)}
                        <span className="text-[9px] opacity-75">
                          ({perfPct >= 0 ? "+" : ""}{perfPct.toFixed(0)}%)
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={cn("text-lg font-bold tabular-nums", valueClass)}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
