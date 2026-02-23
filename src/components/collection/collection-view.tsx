"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Layers,
  Trash2,
  Search,
  Download,
  Upload,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { removeFromCollection } from "@/lib/actions/collection";
import Link from "next/link";

export interface CollectionCardData {
  id: string;
  cardId: string;
  variantId: string;
  cardName: string;
  cardType: string;
  elements: string[];
  rarity: string | null;
  variantSlug: string;
  finish: string;
  quantity: number;
  condition: string;
  purchasePrice: number | null;
  purchasedAt: string | null;
  marketPrice: number | null;
  addedAt: string;
}

interface CollectionStats {
  uniqueCards: number;
  totalCards: number;
  totalMarketValue: number;
  totalCostBasis: number;
}

interface CollectionViewProps {
  collectionId: string;
  collectionName: string;
  cards: CollectionCardData[];
  stats: CollectionStats;
  isPremium?: boolean;
}

type SortField = "name" | "value" | "roi" | "date" | "quantity";

export function CollectionView({
  collectionId,
  collectionName,
  cards,
  stats,
  isPremium = false,
}: CollectionViewProps) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const roi =
    stats.totalCostBasis > 0
      ? ((stats.totalMarketValue - stats.totalCostBasis) /
          stats.totalCostBasis) *
        100
      : null;

  const filtered = useMemo(() => {
    let result = cards;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.cardName.toLowerCase().includes(q) ||
          c.cardType.toLowerCase().includes(q) ||
          c.elements.some((e) => e.toLowerCase().includes(q)) ||
          (c.rarity && c.rarity.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "name":
          cmp = a.cardName.localeCompare(b.cardName);
          break;
        case "value":
          cmp = (a.marketPrice ?? 0) - (b.marketPrice ?? 0);
          break;
        case "roi": {
          const roiA =
            a.purchasePrice && a.marketPrice
              ? (a.marketPrice - a.purchasePrice) / a.purchasePrice
              : -Infinity;
          const roiB =
            b.purchasePrice && b.marketPrice
              ? (b.marketPrice - b.purchasePrice) / b.purchasePrice
              : -Infinity;
          cmp = roiA - roiB;
          break;
        }
        case "date":
          cmp =
            new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
          break;
        case "quantity":
          cmp = a.quantity - b.quantity;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [cards, search, sort, sortDir]);

  const handleRemove = async (cardId: string) => {
    setRemoving(cardId);
    await removeFromCollection(cardId);
    setRemoving(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-serif text-amber-100">
          {collectionName}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
          value={
            stats.totalCostBasis > 0
              ? `$${stats.totalCostBasis.toFixed(2)}`
              : "—"
          }
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
          value={
            roi !== null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"
          }
          valueClass={
            roi !== null ? (roi >= 0 ? "text-green-400" : "text-red-400") : ""
          }
        />
      </div>

      {/* Search + Sort */}
      {cards.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as SortField)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date added</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="roi">ROI</SelectItem>
              <SelectItem value="quantity">Quantity</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="shrink-0"
          >
            {sortDir === "desc" ? "↓" : "↑"}
          </Button>
        </div>
      )}

      {/* Cards list */}
      {cards.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h2 className="text-lg font-serif text-muted-foreground mb-1">
            No cards yet
          </h2>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Browse cards and add them to your collection from their detail page.
          </p>
          <Link href="/">
            <Button variant="outline" size="sm">
              Browse cards
            </Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No cards match &quot;{search}&quot;
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const cardRoi =
              c.purchasePrice && c.marketPrice
                ? ((c.marketPrice - c.purchasePrice) / c.purchasePrice) * 100
                : null;

            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 hover:border-border transition-colors"
              >
                <Link href={`/cards/${c.cardId}`}>
                  <CardImage
                    slug={c.variantSlug}
                    name={c.cardName}
                    width={40}
                    height={56}
                    className="rounded-sm flex-shrink-0"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cards/${c.cardId}`}
                      className="font-medium text-sm truncate hover:text-amber-200 transition-colors"
                    >
                      {c.cardName}
                    </Link>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {c.finish}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {c.condition}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>×{c.quantity}</span>
                    {c.marketPrice != null && (
                      <span className="text-amber-300">
                        ${(c.marketPrice * c.quantity).toFixed(2)}
                      </span>
                    )}
                    {c.purchasePrice != null && (
                      <span>Paid ${(c.purchasePrice * c.quantity).toFixed(2)}</span>
                    )}
                    {cardRoi !== null && (
                      <span
                        className={
                          cardRoi >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        {cardRoi >= 0 ? "+" : ""}
                        {cardRoi.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  disabled={removing === c.id}
                  className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
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
