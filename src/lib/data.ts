/**
 * Cached data-fetching functions.
 * React cache() deduplicates calls within a single request,
 * so generateMetadata + page component share the same DB query.
 */

import { cache } from "react";
import { prisma } from "./prisma";
import type { BrowserCard, SetInfo } from "./types";

// ── Home page data ──

export const getAllCards = cache(async (): Promise<BrowserCard[]> => {
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
        select: { slug: true, blurDataUrl: true },
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
  }));
});

export const getAllSets = cache(async (): Promise<SetInfo[]> => {
  return prisma.set.findMany({
    orderBy: { releasedAt: "asc" },
    select: { name: true, slug: true, cardCount: true },
  });
});

// ── Card detail ──

export const getCard = cache(async (id: string) => {
  return prisma.card.findUnique({
    where: { id },
    include: {
      sets: {
        include: { set: true, variants: true },
        orderBy: { set: { releasedAt: "asc" } },
      },
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
});

// ── Set pages ──

export const getFullSets = cache(async () => {
  return prisma.set.findMany({
    orderBy: { releasedAt: "asc" },
  });
});

export const getSetBySlug = cache(async (slug: string) => {
  return prisma.set.findUnique({ where: { slug } });
});

export const getSetCards = cache(
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
  }
);

export const getAllSetSlugs = cache(async () => {
  return prisma.set.findMany({ select: { slug: true } });
});
