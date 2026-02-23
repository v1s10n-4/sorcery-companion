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
        include: { card: { select: { name: true, type: true, elements: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = decks.map((d) => {
    const avatar = d.cards.find((c) => c.section === "avatar");
    const atlasCount = d.cards
      .filter((c) => c.section === "atlas")
      .reduce((s, c) => s + c.quantity, 0);
    const spellbookCount = d.cards
      .filter((c) => c.section === "spellbook")
      .reduce((s, c) => s + c.quantity, 0);

    // Collect elements from all cards
    const elements = new Set<string>();
    d.cards.forEach((c) => c.card.elements.forEach((e) => elements.add(e)));

    return {
      id: d.id,
      name: d.name,
      avatarName: avatar?.card.name ?? null,
      atlasCount,
      spellbookCount,
      elements: Array.from(elements),
      updatedAt: d.updatedAt.toISOString(),
    };
  });

  return (
    <main className="container mx-auto px-4 py-6 max-w-3xl">
      <DeckListView decks={serialized} isPremium={user.plan === "premium"} />
    </main>
  );
}
