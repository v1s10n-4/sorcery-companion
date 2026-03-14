import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { preloadCatalog } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getCollectionForUser } from "@/lib/data-user";
import { CardCatalogBrowser } from "@/components/card-catalog-browser";
import type { CardOverlayEntry } from "@/components/card-browser";
import { SharingSettings } from "@/components/collection/sharing-settings";
import { CollectionStats } from "@/components/collection/collection-stats";
import { CollectionPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Upload, Download, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "My Collection — Sorcery Companion",
};

export default function CollectionPage() {
  preloadCatalog();

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <Suspense fallback={<CollectionPageSkeleton />}>
        <CollectionContent />
      </Suspense>
    </main>
  );
}

async function CollectionContent() {
  const user = await requireUser();

  // Get or create default collection
  let collectionData = await getCollectionForUser(user.id);

  if (!collectionData) {
    // First visit — create the collection (write stays outside the cached fn)
    const created = await prisma.collection.create({
      data: { name: "My Collection", userId: user.id },
      select: { id: true, isPublic: true, slug: true, description: true },
    });
    collectionData = {
      id: created.id,
      isPublic: created.isPublic,
      slug: created.slug,
      description: created.description,
      cards: [],
    };
  }

  const overlayEntries: CardOverlayEntry[] = collectionData.cards.map((cc) => ({
    cardId: cc.cardId,
    quantity: cc.quantity,
    marketPrice: cc.marketPrice,
    purchasePrice: cc.purchasePrice,
  }));

  const totalCards = overlayEntries.reduce((s, e) => s + e.quantity, 0);
  const totalMarketValue = overlayEntries.reduce(
    (s, e) => s + (e.marketPrice ?? 0) * e.quantity, 0
  );
  const totalCostBasis = overlayEntries.reduce(
    (s, e) => s + (e.purchasePrice ?? 0) * e.quantity, 0
  );

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
      <CardCatalogBrowser
        header={statsHeader}
        overlay={overlayEntries}
        showOwnedToggle
        defaultOwnedOnly
        searchPlaceholder="Search collection..."
      />
      <div className="mt-6">
        <SharingSettings
          collectionId={collectionData.id}
          isPublic={collectionData.isPublic}
          slug={collectionData.slug}
          description={collectionData.description}
        />
      </div>
    </>
  );
}
