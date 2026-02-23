import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllCards, getAllSets } from "@/lib/data";
import { CardBrowser, type CardOverlayEntry } from "@/components/card-browser";
import { SharingSettings } from "@/components/collection/sharing-settings";
import { CardBrowserSkeleton } from "@/components/skeletons";
import { CollectionStats } from "@/components/collection/collection-stats";
import { Button } from "@/components/ui/button";
import { Upload, Download, BarChart3 } from "lucide-react";
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

  const overlayEntries: CardOverlayEntry[] = collection.cards.map((cc) => {
    const marketPrice =
      cc.variant.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null;
    return {
      cardId: cc.cardId,
      quantity: cc.quantity,
      marketPrice,
      purchasePrice: cc.purchasePrice,
    };
  });

  const totalCards = overlayEntries.reduce((s, e) => s + e.quantity, 0);
  const totalMarketValue = overlayEntries.reduce(
    (s, e) => s + (e.marketPrice ?? 0) * e.quantity, 0
  );
  const totalCostBasis = overlayEntries.reduce(
    (s, e) => s + (e.purchasePrice ?? 0) * e.quantity, 0
  );

  // Get user's decks for the selection action bar
  const userDecks = await prisma.deck.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
  });

  const statsHeader = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif text-amber-100">
          My Collection
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/collection/stats">
            <Button variant="outline" size="sm" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stats</span>
            </Button>
          </Link>
          <Link href="/collection/import">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          </Link>
          <Link href="/collection/export">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </Link>
        </div>
      </div>
      <CollectionStats
        uniqueCards={overlayEntries.length}
        totalCards={totalCards}
        totalMarketValue={totalMarketValue}
        totalCostBasis={totalCostBasis}
      />
    </div>
  );

  return (
    <>
      <CardBrowser
        cards={cards}
        sets={sets as SetInfo[]}
        header={statsHeader}
        overlay={overlayEntries}
        showOwnedToggle
        defaultOwnedOnly
        selectable
        userDecks={userDecks}
        searchPlaceholder="Search collection..."
        context="collection"
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
