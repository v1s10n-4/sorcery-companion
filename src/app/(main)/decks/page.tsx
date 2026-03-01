import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeckListView } from "@/components/deck/deck-list-view";

export const metadata: Metadata = {
  title: "My Decks — Sorcery Companion",
};

export default async function DecksPage() {
  const user = await requireUser();

  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    include: {
      cards: {
        include: {
          card: {
            select: {
              name: true,
              type: true,
              elements: true,
              variants: {
                take: 1,
                orderBy: { createdAt: "asc" },
                select: { slug: true },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = decks.map((d) => {
    const avatarCard = d.cards.find((c) => c.section === "avatar");
    const atlasCount = d.cards
      .filter((c) => c.section === "atlas")
      .reduce((s, c) => s + c.quantity, 0);
    const spellbookCount = d.cards
      .filter((c) => c.section === "spellbook")
      .reduce((s, c) => s + c.quantity, 0);
    const collectionCount = d.cards
      .filter((c) => c.section === "collection")
      .reduce((s, c) => s + c.quantity, 0);

    const elements = new Set<string>();
    d.cards.forEach((c) => c.card.elements.forEach((e) => elements.add(e)));

    return {
      id: d.id,
      name: d.name,
      avatarName: avatarCard?.card.name ?? null,
      avatarSlug: avatarCard?.card.variants[0]?.slug ?? null,
      atlasCount,
      spellbookCount,
      collectionCount,
      elements: Array.from(elements),
      totalCards: d.cards.reduce((s, c) => s + c.quantity, 0),
      updatedAt: d.updatedAt.toISOString(),
    };
  });

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
      <DeckListView decks={serialized} />
    </main>
  );
}
