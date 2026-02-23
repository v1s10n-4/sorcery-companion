import { prisma } from "@/lib/prisma";
import { CardBrowser } from "@/components/card-browser";
import type { BrowserCard, SetInfo } from "@/lib/types";

export default async function Home() {
  const [rawCards, sets] = await Promise.all([
    prisma.card.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        rarity: true,
        cost: true,
        attack: true,
        defence: true,
        life: true,
        elements: true,
        rulesText: true,
        thresholdAir: true,
        thresholdEarth: true,
        thresholdFire: true,
        thresholdWater: true,
        variants: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { slug: true },
        },
        sets: {
          select: { set: { select: { slug: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.set.findMany({
      orderBy: { releasedAt: "asc" },
      select: { name: true, slug: true, cardCount: true },
    }),
  ]);

  // Flatten for client
  const cards: BrowserCard[] = rawCards.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    rarity: c.rarity,
    cost: c.cost,
    attack: c.attack,
    defence: c.defence,
    life: c.life,
    elements: c.elements,
    rulesText: c.rulesText,
    variantSlug: c.variants[0]?.slug ?? null,
    setSlugs: c.sets.map((cs) => cs.set.slug),
  }));

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-amber-100">
          Sorcery Companion
        </h1>
      </div>
      <CardBrowser cards={cards} sets={sets as SetInfo[]} />
    </main>
  );
}
