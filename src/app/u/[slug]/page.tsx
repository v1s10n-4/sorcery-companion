import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PublicCollectionView } from "@/components/collection/public-collection-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: { user: { select: { name: true } } },
  });

  if (!collection || !collection.isPublic) {
    return { title: "Collection Not Found" };
  }

  return {
    title: `${collection.user.name}'s Collection — Sorcery Companion`,
    description: collection.description || `${collection.name} on Sorcery Companion`,
    openGraph: {
      title: `${collection.user.name}'s Sorcery Collection`,
      description: collection.description || `${collection.name} — Browse their cards on Sorcery Companion`,
    },
  };
}

export default async function PublicCollectionPage({ params }: PageProps) {
  const { slug } = await params;

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

  if (!collection || !collection.isPublic) notFound();

  const cards = collection.cards.map((cc) => {
    const tcgProduct = cc.variant.tcgplayerProducts[0];
    const latestPrice = tcgProduct?.priceSnapshots[0];

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
      marketPrice: latestPrice?.marketPrice ?? null,
    };
  });

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const totalValue = cards.reduce(
    (sum, c) => sum + (c.marketPrice ?? 0) * c.quantity,
    0
  );

  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <PublicCollectionView
        ownerName={collection.user.name ?? "User"}
        ownerAvatar={collection.user.avatarUrl}
        collectionName={collection.name}
        description={collection.description}
        cards={cards}
        totalCards={totalCards}
        totalValue={totalValue}
      />
    </main>
  );
}
