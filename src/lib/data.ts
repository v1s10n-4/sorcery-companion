/**
 * Cached data-fetching functions.
 *
 * Two layers of caching:
 * 1. React cache() — dedupes within a single request (e.g. metadata + page)
 * 2. unstable_cache() — Next.js Data Cache, persists across requests with revalidation
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import type { BrowserCard, SetInfo } from "./types";

// ── Home page data (cached 1h across requests) ──

const _getAllCards = unstable_cache(
  async (): Promise<BrowserCard[]> => {
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
          take: 1,
          orderBy: { createdAt: "asc" },
          select: {
            slug: true,
            blurDataUrl: true,
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
      variantSlug: c.variants[0]?.slug ?? null,
      blurDataUrl: c.variants[0]?.blurDataUrl ?? null,
      setSlugs: c.sets.map((cs) => cs.set.slug),
      marketPrice: c.variants[0]?.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null,
      previousPrice: c.variants[0]?.tcgplayerProducts[0]?.priceSnapshots[1]?.marketPrice ?? null,
    }));
  },
  ["all-cards"],
  { revalidate: 3600 } // 1 hour
);

// Wrap with React cache for request dedup
export const getAllCards = cache(() => _getAllCards());

const _getAllSets = unstable_cache(
  async (): Promise<SetInfo[]> => {
    return prisma.set.findMany({
      orderBy: { releasedAt: "asc" },
      select: { name: true, slug: true, cardCount: true },
    });
  },
  ["all-sets"],
  { revalidate: 3600 }
);

export const getAllSets = cache(() => _getAllSets());

// ── Card detail (cached 1h) ──

export const getCard = cache(async (id: string) => {
  return _getCard(id);
});

const _getCard = unstable_cache(
  async (id: string) => {
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
  },
  ["card-detail"],
  { revalidate: 3600 }
);

// ── Set pages (cached 1h) ──

export const getFullSets = cache(async () => {
  return _getFullSets();
});

const _getFullSets = unstable_cache(
  async () => {
    return prisma.set.findMany({
      orderBy: { releasedAt: "asc" },
    });
  },
  ["full-sets"],
  { revalidate: 3600 }
);

export const getSetBySlug = cache(async (slug: string) => {
  return _getSetBySlug(slug);
});

const _getSetBySlug = unstable_cache(
  async (slug: string) => {
    return prisma.set.findUnique({ where: { slug } });
  },
  ["set-by-slug"],
  { revalidate: 3600 }
);

export const getSetCards = cache(
  async (setId: string, page: number, pageSize: number) => {
    return _getSetCards(setId, page, pageSize);
  }
);

const _getSetCards = unstable_cache(
  async (setId: string, page: number, pageSize: number) => {
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
  },
  ["set-cards"],
  { revalidate: 3600 }
);

export const getAllSetSlugs = cache(async () => {
  return _getAllSetSlugs();
});

const _getAllSetSlugs = unstable_cache(
  async () => {
    return prisma.set.findMany({ select: { slug: true } });
  },
  ["all-set-slugs"],
  { revalidate: 3600 }
);
