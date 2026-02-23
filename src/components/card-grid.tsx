import Link from "next/link";
import { CardImage } from "@/components/card-image";
import type { BrowserCard } from "@/lib/types";

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
                className="w-full h-auto transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="aspect-[5/7] flex items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <p className="text-[11px] mt-1 text-center truncate text-muted-foreground group-hover:text-foreground transition-colors px-0.5">
            {card.name}
          </p>
        </Link>
      ))}
    </div>
  );
}
