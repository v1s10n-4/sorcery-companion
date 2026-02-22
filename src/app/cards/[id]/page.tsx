import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CardImage } from "@/components/card-image";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ELEMENT_COLORS: Record<string, string> = {
  Air: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  Earth: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Fire: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Water: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default async function CardDetailPage({ params }: PageProps) {
  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      sets: {
        include: {
          variants: true,
        },
        orderBy: { releasedAt: "asc" },
      },
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!card) notFound();

  const primaryVariant = card.variants[0];

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 inline-block"
      >
        ← Back to cards
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Card Image */}
        <div>
          {primaryVariant && (
            <CardImage slug={primaryVariant.slug} name={card.name} />
          )}
        </div>

        {/* Card Details */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{card.name}</h1>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary">{card.type}</Badge>
            {card.rarity && <Badge variant="outline">{card.rarity}</Badge>}
            {card.subTypes && <Badge variant="outline">{card.subTypes}</Badge>}
            {card.elements &&
              card.elements !== "None" &&
              card.elements.split(",").map((el) => (
                <Badge
                  key={el.trim()}
                  className={ELEMENT_COLORS[el.trim()] || ""}
                >
                  {el.trim()}
                </Badge>
              ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {card.cost !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cost:</span>
                <span className="font-bold">{card.cost}</span>
              </div>
            )}
            {card.attack !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Attack:</span>
                <span className="font-bold">⚔️ {card.attack}</span>
              </div>
            )}
            {card.defence !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Defence:</span>
                <span className="font-bold">🛡️ {card.defence}</span>
              </div>
            )}
            {card.life !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Life:</span>
                <span className="font-bold">❤️ {card.life}</span>
              </div>
            )}
          </div>

          {/* Thresholds */}
          {(card.thresholdAir > 0 ||
            card.thresholdEarth > 0 ||
            card.thresholdFire > 0 ||
            card.thresholdWater > 0) && (
            <div className="flex gap-4 mb-6">
              <span className="text-sm text-muted-foreground">Thresholds:</span>
              {card.thresholdAir > 0 && <span>🌬️ {card.thresholdAir}</span>}
              {card.thresholdEarth > 0 && <span>🌿 {card.thresholdEarth}</span>}
              {card.thresholdFire > 0 && <span>🔥 {card.thresholdFire}</span>}
              {card.thresholdWater > 0 && <span>💧 {card.thresholdWater}</span>}
            </div>
          )}

          {/* Rules Text */}
          {card.rulesText && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Rules</h2>
              <p className="whitespace-pre-line">{card.rulesText}</p>
            </div>
          )}

          {/* Sets & Variants */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Printings</h2>
            <div className="flex flex-col gap-3">
              {card.sets.map((set) => (
                <Card key={set.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{set.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {set.variants.map((v) => (
                        <div key={v.id} className="text-xs space-y-1">
                          <Badge variant="outline">{v.finish}</Badge>
                          {v.artist && (
                            <p className="text-muted-foreground">
                              🎨 {v.artist}
                            </p>
                          )}
                          {v.flavorText && (
                            <p className="italic text-muted-foreground">
                              &quot;{v.flavorText}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
