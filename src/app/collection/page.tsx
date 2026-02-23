import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllCards, getAllSets } from "@/lib/data";
import { CollectionBrowser, type CollectionEntry } from "@/components/collection/collection-browser";
import { SharingSettings } from "@/components/collection/sharing-settings";
import { CardBrowserSkeleton } from "@/components/skeletons";
import type { SetInfo } from "@/lib/types";

export const metadata: Metadata = {
  title: "My Collection — Sorcery Companion",
};

export default async function CollectionPage() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <Suspense fallback={<CardBrowserSkeleton />}>
        <CollectionContent />
      </Suspense>
    </main>
  );
}

async function CollectionContent() {
  const [user, cards, sets] = await Promise.all([
    requireUser(),
    getAllCards(),
    getAllSets(),
  ]);

  // Get or create default collection
  let collection = await prisma.collection.findFirst({
    where: { userId: user.id },
    include: {
      cards: {
        include: {
          card: { select: { id: true } },
          variant: {
            select: {
              id: true,
              slug: true,
              finish: true,
              tcgplayerProducts: {
                select: {
                  priceSnapshots: {
                    orderBy: { recordedAt: "desc" as const },
                    take: 1,
                    select: { marketPrice: true },
                  },
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!collection) {
    collection = await prisma.collection.create({
      data: { name: "My Collection", userId: user.id },
      include: {
        cards: {
          include: {
            card: { select: { id: true } },
            variant: {
              select: {
                id: true,
                slug: true,
                finish: true,
                tcgplayerProducts: {
                  select: {
                    priceSnapshots: {
                      orderBy: { recordedAt: "desc" as const },
                      take: 1,
                      select: { marketPrice: true },
                    },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  const collectionEntries: CollectionEntry[] = collection.cards.map((cc) => {
    const marketPrice =
      cc.variant.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null;
    return {
      id: cc.id,
      variantId: cc.variantId,
      cardId: cc.cardId,
      quantity: cc.quantity,
      condition: cc.condition,
      purchasePrice: cc.purchasePrice,
      marketPrice,
      finish: cc.variant.finish,
      variantSlug: cc.variant.slug,
    };
  });

  const totalCards = collectionEntries.reduce((s, e) => s + e.quantity, 0);
  const totalMarketValue = collectionEntries.reduce(
    (s, e) => s + (e.marketPrice ?? 0) * e.quantity,
    0
  );
  const totalCostBasis = collectionEntries.reduce(
    (s, e) => s + (e.purchasePrice ?? 0) * e.quantity,
    0
  );

  return (
    <>
      <CollectionBrowser
        cards={cards}
        sets={sets as SetInfo[]}
        collectionEntries={collectionEntries}
        collectionId={collection.id}
        stats={{
          uniqueCards: collectionEntries.length,
          totalCards,
          totalMarketValue,
          totalCostBasis,
        }}
      />
      <div className="mt-6">
        <SharingSettings
          collectionId={collection.id}
          isPublic={collection.isPublic}
          slug={collection.slug}
          description={collection.description}
        />
      </div>
    </>
  );
}
