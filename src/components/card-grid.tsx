import Link from "next/link";
import { CardImage } from "@/components/card-image";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RARITY_COLORS } from "@/lib/types";
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
      {cards.map((card) => (
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
            {/* Quick info overlay on hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-1 flex-wrap">
                {card.rarity && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border",
                        RARITY_COLORS[card.rarity] || "border-border text-muted-foreground"
                      )}>
                        {card.rarity.charAt(0)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{card.rarity}</TooltipContent>
                  </Tooltip>
                )}
                <span className="text-[9px] text-white/70">{card.type}</span>
                {card.cost !== null && (
                  <span className="text-[9px] text-amber-300 ml-auto">⬡{card.cost}</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-[11px] mt-1 text-center truncate text-muted-foreground group-hover:text-foreground transition-colors px-0.5">
            {card.name}
          </p>
        </Link>
      ))}
    </div>
  );
}
