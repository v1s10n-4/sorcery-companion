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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.id} href={`/cards/${card.id}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            {card.variants[0] && (
              <div className="px-4 pt-4">
                <CardImage
                  slug={card.variants[0].slug}
                  name={card.name}
                  width={260}
                  height={364}
                  className="w-full h-auto"
                />
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{card.name}</CardTitle>
                {card.cost !== null && (
                  <span className="text-sm font-bold bg-muted rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                    {card.cost}
                  </span>
                )}
              </div>
              <CardDescription className="flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {card.type}
                </Badge>
                {card.rarity && (
                  <Badge variant="outline" className="text-xs">
                    {card.rarity}
                  </Badge>
                )}
                {card.elements &&
                  card.elements !== "None" &&
                  card.elements.split(",").map((el) => (
                    <Badge
                      key={el.trim()}
                      className={`text-xs ${ELEMENT_COLORS[el.trim()] || ""}`}
                    >
                      {el.trim()}
                    </Badge>
                  ))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 text-xs">
                {card.attack !== null && <span>⚔️ {card.attack}</span>}
                {card.defence !== null && <span>🛡️ {card.defence}</span>}
                {card.life !== null && <span>❤️ {card.life}</span>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
