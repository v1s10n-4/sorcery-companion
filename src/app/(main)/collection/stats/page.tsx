import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollectionStatsView } from "@/components/collection/stats-view";

export const metadata: Metadata = {
  title: "Collection Stats — Sorcery Companion",
};

export default async function CollectionStatsPage() {
  const user = await requireUser();

  const collection = await prisma.collection.findFirst({
    where: { userId: user.id },
    include: {
      cards: {
        include: {
          card: true,
          variant: { include: { set: { include: { set: true } } } },
        },
      },
    },
  });

  if (!collection) {
    return (
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <p className="text-muted-foreground text-center py-12">
          No collection found. Add some cards first!
        </p>
      </main>
    );
  }

  // Total cards in the game
  const totalGameCards = await prisma.card.count();
  const totalGameVariants = await prisma.cardVariant.count();

  // Cards by set
  const setTotals = await prisma.cardSet.groupBy({
    by: ["setId"],
    _count: true,
  });
  const sets = await prisma.set.findMany();
  const setMap = new Map(sets.map((s) => [s.id, s]));

  // Aggregate collection data
  const ownedCardIds = new Set(collection.cards.map((c) => c.cardId));
  const ownedVariantIds = new Set(collection.cards.map((c) => c.variantId));

  // By type
  const byType: Record<string, number> = {};
  // By element
  const byElement: Record<string, number> = {};
  // By rarity
  const byRarity: Record<string, number> = {};
  // By cost (mana curve)
  const byCost: Record<number, number> = {};
  // By set
  const bySet: Record<string, { owned: number; total: number; name: string }> = {};

  for (const cc of collection.cards) {
    const card = cc.card;
    const qty = cc.quantity;

    // Type
    byType[card.type] = (byType[card.type] ?? 0) + qty;

    // Elements
    for (const el of card.elements) {
      byElement[el] = (byElement[el] ?? 0) + qty;
    }

    // Rarity
    const rarity = card.rarity ?? "Unknown";
    byRarity[rarity] = (byRarity[rarity] ?? 0) + qty;

    // Cost
    if (card.cost != null) {
      byCost[card.cost] = (byCost[card.cost] ?? 0) + qty;
    }

    // Set
    const setName = cc.variant.set.set.name;
    const setId = cc.variant.set.setId;
    if (!bySet[setId]) {
      const total = setTotals.find((st) => st.setId === setId)?._count ?? 0;
      bySet[setId] = { owned: 0, total, name: setName };
    }
    bySet[setId].owned++;
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <CollectionStatsView
        completion={{
          uniqueCards: ownedCardIds.size,
          totalCards: totalGameCards,
          uniqueVariants: ownedVariantIds.size,
          totalVariants: totalGameVariants,
        }}
        byType={byType}
        byElement={byElement}
        byRarity={byRarity}
        byCost={byCost}
        bySet={Object.values(bySet)}
      />
    </main>
  );
}
