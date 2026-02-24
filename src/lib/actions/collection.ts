"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AddToCollectionInput {
  variantId: string;
  quantity?: number;
  condition?: string;
  purchasePrice?: number | null;
}

export async function addToCollection(input: AddToCollectionInput) {
  const user = await requireUser();

  // Get or create default collection
  let collection = await prisma.collection.findFirst({
    where: { userId: user.id },
  });

  if (!collection) {
    collection = await prisma.collection.create({
      data: { name: "My Collection", userId: user.id },
    });
  }

  // Get the variant to find its cardId + current market price
  const variant = await prisma.cardVariant.findUnique({
    where: { id: input.variantId },
    select: {
      cardId: true,
      tcgplayerProducts: {
        include: {
          priceSnapshots: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
        take: 1,
      },
    },
  });

  if (!variant) throw new Error("Variant not found");

  // Default purchase price to current market price if not specified
  const currentMarketPrice =
    variant.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null;
  const purchasePrice =
    input.purchasePrice !== undefined
      ? input.purchasePrice
      : currentMarketPrice;

  // Upsert — if variant already in collection, add quantity
  const existing = await prisma.collectionCard.findUnique({
    where: {
      collectionId_variantId: {
        collectionId: collection.id,
        variantId: input.variantId,
      },
    },
  });

  if (existing) {
    await prisma.collectionCard.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + (input.quantity ?? 1),
        condition: input.condition ?? existing.condition,
        purchasePrice: input.purchasePrice ?? existing.purchasePrice,
      },
    });
  } else {
    await prisma.collectionCard.create({
      data: {
        collectionId: collection.id,
        cardId: variant.cardId,
        variantId: input.variantId,
        quantity: input.quantity ?? 1,
        condition: input.condition ?? "NM",
        purchasePrice: purchasePrice,
        purchasedAt: new Date(),
      },
    });
  }

  revalidatePath("/collection");
  return { success: true };
}

export async function removeFromCollection(collectionCardId: string) {
  const user = await requireUser();

  // Verify ownership
  const card = await prisma.collectionCard.findUnique({
    where: { id: collectionCardId },
    include: { collection: { select: { userId: true } } },
  });

  if (!card || card.collection.userId !== user.id) {
    throw new Error("Not found");
  }

  await prisma.collectionCard.delete({
    where: { id: collectionCardId },
  });

  revalidatePath("/collection");
  return { success: true };
}

/** Add a card to collection by card ID (resolves default Standard variant) */
export async function addToCollectionByCard(cardId: string) {
  const user = await requireUser();

  // Find the default Standard variant for this card
  const variant = await prisma.cardVariant.findFirst({
    where: { cardId },
    orderBy: [
      { finish: "asc" }, // "Standard" sorts before other finishes
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      tcgplayerProducts: {
        include: {
          priceSnapshots: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
        take: 1,
      },
    },
  });

  if (!variant) throw new Error("No variant found for card");

  return addToCollection({
    variantId: variant.id,
    quantity: 1,
    purchasePrice: null, // will default to market price in addToCollection
  });
}

export async function updateCollectionCard(
  collectionCardId: string,
  data: {
    quantity?: number;
    condition?: string;
    purchasePrice?: number | null;
  }
) {
  const user = await requireUser();

  const card = await prisma.collectionCard.findUnique({
    where: { id: collectionCardId },
    include: { collection: { select: { userId: true } } },
  });

  if (!card || card.collection.userId !== user.id) {
    throw new Error("Not found");
  }

  await prisma.collectionCard.update({
    where: { id: collectionCardId },
    data,
  });

  revalidatePath("/collection");
  return { success: true };
}

/** Fetch all variants for a card (for variant picker) */
export async function getCardVariants(cardId: string) {
  const variants = await prisma.cardVariant.findMany({
    where: { cardId },
    orderBy: [{ finish: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      finish: true,
      product: true,
      artist: true,
      set: {
        select: { set: { select: { name: true } } },
      },
      tcgplayerProducts: {
        take: 1,
        select: {
          priceSnapshots: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: { marketPrice: true },
          },
        },
      },
    },
  });

  return variants.map((v) => ({
    id: v.id,
    slug: v.slug,
    finish: v.finish,
    product: v.product,
    artist: v.artist,
    setName: v.set.set.name,
    marketPrice: v.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null,
  }));
}

/** Remove cards from collection by card ID */
export async function removeFromCollectionByCardId(cardId: string, quantity: number = 1) {
  const user = await requireUser();

  const collection = await prisma.collection.findFirst({
    where: { userId: user.id },
  });
  if (!collection) throw new Error("No collection");

  // Find collection cards matching this cardId
  const collectionCards = await prisma.collectionCard.findMany({
    where: { collectionId: collection.id, cardId },
    orderBy: { createdAt: "asc" },
  });

  let toRemove = quantity;
  for (const cc of collectionCards) {
    if (toRemove <= 0) break;
    if (cc.quantity <= toRemove) {
      toRemove -= cc.quantity;
      await prisma.collectionCard.delete({ where: { id: cc.id } });
    } else {
      await prisma.collectionCard.update({
        where: { id: cc.id },
        data: { quantity: cc.quantity - toRemove },
      });
      toRemove = 0;
    }
  }

  revalidatePath("/collection");
  return { success: true };
}

// ── Batch operations (single auth check, single revalidate) ──

export interface BatchCollectionItem {
  cardId: string;
  quantity: number;
  variantId?: string; // override variant, otherwise resolves default
}

/** Add multiple cards to collection in one batch */
export async function batchAddToCollection(items: BatchCollectionItem[]) {
  if (items.length === 0) return { success: true, added: 0 };

  const user = await requireUser();

  let collection = await prisma.collection.findFirst({
    where: { userId: user.id },
  });
  if (!collection) {
    collection = await prisma.collection.create({
      data: { name: "My Collection", userId: user.id },
    });
  }

  // Resolve variants for all cards at once
  const cardIds = [...new Set(items.map((i) => i.cardId))];
  const variants = await prisma.cardVariant.findMany({
    where: { cardId: { in: cardIds } },
    orderBy: [{ finish: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      cardId: true,
      tcgplayerProducts: {
        take: 1,
        select: {
          priceSnapshots: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: { marketPrice: true },
          },
        },
      },
    },
  });

  // Build cardId → default variant map
  const defaultVariantMap = new Map<string, typeof variants[0]>();
  for (const v of variants) {
    if (!defaultVariantMap.has(v.cardId)) {
      defaultVariantMap.set(v.cardId, v);
    }
  }
  // Also build variantId → variant for overrides
  const variantById = new Map(variants.map((v) => [v.id, v]));

  // Get existing collection cards for upsert
  const existingCards = await prisma.collectionCard.findMany({
    where: { collectionId: collection.id, cardId: { in: cardIds } },
  });
  const existingMap = new Map(
    existingCards.map((c) => [`${c.cardId}-${c.variantId}`, c])
  );

  let added = 0;
  const operations: Promise<unknown>[] = [];

  for (const item of items) {
    const resolvedVariant = item.variantId
      ? variantById.get(item.variantId)
      : defaultVariantMap.get(item.cardId);
    if (!resolvedVariant) continue;

    const marketPrice =
      resolvedVariant.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null;
    const key = `${item.cardId}-${resolvedVariant.id}`;
    const existing = existingMap.get(key);

    if (existing) {
      operations.push(
        prisma.collectionCard.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        })
      );
      // Update map for subsequent items targeting same card
      existing.quantity += item.quantity;
    } else {
      const newCard = {
        collectionId: collection.id,
        cardId: item.cardId,
        variantId: resolvedVariant.id,
        quantity: item.quantity,
        condition: "NM",
        purchasePrice: marketPrice,
        purchasedAt: new Date(),
      };
      operations.push(prisma.collectionCard.create({ data: newCard }));
      existingMap.set(key, { ...newCard, id: "pending" } as any);
    }
    added += item.quantity;
  }

  await Promise.all(operations);
  revalidatePath("/collection");
  return { success: true, added };
}

/** Remove multiple cards from collection in one batch */
export async function batchRemoveFromCollection(items: { cardId: string; quantity: number }[]) {
  if (items.length === 0) return { success: true, removed: 0 };

  const user = await requireUser();
  const collection = await prisma.collection.findFirst({
    where: { userId: user.id },
  });
  if (!collection) throw new Error("No collection");

  const cardIds = items.map((i) => i.cardId);
  const collectionCards = await prisma.collectionCard.findMany({
    where: { collectionId: collection.id, cardId: { in: cardIds } },
    orderBy: { createdAt: "asc" },
  });

  // Group by cardId
  const byCard = new Map<string, typeof collectionCards>();
  for (const cc of collectionCards) {
    const arr = byCard.get(cc.cardId) ?? [];
    arr.push(cc);
    byCard.set(cc.cardId, arr);
  }

  let removed = 0;
  const operations: Promise<unknown>[] = [];

  for (const item of items) {
    let toRemove = item.quantity;
    const cards = byCard.get(item.cardId) ?? [];
    for (const cc of cards) {
      if (toRemove <= 0) break;
      if (cc.quantity <= toRemove) {
        toRemove -= cc.quantity;
        removed += cc.quantity;
        operations.push(prisma.collectionCard.delete({ where: { id: cc.id } }));
      } else {
        removed += toRemove;
        operations.push(
          prisma.collectionCard.update({
            where: { id: cc.id },
            data: { quantity: cc.quantity - toRemove },
          })
        );
        toRemove = 0;
      }
    }
  }

  await Promise.all(operations);
  revalidatePath("/collection");
  return { success: true, removed };
}
