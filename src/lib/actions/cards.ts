"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

/** Fetch minimal card metadata for display (name, type, rarity, image slug) */
export async function getCardMetaBatch(cardIds: string[]) {
  if (cardIds.length === 0) return [];

  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
    select: {
      id: true,
      name: true,
      type: true,
      rarity: true,
      variants: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { slug: true },
      },
    },
  });

  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    rarity: c.rarity,
    slug: c.variants[0]?.slug ?? null,
  }));
}

/** Fetch current user's decks (id + name). Returns [] if not logged in. */
export async function getUserDecks() {
  const user = await getUser();
  if (!user) return [];

  return prisma.deck.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
  });
}
