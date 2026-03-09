/**
 * Cached data-fetching functions using Next.js "use cache" directive.
 *
 * Strategy: tag-only invalidation — no time-based expiry.
 *   cacheLife("max")  → permanent cache (stale/revalidate/expire = Infinity)
 *   cacheTag(...)     → on-demand invalidation via revalidateTag()
 *
 * Tags in use:
 *   "cards"           → all card data (getAllCards, getCard, getAllCardIds, getSetCards)
 *   "card-{id}"       → individual card (getCard)
 *   "sets"            → all set data (getAllSets, getFullSets, getSetBySlug, getAllSetSlugs)
 *   "set-{slug}"      → individual set page data (getSetBySlug)
 *   "set-cards-{id}"  → cards within a set (getSetCards)
 *
 * To invalidate on data change:
 *   import { revalidateTag } from "next/cache";
 *   revalidateTag("cards");          // bust every card cache entry
 *   revalidateTag("card-abc123");    // bust one card detail page
 *   revalidateTag("sets");           // bust all set listing caches
 *   revalidateTag("set-beta");       // bust one set page
 */

import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";
import type { BrowserCard, SetInfo } from "./types";

// ── Home page data ──

export async function getAllCards(): Promise<BrowserCard[]> {
  "use cache";
  cacheLife("max");
  cacheTag("cards");

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
  cacheTag("sets");

  return prisma.set.findMany({
    orderBy: { releasedAt: "asc" },
    select: { name: true, slug: true, cardCount: true },
  });
}

// ── Card detail ──

/**
 * Returns all card IDs — used by generateStaticParams for /cards/[id].
 * Tagged with "cards" so a revalidateTag("cards") call will also trigger
 * a rebuild of this list on the next build/ISR cycle.
 */
export async function getAllCardIds(): Promise<{ id: string }[]> {
  "use cache";
  cacheLife("max");
  cacheTag("cards");

  return prisma.card.findMany({ select: { id: true } });
}

export async function getCard(id: string) {
  "use cache";
  cacheLife("max");
  cacheTag("cards", `card-${id}`);

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
  cacheTag("sets");

  return prisma.set.findMany({
    orderBy: { releasedAt: "asc" },
  });
}

export async function getSetBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("sets", `set-${slug}`);

  return prisma.set.findUnique({ where: { slug } });
}

export async function getSetCards(setId: string, page: number, pageSize: number) {
  "use cache";
  cacheLife("max");
  cacheTag("cards", `set-cards-${setId}`);

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
  cacheTag("sets");

  return prisma.set.findMany({ select: { slug: true } });
}
