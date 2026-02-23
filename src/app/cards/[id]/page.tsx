import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CardImage } from "@/components/card-image";
import { ElementBadges, StatIcon, Thresholds } from "@/components/icons";
import { CardDetailSkeleton } from "@/components/skeletons";
import { ChevronLeft, Paintbrush } from "lucide-react";
import { getCard } from "@/lib/data";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Metadata ──

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return { title: "Card Not Found" };
  return {
    title: `${card.name} — Sorcery Companion`,
    description: `${card.name} is a${card.rarity ? ` ${card.rarity}` : ""} ${card.type} in Sorcery: Contested Realm.`,
  };
}

// ── Page ──

export default async function CardDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to cards
      </Link>

      <Suspense fallback={<CardDetailSkeleton />}>
        <CardDetailContent id={id} />
      </Suspense>
    </main>
  );
}

// ── Async data component ──

const RARITY_COLORS: Record<string, string> = {
  Ordinary: "border-zinc-500 text-zinc-400",
  Exceptional: "border-sky-500 text-sky-400",
  Elite: "border-purple-500 text-purple-400",
  Unique: "border-amber-500 text-amber-400",
};

async function CardDetailContent({ id }: { id: string }) {
  const card = await getCard(id);
  if (!card) notFound();

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
      {/* Card Image */}
      <div className="space-y-3">
        {card.variants[0] && (
          <CardImage
            slug={card.variants[0].slug}
            name={card.name}
            width={300}
            height={420}
            blurDataUrl={card.variants[0].blurDataUrl}
          />
        )}

        {card.variants.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {card.variants.slice(0, 8).map((v) => (
              <CardImage
                key={v.id}
                slug={v.slug}
                name={card.name}
                width={70}
                height={98}
                blurDataUrl={v.blurDataUrl}
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Details */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif text-amber-100 mb-2">
          {card.name}
        </h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">{card.type}</Badge>
          {card.rarity && (
            <Badge
              variant="outline"
              className={RARITY_COLORS[card.rarity] || ""}
            >
              {card.rarity}
            </Badge>
          )}
          {card.subTypes.map((st) => (
            <Badge key={st} variant="outline">
              {st}
            </Badge>
          ))}
        </div>

        {card.elements.length > 0 && (
          <div className="mb-4">
            <ElementBadges elements={card.elements} size="md" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {card.cost !== null && (
            <StatBlock>
              <StatIcon stat="cost" size="md" />
              <span className="font-bold text-amber-200 ml-auto text-lg">
                {card.cost}
              </span>
            </StatBlock>
          )}
          {card.attack !== null && (
            <StatBlock>
              <StatIcon stat="attack" size="md" />
              <span className="font-bold ml-auto text-lg">{card.attack}</span>
            </StatBlock>
          )}
          {card.defence !== null && (
            <StatBlock>
              <StatIcon stat="defence" size="md" />
              <span className="font-bold ml-auto text-lg">{card.defence}</span>
            </StatBlock>
          )}
          {card.life !== null && (
            <StatBlock>
              <StatIcon stat="life" size="md" />
              <span className="font-bold text-rose-400 ml-auto text-lg">
                {card.life}
              </span>
            </StatBlock>
          )}
        </div>

        <div className="mb-6">
          <Thresholds
            air={card.thresholdAir}
            earth={card.thresholdEarth}
            fire={card.thresholdFire}
            water={card.thresholdWater}
            size="md"
          />
        </div>

        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {card.keywords.map((kw) => (
              <Badge
                key={kw}
                variant="outline"
                className="border-amber-700/50 text-amber-300 text-xs"
              >
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {card.rulesText && (
          <div className="mb-6 bg-card rounded-lg p-4 border border-border/50">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Rules
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {card.rulesText}
            </p>
          </div>
        )}

        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Printings
          </h2>
          <div className="flex flex-col gap-3">
            {card.sets.map((cs) => (
              <Card key={cs.id} className="border-border/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-serif">
                    {cs.set.name}
                    {cs.set.releasedAt && (
                      <span className="text-xs text-muted-foreground ml-2 font-sans">
                        {new Date(cs.set.releasedAt).toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" }
                        )}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex flex-wrap gap-3">
                    {cs.variants.map((v) => (
                      <div key={v.id} className="text-xs space-y-1">
                        <Badge variant="outline" className="text-[10px]">
                          {v.finish}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] ml-1"
                        >
                          {v.product.replace(/_/g, " ")}
                        </Badge>
                        {v.artist && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Paintbrush className="h-3 w-3" />
                            {v.artist}
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
  );
}

function StatBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-card rounded-lg p-3 border border-border/50">
      {children}
    </div>
  );
}
