"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Layers,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { removeFromCollection } from "@/lib/actions/collection";

interface CollectionCard {
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
  cards: CollectionCard[];
  stats: CollectionStats;
}

export function CollectionView({
  collectionId,
  collectionName,
  cards,
  stats,
}: CollectionViewProps) {
  const [removing, setRemoving] = useState<string | null>(null);
  const roi =
    stats.totalCostBasis > 0
      ? ((stats.totalMarketValue - stats.totalCostBasis) /
          stats.totalCostBasis) *
        100
      : null;

  const handleRemove = async (cardId: string) => {
    setRemoving(cardId);
    await removeFromCollection(cardId);
    setRemoving(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold font-serif text-amber-100 mb-6">
        {collectionName}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )
          }
          label="ROI"
          value={roi !== null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"}
          valueClass={
            roi !== null ? (roi >= 0 ? "text-green-400" : "text-red-400") : ""
          }
        />
      </div>

      {/* Cards list */}
      {cards.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h2 className="text-lg font-serif text-muted-foreground mb-1">
            No cards yet
          </h2>
          <p className="text-sm text-muted-foreground/70">
            Browse cards and add them to your collection from their detail page.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => {
            const cardRoi =
              c.purchasePrice && c.marketPrice
                ? ((c.marketPrice - c.purchasePrice) / c.purchasePrice) * 100
                : null;

            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 hover:border-border transition-colors"
              >
                <CardImage
                  slug={c.variantSlug}
                  name={c.cardName}
                  width={40}
                  height={56}
                  className="rounded-sm flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.cardName}</p>
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
                        ${c.marketPrice.toFixed(2)}
                      </span>
                    )}
                    {c.purchasePrice != null && (
                      <span>
                        Paid ${c.purchasePrice.toFixed(2)}
                      </span>
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
