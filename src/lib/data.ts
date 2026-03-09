/**
 * Cached data-fetching functions — Next.js "use cache" directive.
 *
 * Strategy: tag-only invalidation — no time-based expiry.
 *   cacheLife("max")  → permanent (stale/revalidate/expire = Infinity)
 *   cacheTag(...)     → on-demand invalidation via revalidateTag()
 *
 * Tag taxonomy:
 *   "catalog:cards"       → all card data (getAllCards, getCard, getAllCardIds, getSetCards, counts)
 *   "card:{id}"           → single card detail (getCard)
 *   "catalog:sets"        → all set data (getAllSets, getFullSets, getSetBySlug, getAllSetSlugs)
 *   "set:{slug}"          → single set page (getSetBySlug)
 *   "set-grid:{setId}"    → paginated cards in a set (getSetCards)
 *
 * To invalidate:
 *   import { revalidateTag } from "next/cache";
 *   revalidateTag("catalog:cards");   // bust every card cache
 *   revalidateTag("card:abc123");     // bust one card detail
 *   revalidateTag("catalog:sets");    // bust all set listings
 *   revalidateTag("set:beta");        // bust one set page
 *   revalidateTag("set-grid:xyz");    // bust card grid for one set
 */

import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";
import type { BrowserCard, SetInfo } from "./types";

// ── Home page / card browser ──

export async function getAllCards(): Promise<BrowserCard[]> {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:cards");

  const raw = await prisma.card.findMany({
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
      keywords: true,
      subTypes: true,
      thresholdAir: true,
      thresholdEarth: true,
      thresholdFire: true,
      thresholdWater: true,
      variants: {
        orderBy: { createdAt: "asc" },
        select: {
          slug: true,
          blurDataUrl: true,
          artist: true,
          tcgplayerProducts: {
            take: 1,
            select: {
              priceSnapshots: {
                orderBy: { recordedAt: "desc" },
                take: 2,
                select: { marketPrice: true },
              },
            },
          },
        },
      },
      sets: {
        select: { set: { select: { slug: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return raw.map((c) => ({
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
    keywords: c.keywords,
    subTypes: c.subTypes,
    thresholdAir: c.thresholdAir,
    thresholdEarth: c.thresholdEarth,
    thresholdFire: c.thresholdFire,
    thresholdWater: c.thresholdWater,
    artists: [...new Set(c.variants.map((v) => v.artist).filter((a): a is string => !!a))],
    variantSlug: c.variants[0]?.slug ?? null,
    blurDataUrl: c.variants[0]?.blurDataUrl ?? null,
    setSlugs: c.sets.map((cs) => cs.set.slug),
    marketPrice: c.variants[0]?.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null,
    previousPrice: c.variants[0]?.tcgplayerProducts[0]?.priceSnapshots[1]?.marketPrice ?? null,
  }));
}

export async function getAllSets(): Promise<SetInfo[]> {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:sets");

  return prisma.set.findMany({
    orderBy: { releasedAt: "asc" },
    select: { name: true, slug: true, cardCount: true },
  });
}

// ── Card detail ──

/** All card IDs — used by generateStaticParams for /cards/[id]. */
export async function getAllCardIds(): Promise<{ id: string }[]> {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:cards");

  return prisma.card.findMany({ select: { id: true } });
}

export async function getCard(id: string) {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:cards", `card:${id}`);

  return prisma.card.findUnique({
    where: { id },
    include: {
      sets: {
        include: {
          set: true,
          variants: {
            include: {
              tcgplayerProducts: {
                include: {
                  priceSnapshots: {
                    orderBy: { recordedAt: "desc" },
                    take: 90,
                  },
                },
              },
            },
          },
        },
        orderBy: { set: { releasedAt: "desc" } },
      },
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// ── Set pages ──

export async function getFullSets() {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:sets");

  return prisma.set.findMany({
    orderBy: { releasedAt: "asc" },
  });
}

export async function getSetBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:sets", `set:${slug}`);

  return prisma.set.findUnique({ where: { slug } });
}

export async function getSetCards(setId: string, page: number, pageSize: number) {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:cards", `set-grid:${setId}`);

  const where = { sets: { some: { setId } } };
  const [cards, totalCount] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        variants: {
          where: { set: { setId } },
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { slug: true, blurDataUrl: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.card.count({ where }),
  ]);
  return { cards, totalCount };
}

export async function getAllSetSlugs() {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:sets");

  return prisma.set.findMany({ select: { slug: true } });
}

// ── Preload ──

/**
 * Fire-and-forget: kick off catalog fetches early so child components
 * that call getAllCards() / getAllSets() resolve from the already-started
 * cache lookup instead of waiting sequentially.
 *
 * Call at the top of any page that renders CardCatalogBrowser or
 * DeckEditorWithCatalog.
 */
export function preloadCatalog() {
  void getAllCards();
  void getAllSets();
}

// ── Global counts (used by collection stats) ──

export async function getTotalCardCount() {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:cards");

  return prisma.card.count();
}

export async function getTotalVariantCount() {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:cards");

  return prisma.cardVariant.count();
}

export async function getSetCardCounts() {
  "use cache";
  cacheLife("max");
  cacheTag("catalog:cards", "catalog:sets");

  return prisma.cardSet.groupBy({
    by: ["setId"],
    _count: true,
  });
}
