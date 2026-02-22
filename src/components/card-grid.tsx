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
import { ElementBadges, StatIcon, Thresholds } from "@/components/icons";

interface CardData {
  id: string;
  name: string;
  type: string;
  rarity: string | null;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  elements: string[];
  thresholdAir: number;
  thresholdEarth: number;
  thresholdFire: number;
  thresholdWater: number;
  variants: {
    slug: string;
  }[];
}

const RARITY_COLORS: Record<string, string> = {
  Ordinary: "border-zinc-500 text-zinc-400",
  Exceptional: "border-sky-500 text-sky-400",
  Elite: "border-purple-500 text-purple-400",
  Unique: "border-amber-500 text-amber-400",
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
          <Card className="hover:shadow-lg hover:shadow-amber-900/10 hover:scale-[1.02] transition-all cursor-pointer h-full overflow-hidden border-border/50">
            {card.variants[0] && (
              <div className="p-1.5 pb-0">
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
                <CardTitle className="text-sm leading-tight line-clamp-1 font-serif">
                  {card.name}
                </CardTitle>
                {card.cost !== null && (
                  <span className="text-xs font-bold bg-amber-900/30 text-amber-200 border border-amber-700/50 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {card.cost}
                  </span>
                )}
              </div>
              <CardDescription className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                  {card.type}
                </Badge>
                {card.rarity && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${RARITY_COLORS[card.rarity] || ""}`}
                  >
                    {card.rarity}
                  </Badge>
                )}
                <ElementBadges elements={card.elements} size="xs" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  {card.attack !== null && (
                    <span className="flex items-center gap-0.5">
                      <StatIcon stat="attack" size="xs" />
                      {card.attack}
                    </span>
                  )}
                  {card.defence !== null && (
                    <span className="flex items-center gap-0.5">
                      <StatIcon stat="defence" size="xs" />
                      {card.defence}
                    </span>
                  )}
                  {card.life !== null && (
                    <span>❤️ {card.life}</span>
                  )}
                </div>
                <Thresholds
                  air={card.thresholdAir}
                  earth={card.thresholdEarth}
                  fire={card.thresholdFire}
                  water={card.thresholdWater}
                  size="xs"
                />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
