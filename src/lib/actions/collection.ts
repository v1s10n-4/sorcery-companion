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
