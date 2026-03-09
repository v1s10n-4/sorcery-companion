import { Suspense } from "react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireUser } from "@/lib/auth";
import { getCollectionStatsData } from "@/lib/data-user";
import { CollectionStatsSkeleton } from "@/components/skeletons";

const CollectionStatsView = dynamic(
  () =>
    import("@/components/collection/stats-view").then((m) => ({
      default: m.CollectionStatsView,
    })),
  { loading: () => <CollectionStatsSkeleton /> }
);

export const metadata: Metadata = {
  title: "Collection Stats — Sorcery Companion",
};

export default function CollectionStatsPage() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <Suspense fallback={<CollectionStatsSkeleton />}>
        <CollectionStatsContent />
      </Suspense>
    </main>
  );
}

async function CollectionStatsContent() {
  const user = await requireUser();
  const stats = await getCollectionStatsData(user.id);

  if (!stats) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No collection found. Add some cards first!
      </p>
    );
  }

  return (
    <CollectionStatsView
      completion={stats.completion}
      byType={stats.byType}
      byElement={stats.byElement}
      byRarity={stats.byRarity}
      byCost={stats.byCost}
      bySet={stats.bySet}
    />
  );
}
