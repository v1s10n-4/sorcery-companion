"use client";

import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, DollarSign, Globe } from "lucide-react";
import Link from "next/link";

interface PublicCard {
  cardId: string;
  cardName: string;
  cardType: string;
  rarity: string | null;
  elements: string[];
  variantSlug: string;
  finish: string;
  quantity: number;
  condition: string;
  marketPrice: number | null;
}

interface PublicCollectionViewProps {
  ownerName: string;
  ownerAvatar: string | null;
  collectionName: string;
  description: string | null;
  cards: PublicCard[];
  totalCards: number;
  totalValue: number;
}

export function PublicCollectionView({
  ownerName,
  ownerAvatar,
  collectionName,
  description,
  cards,
  totalCards,
  totalValue,
}: PublicCollectionViewProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {ownerAvatar ? (
          <img
            src={ownerAvatar}
            alt={ownerName}
            className="h-10 w-10 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-amber-900/50 border border-amber-700/50 flex items-center justify-center text-lg font-medium text-amber-200">
            {ownerName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold font-serif text-amber-100">
            {collectionName}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {ownerName}&apos;s public collection
          </p>
        </div>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="h-4 w-4" />
              <span className="text-xs">Cards</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{totalCards}</p>
            <p className="text-[10px] text-muted-foreground">
              {cards.length} unique
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Estimated Value</span>
            </div>
            <p className="text-lg font-bold tabular-nums">
              ${totalValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {cards.map((c, i) => (
          <div
            key={`${c.cardId}-${c.variantSlug}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3"
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
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>×{c.quantity}</span>
                {c.marketPrice != null && (
                  <span className="text-amber-300">
                    ${(c.marketPrice * c.quantity).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
