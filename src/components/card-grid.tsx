import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/card-image";

interface CardData {
  id: string;
  name: string;
  type: string;
  rarity: string | null;
  rulesText: string | null;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  elements: string | null;
  subTypes: string | null;
  thresholdAir: number;
  thresholdEarth: number;
  thresholdFire: number;
  thresholdWater: number;
  variants: {
    slug: string;
  }[];
}

const ELEMENT_COLORS: Record<string, string> = {
  Air: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  Earth: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Fire: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Water: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function CardGrid({ cards }: { cards: CardData[] }) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No cards found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {cards.map((card) => (
        <Link key={card.id} href={`/cards/${card.id}`}>
          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer h-full overflow-hidden group">
            {card.variants[0] && (
              <div className="p-2 pb-0">
                <CardImage
                  slug={card.variants[0].slug}
                  name={card.name}
                  width={260}
                  height={364}
                  className="w-full h-auto rounded-md"
                />
              </div>
            )}
            <CardHeader className="p-2 pb-1">
              <div className="flex justify-between items-start gap-1">
                <CardTitle className="text-sm leading-tight line-clamp-1">
                  {card.name}
                </CardTitle>
                {card.cost !== null && (
                  <span className="text-xs font-bold bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {card.cost}
                  </span>
                )}
              </div>
              <CardDescription className="flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {card.type}
                </Badge>
                {card.rarity && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {card.rarity}
                  </Badge>
                )}
                {card.elements &&
                  card.elements !== "None" &&
                  card.elements.split(",").map((el) => (
                    <Badge
                      key={el.trim()}
                      className={`text-[10px] px-1.5 py-0 ${ELEMENT_COLORS[el.trim()] || ""}`}
                    >
                      {el.trim()}
                    </Badge>
                  ))}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex gap-2 text-[10px] text-muted-foreground">
                {card.attack !== null && <span>⚔️{card.attack}</span>}
                {card.defence !== null && <span>🛡️{card.defence}</span>}
                {card.life !== null && <span>❤️{card.life}</span>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
