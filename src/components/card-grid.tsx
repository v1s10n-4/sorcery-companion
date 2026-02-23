import Link from "next/link";
import { CardImage } from "@/components/card-image";
import type { BrowserCard } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CardGrid({ cards }: { cards: BrowserCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg">No cards found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
      {cards.map((card) => {
        const priceDiff =
          card.marketPrice != null && card.previousPrice != null && card.previousPrice > 0
            ? ((card.marketPrice - card.previousPrice) / card.previousPrice) * 100
            : null;

        return (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className="group"
            prefetch={false}
          >
            <div className="relative overflow-hidden rounded-lg bg-muted/30">
              {card.variantSlug ? (
                <CardImage
                  slug={card.variantSlug}
                  name={card.name}
                  width={260}
                  height={364}
                  blurDataUrl={card.blurDataUrl}
                  className="w-full h-auto transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="aspect-[5/7] flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            {/* Info below image */}
            <div className="mt-1 px-0.5 flex items-center justify-between gap-1">
              <p className="text-[11px] truncate text-muted-foreground group-hover:text-foreground transition-colors flex-1 min-w-0">
                {card.name}
              </p>
              {card.marketPrice != null ? (
                <span className="text-[10px] whitespace-nowrap shrink-0 flex items-center gap-1">
                  <span className="text-amber-300">${card.marketPrice.toFixed(2)}</span>
                  {priceDiff !== null && priceDiff !== 0 ? (
                    <span className={cn(
                      "font-semibold",
                      priceDiff > 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">0%</span>
                  )}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap shrink-0">
                  N/A
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
