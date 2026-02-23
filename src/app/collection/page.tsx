import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollectionView } from "@/components/collection/collection-view";
import { SharingSettings } from "@/components/collection/sharing-settings";

export const metadata: Metadata = {
  title: "My Collection — Sorcery Companion",
};

export default async function CollectionPage() {
  const user = await requireUser();

  // Get or create default collection
  let collection = await prisma.collection.findFirst({
    where: { userId: user.id },
    include: {
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

  if (!collection) {
    collection = await prisma.collection.create({
      data: {
        name: "My Collection",
        userId: user.id,
      },
      include: {
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
  }

  // Serialize for client
  const cards = collection.cards.map((cc) => {
    // Find matching TCGplayer product for this variant's finish
    const tcgProduct = cc.variant.tcgplayerProducts[0];
    const latestPrice = tcgProduct?.priceSnapshots[0];

    return {
      id: cc.id,
      cardId: cc.cardId,
      variantId: cc.variantId,
      cardName: cc.card.name,
      cardType: cc.card.type,
      elements: cc.card.elements,
      rarity: cc.card.rarity,
      variantSlug: cc.variant.slug,
      finish: cc.variant.finish,
      quantity: cc.quantity,
      condition: cc.condition,
      purchasePrice: cc.purchasePrice,
      purchasedAt: cc.purchasedAt?.toISOString() ?? null,
      marketPrice: latestPrice?.marketPrice ?? null,
      addedAt: cc.createdAt.toISOString(),
    };
  });

  // Stats
  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const totalMarketValue = cards.reduce(
    (sum, c) => sum + (c.marketPrice ?? 0) * c.quantity,
    0
  );
  const totalCostBasis = cards.reduce(
    (sum, c) => sum + (c.purchasePrice ?? 0) * c.quantity,
    0
  );

  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <CollectionView
        collectionId={collection.id}
        collectionName={collection.name}
        cards={cards}
        stats={{
          uniqueCards: cards.length,
          totalCards,
          totalMarketValue,
          totalCostBasis,
        }}
        isPremium={user.plan === "premium"}
      />
      <div className="mt-6">
        <SharingSettings
          collectionId={collection.id}
          isPublic={collection.isPublic}
          slug={collection.slug}
          description={collection.description}
        />
      </div>
    </main>
  );
}
