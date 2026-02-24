"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Rarity limits ──
const RARITY_LIMITS: Record<string, number> = {
  ordinary: 4,
  exceptional: 4,
  elite: 2,
  unique: 1,
};

const ATLAS_SIZE = 30;
const SPELLBOOK_SIZE = 60;
const COLLECTION_SIZE = 10; // sideboard

export async function createDeck(name: string) {
  const user = await requireUser();

  const deck = await prisma.deck.create({
    data: { name, userId: user.id },
  });

  redirect(`/decks/${deck.id}`);
}

export async function deleteDeck(deckId: string) {
  const user = await requireUser();
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.userId !== user.id) throw new Error("Not found");

  await prisma.deck.delete({ where: { id: deckId } });
  revalidatePath("/decks");
  return { success: true };
}

export async function updateDeck(
  deckId: string,
  data: { name?: string; description?: string; isPublic?: boolean; slug?: string }
) {
  const user = await requireUser();
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.userId !== user.id) throw new Error("Not found");

  let slug = data.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || undefined;
  if (slug) {
    const existing = await prisma.deck.findUnique({ where: { slug } });
    if (existing && existing.id !== deckId) throw new Error("Slug taken");
  }

  await prisma.deck.update({ where: { id: deckId }, data: { ...data, slug } });
  revalidatePath(`/decks/${deckId}`);
  return { success: true };
}

export async function addCardToDeck(
  deckId: string,
  cardId: string,
  section: "avatar" | "atlas" | "spellbook" | "collection"
) {
  const user = await requireUser();
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: { include: { card: true } } },
  });
  if (!deck || deck.userId !== user.id) throw new Error("Not found");

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("Card not found");

  // Validate section matches card type
  if (section === "avatar" && card.type !== "Avatar") {
    throw new Error("Only Avatar cards can be in the Avatar slot");
  }
  if (section === "atlas" && card.type !== "Site") {
    throw new Error("Only Site cards can be in the Atlas");
  }
  if (section === "spellbook" && (card.type === "Avatar" || card.type === "Site")) {
    throw new Error("Avatar and Site cards cannot be in the Spellbook");
  }
  // Collection (sideboard) can hold any non-Avatar card
  if (section === "collection" && card.type === "Avatar") {
    throw new Error("Avatar cards cannot be in the Collection (sideboard)");
  }

  // Avatar: only 1
  if (section === "avatar") {
    const existing = deck.cards.find((c) => c.section === "avatar");
    if (existing) {
      // Replace existing avatar
      await prisma.deckCard.delete({ where: { id: existing.id } });
    }
  }

  // Section size limits
  const sectionCards = deck.cards.filter((c) => c.section === section);
  const sectionTotal = sectionCards.reduce((s, c) => s + c.quantity, 0);
  if (section === "atlas" && sectionTotal >= ATLAS_SIZE) {
    throw new Error(`Atlas is full (${ATLAS_SIZE} cards)`);
  }
  if (section === "spellbook" && sectionTotal >= SPELLBOOK_SIZE) {
    throw new Error(`Spellbook is full (${SPELLBOOK_SIZE} cards)`);
  }
  if (section === "collection" && sectionTotal >= COLLECTION_SIZE) {
    throw new Error(`Collection (sideboard) is full (${COLLECTION_SIZE} cards)`);
  }

  // Rarity limits
  const existing = deck.cards.find(
    (c) => c.cardId === cardId && c.section === section
  );
  const currentQty = existing?.quantity ?? 0;
  const rarity = card.rarity?.toLowerCase() ?? "ordinary";
  const maxCopies = RARITY_LIMITS[rarity] ?? 4;

  if (currentQty >= maxCopies) {
    throw new Error(
      `Max ${maxCopies} copies of ${card.rarity ?? "Ordinary"} cards`
    );
  }

  if (existing) {
    await prisma.deckCard.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + 1 },
    });
  } else {
    await prisma.deckCard.create({
      data: { deckId, cardId, section, quantity: 1 },
    });
  }

  revalidatePath(`/decks/${deckId}`);
  return { success: true };
}

export async function removeCardFromDeck(deckCardId: string) {
  const user = await requireUser();
  const dc = await prisma.deckCard.findUnique({
    where: { id: deckCardId },
    include: { deck: { select: { userId: true, id: true } } },
  });
  if (!dc || dc.deck.userId !== user.id) throw new Error("Not found");

  if (dc.quantity > 1) {
    await prisma.deckCard.update({
      where: { id: deckCardId },
      data: { quantity: dc.quantity - 1 },
    });
  } else {
    await prisma.deckCard.delete({ where: { id: deckCardId } });
  }

  revalidatePath(`/decks/${dc.deck.id}`);
  return { success: true };
}

export async function searchCardsForDeck(
  query: string,
  section: "avatar" | "atlas" | "spellbook" | "collection"
) {
  const typeFilter =
    section === "avatar"
      ? { type: "Avatar" }
      : section === "atlas"
        ? { type: "Site" }
        : section === "collection"
          ? { type: { not: "Avatar" } } // sideboard: any non-Avatar
          : { type: { notIn: ["Avatar", "Site"] } };

  const cards = await prisma.card.findMany({
    where: {
      ...typeFilter,
      name: { contains: query, mode: "insensitive" },
    },
    take: 20,
    orderBy: { name: "asc" },
    include: {
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
    cost: c.cost,
    attack: c.attack,
    defence: c.defence,
    life: c.life,
    elements: c.elements,
    slug: c.variants[0]?.slug ?? "",
  }));
}

// ── Batch operations ──

export interface BatchDeckItem {
  cardId: string;
  quantity: number;
  section?: "avatar" | "atlas" | "spellbook" | "collection"; // auto-detect if not provided
}

/** Add multiple cards to a deck in one batch */
export async function batchAddToDeck(deckId: string, items: BatchDeckItem[]) {
  if (items.length === 0) return { success: true, added: 0 };

  const user = await requireUser();
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: { include: { card: true } } },
  });
  if (!deck || deck.userId !== user.id) throw new Error("Not found");

  // Fetch all cards at once
  const cardIds = [...new Set(items.map((i) => i.cardId))];
  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
  });
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  // Build current deck state
  const deckState = new Map<string, { id: string; quantity: number; section: string }>();
  for (const dc of deck.cards) {
    deckState.set(`${dc.cardId}-${dc.section}`, {
      id: dc.id,
      quantity: dc.quantity,
      section: dc.section,
    });
  }

  // Track section totals
  const sectionTotals: Record<string, number> = {};
  for (const dc of deck.cards) {
    sectionTotals[dc.section] = (sectionTotals[dc.section] ?? 0) + dc.quantity;
  }

  let added = 0;
  const operations: Promise<unknown>[] = [];

  for (const item of items) {
    const card = cardMap.get(item.cardId);
    if (!card) continue;

    // Auto-detect section from card type if not provided
    const section = item.section ??
      (card.type === "Avatar" ? "avatar" :
       card.type === "Site" ? "atlas" : "spellbook");

    // Validate type/section match
    if (section === "avatar" && card.type !== "Avatar") continue;
    if (section === "atlas" && card.type !== "Site") continue;
    if (section === "spellbook" && (card.type === "Avatar" || card.type === "Site")) continue;
    if (section === "collection" && card.type === "Avatar") continue;

    // Section size check
    const currentTotal = sectionTotals[section] ?? 0;
    const maxSize = section === "atlas" ? ATLAS_SIZE
      : section === "spellbook" ? SPELLBOOK_SIZE
      : section === "collection" ? COLLECTION_SIZE
      : 1;

    const key = `${item.cardId}-${section}`;
    const existing = deckState.get(key);
    const currentQty = existing?.quantity ?? 0;

    // Rarity limit
    const rarity = card.rarity?.toLowerCase() ?? "ordinary";
    const maxCopies = RARITY_LIMITS[rarity] ?? 4;
    const canAdd = Math.min(
      item.quantity,
      maxCopies - currentQty,
      maxSize - currentTotal
    );
    if (canAdd <= 0) continue;

    // Avatar: replace
    if (section === "avatar") {
      const existingAvatar = deck.cards.find((c) => c.section === "avatar");
      if (existingAvatar && existingAvatar.cardId !== item.cardId) {
        operations.push(prisma.deckCard.delete({ where: { id: existingAvatar.id } }));
      }
      if (existing) {
        // Already this avatar, skip
        continue;
      }
      operations.push(prisma.deckCard.create({
        data: { deckId, cardId: item.cardId, section, quantity: 1 },
      }));
      added += 1;
      continue;
    }

    if (existing) {
      operations.push(
        prisma.deckCard.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + canAdd },
        })
      );
      existing.quantity += canAdd;
    } else {
      operations.push(
        prisma.deckCard.create({
          data: { deckId, cardId: item.cardId, section, quantity: canAdd },
        })
      );
      deckState.set(key, { id: "pending", quantity: canAdd, section });
    }
    sectionTotals[section] = currentTotal + canAdd;
    added += canAdd;
  }

  await Promise.all(operations);
  revalidatePath(`/decks/${deckId}`);
  return { success: true, added };
}
