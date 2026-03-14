/**
 * Cached user-specific data functions.
 *
 * Same strategy as data.ts: cacheLife("max") + cacheTag() only.
 * All user data is invalidated via revalidateTag() in server actions
 * after mutations — never via time-based expiry.
 *
 * Tag taxonomy (user scope):
 *   "collection:{userId}"         → user's collection cards + stats
 *   "decks:{userId}"              → user's deck list
 *   "deck:{deckId}"               → single deck with cards
 *   "public-collection:{slug}"    → public collection page (/u/[slug])
 *   "user:{userId}"               → user profile/settings
 */

import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";
import { getTotalCardCount, getTotalVariantCount, getSetCardCounts } from "./data";

// ── Collection stats (/collection/stats) ──

export interface CollectionStatsData {
  completion: {
    uniqueCards: number;
    totalCards: number;
    uniqueVariants: number;
    totalVariants: number;
  };
  byType: Record<string, number>;
  byElement: Record<string, number>;
  byRarity: Record<string, number>;
  byCost: Record<number, number>;
  bySet: { owned: number; total: number; name: string }[];
}

export async function getCollectionStatsData(
  userId: string
): Promise<CollectionStatsData | null> {
  "use cache";
  cacheLife("max");
  cacheTag(`collection:${userId}`, "catalog:cards");

  const collection = await prisma.collection.findFirst({
    where: { userId },
    include: {
      cards: {
        include: {
          card: true,
          variant: { include: { set: { include: { set: true } } } },
        },
      },
    },
  });

  if (!collection) return null;

  const [totalGameCards, totalGameVariants, setTotals] = await Promise.all([
    getTotalCardCount(),
    getTotalVariantCount(),
    getSetCardCounts(),
  ]);

  const ownedCardIds = new Set(collection.cards.map((c) => c.cardId));
  const ownedVariantIds = new Set(collection.cards.map((c) => c.variantId));

  const byType: Record<string, number> = {};
  const byElement: Record<string, number> = {};
  const byRarity: Record<string, number> = {};
  const byCost: Record<number, number> = {};
  const bySet: Record<
    string,
    { owned: number; total: number; name: string }
  > = {};

  for (const cc of collection.cards) {
    const card = cc.card;
    const qty = cc.quantity;

    byType[card.type] = (byType[card.type] ?? 0) + qty;

    for (const el of card.elements) {
      byElement[el] = (byElement[el] ?? 0) + qty;
    }

    const rarity = card.rarity ?? "Unknown";
    byRarity[rarity] = (byRarity[rarity] ?? 0) + qty;

    if (card.cost != null) {
      byCost[card.cost] = (byCost[card.cost] ?? 0) + qty;
    }

    const setName = cc.variant.set.set.name;
    const setId = cc.variant.set.setId;
    if (!bySet[setId]) {
      const total = setTotals.find((st) => st.setId === setId)?._count ?? 0;
      bySet[setId] = { owned: 0, total, name: setName };
    }
    bySet[setId].owned++;
  }

  return {
    completion: {
      uniqueCards: ownedCardIds.size,
      totalCards: totalGameCards,
      uniqueVariants: ownedVariantIds.size,
      totalVariants: totalGameVariants,
    },
    byType,
    byElement,
    byRarity,
    byCost,
    bySet: Object.values(bySet),
  };
}

// ── Deck list (/decks) ──

export interface DeckSummary {
  id: string;
  name: string;
  avatarName: string | null;
  avatarSlug: string | null;
  atlasCount: number;
  spellbookCount: number;
  collectionCount: number;
  elements: string[];
  totalCards: number;
  updatedAt: string;
}

export async function getUserDecks(userId: string): Promise<DeckSummary[]> {
  "use cache";
  cacheLife("max");
  cacheTag(`decks:${userId}`);

  const decks = await prisma.deck.findMany({
    where: { userId },
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

  return decks.map((d) => {
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
}

// ── Deck detail (/decks/[id]) ──

export interface DeckCardEntry {
  id: string;
  cardId: string;
  cardName: string;
  cardType: string;
  rarity: string | null;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  elements: string[];
  slug: string;
  quantity: number;
  section: string;
}

export interface DeckDetail {
  id: string;
  name: string;
  userId: string;
  cards: DeckCardEntry[];
}

export async function getDeckWithCards(
  deckId: string
): Promise<DeckDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(`deck:${deckId}`);

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        include: {
          card: {
            include: {
              variants: {
                take: 1,
                orderBy: { createdAt: "asc" },
                select: { slug: true },
              },
            },
          },
        },
        orderBy: { card: { name: "asc" } },
      },
    },
  });

  if (!deck) return null;

  return {
    id: deck.id,
    name: deck.name,
    userId: deck.userId,
    cards: deck.cards.map((dc) => ({
      id: dc.id,
      cardId: dc.cardId,
      cardName: dc.card.name,
      cardType: dc.card.type,
      rarity: dc.card.rarity,
      cost: dc.card.cost,
      attack: dc.card.attack,
      defence: dc.card.defence,
      life: dc.card.life,
      elements: dc.card.elements,
      slug: dc.card.variants[0]?.slug ?? "",
      quantity: dc.quantity,
      section: dc.section,
    })),
  };
}

// ── Deck metadata (for generateMetadata, lighter query) ──

export async function getDeckMeta(deckId: string) {
  "use cache";
  cacheLife("max");
  cacheTag(`deck:${deckId}`);

  return prisma.deck.findUnique({
    where: { id: deckId },
    select: { name: true, userId: true },
  });
}

// ── Public collection (/u/[slug]) ──

export interface PublicCollectionCard {
  cardId: string;
  cardName: string;
  cardType: string;
  rarity: string | null;
  elements: string[];
  variantSlug: string;
  finish: string;
  quantity: number;
  condition: string;
  marketPrice: number | null;
}

export interface PublicCollectionData {
  ownerName: string;
  ownerAvatar: string | null;
  collectionName: string;
  description: string | null;
  cards: PublicCollectionCard[];
  totalCards: number;
  totalValue: number;
}

export async function getPublicCollection(
  slug: string
): Promise<PublicCollectionData | null> {
  "use cache";
  cacheLife("max");
  cacheTag(`public-collection:${slug}`);

  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      user: { select: { name: true, avatarUrl: true } },
      cards: {
        include: {
          card: true,
          variant: {
            include: {
              tcgplayerProducts: {
                include: {
                  priceSnapshots: {
                    orderBy: { recordedAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!collection || !collection.isPublic) return null;

  const cards: PublicCollectionCard[] = collection.cards.map((cc) => {
    const latestPrice =
      cc.variant.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null;
    return {
      cardId: cc.cardId,
      cardName: cc.card.name,
      cardType: cc.card.type,
      rarity: cc.card.rarity,
      elements: cc.card.elements,
      variantSlug: cc.variant.slug,
      finish: cc.variant.finish,
      quantity: cc.quantity,
      condition: cc.condition,
      marketPrice: latestPrice,
    };
  });

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const totalValue = cards.reduce(
    (sum, c) => sum + (c.marketPrice ?? 0) * c.quantity,
    0
  );

  return {
    ownerName: collection.user.name ?? "User",
    ownerAvatar: collection.user.avatarUrl,
    collectionName: collection.name,
    description: collection.description,
    cards,
    totalCards,
    totalValue,
  };
}

// ── Public collection metadata (for generateMetadata, lighter query) ──

export async function getPublicCollectionMeta(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(`public-collection:${slug}`);

  return prisma.collection.findUnique({
    where: { slug },
    select: {
      isPublic: true,
      name: true,
      description: true,
      user: { select: { name: true } },
    },
  });
}
